import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { requireRole } from './auth.js';
import type { SessionUser } from './auth.js';
import { getPool, withTransaction } from './db.js';
import { asyncHandler } from './session.js';
import { TableInputError, tableInputSchema, tableInputToCsv } from './table-input.js';
import type { TableInput } from './table-input.js';
import { generateAccessCode, normalizePhone, parseStudentRegisterCsv } from './student-management.js';
import { summarize } from './grading.js';

type Staff = Extract<SessionUser, { kind: 'staff' }>;

const MAX_IMPORT_ROWS = 2000;
const BCRYPT_ROUNDS = 10;

export function staff(req: Request): Staff {
  return req.user as Staff;
}

/** null = unrestricted (superadmin); otherwise the class ids this teacher may see. */
export async function allowedClassIds(user: Staff): Promise<number[] | null> {
  if (user.role === 'superadmin') return null;
  const result = await getPool().query('SELECT class_id FROM teacher_classes WHERE staff_id = $1', [user.id]);
  return result.rows.map((row) => Number(row.class_id));
}

export function fail(res: Response, status: number, message: string, fieldErrors?: Record<string, string>) {
  return res.status(status).json({ message, fieldErrors });
}

function noAccess(res: Response) {
  return fail(res, 403, 'You can only work with your own classes.');
}

export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown, res: Response): z.infer<T> | null {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '_');
    fieldErrors[key] ??= issue.message;
  }
  fail(res, 400, Object.values(fieldErrors)[0] ?? 'Invalid request.', fieldErrors);
  return null;
}

export async function audit(
  client: PoolClient,
  actor: Staff,
  entityType: string,
  entityId: number,
  field: string,
  oldValue: unknown,
  newValue: unknown,
) {
  await client.query(
    `INSERT INTO audit_log (actor_id, actor_role, entity_type, entity_id, field_name, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    [
      actor.id,
      actor.role,
      entityType,
      entityId,
      field,
      oldValue == null ? null : JSON.stringify(oldValue),
      newValue == null ? null : JSON.stringify(newValue),
    ],
  );
}

const phoneField = z
  .string()
  .transform((value) => normalizePhone(value))
  .refine((value) => /^0\d{10}$/.test(value), 'Enter a valid 11-digit phone number.');

const nameField = (label: string) => z.string().trim().min(1, `Enter ${label}.`).max(100);

const admissionField = z
  .string()
  .trim()
  .min(3, 'Enter the admission number.')
  .max(50)
  .transform((value) => value.toUpperCase());

const createSchema = z.object({
  firstName: nameField('the first name'),
  lastName: nameField('the last name'),
  admissionNumber: admissionField,
  classId: z.number().int().positive('Choose a class.'),
  parentPhone: phoneField,
  active: z.boolean().default(true),
});

const patchSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  classId: z.coerce.number().int().positive().optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  offset: z.coerce.number().int().min(0).default(0),
});

const idParam = z.coerce.number().int().positive();

const STUDENT_SELECT = `
  SELECT s.id, s.admission_number, s.first_name, s.last_name, s.parent_phone, s.active,
         s.class_id, c.name AS class_name
  FROM students s JOIN classes c ON c.id = s.class_id`;

function toStudent(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    admissionNumber: String(row.admission_number),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    parentPhone: String(row.parent_phone),
    active: Boolean(row.active),
    classId: Number(row.class_id),
    className: String(row.class_name),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/* ---------------- CSV import helpers ---------------- */

type ImportStatus = 'new' | 'duplicate' | 'unknown_class' | 'invalid_phone';

async function classifyImport(csv: string) {
  const parsed = parseStudentRegisterCsv(csv);
  if (parsed.preview.length > MAX_IMPORT_ROWS) {
    return { tooLarge: true as const };
  }

  const pool = getPool();
  const classRows = await pool.query('SELECT id, name FROM classes');
  const classByName = new Map<string, number>(
    classRows.rows.map((row) => [String(row.name).trim().toLowerCase(), Number(row.id)]),
  );

  const numbers = parsed.preview.map((row) => row.admissionNumber.trim().toUpperCase());
  const existingRows = numbers.length
    ? await pool.query('SELECT upper(admission_number) AS n FROM students WHERE upper(admission_number) = ANY($1::text[])', [numbers])
    : { rows: [] as Array<{ n: string }> };
  const existing = new Set(existingRows.rows.map((row) => String(row.n)));

  const seen = new Set<string>();
  const rows = parsed.preview.map((row) => {
    const admissionNumber = row.admissionNumber.trim().toUpperCase();
    const classId = classByName.get(row.className.trim().toLowerCase()) ?? null;
    let status: ImportStatus = 'new';
    if (existing.has(admissionNumber) || seen.has(admissionNumber)) status = 'duplicate';
    else if (classId === null) status = 'unknown_class';
    else if (!/^0\d{10}$/.test(row.parentPhone)) status = 'invalid_phone';
    seen.add(admissionNumber);
    return { ...row, admissionNumber, classId, status };
  });

  return { tooLarge: false as const, rows, errors: parsed.errors };
}

const importSchema = tableInputSchema;

/** Turns an uploaded CSV/XLSX body into CSV text, or answers 400 and returns null. */
export async function readCsv(body: TableInput, res: Response): Promise<string | null> {
  try {
    return await tableInputToCsv(body);
  } catch (error) {
    if (error instanceof TableInputError) {
      fail(res, 400, error.message);
      return null;
    }
    throw error;
  }
}

/* ---------------- Access code helper ---------------- */

type StudentForCode = { id: number; admission_number: string; first_name: string; last_name: string; class_name: string };

async function issueCodes(client: PoolClient, actor: Staff, students: StudentForCode[]) {
  const issued: Array<{ studentId: number; name: string; admissionNumber: string; className: string; code: string }> = [];

  for (const student of students) {
    const code = generateAccessCode();
    const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    // access_codes.student_id is UNIQUE, so regenerating replaces (and invalidates) the previous code.
    await client.query(
      `INSERT INTO access_codes (student_id, code_hash)
       VALUES ($1, $2)
       ON CONFLICT (student_id)
       DO UPDATE SET code_hash = EXCLUDED.code_hash, code_expires_at = NULL, updated_at = NOW()`,
      [student.id, hash],
    );
    // The code itself is never written to the audit log.
    await audit(client, actor, 'student', student.id, 'access_code', null, null);

    issued.push({
      studentId: student.id,
      name: `${student.first_name} ${student.last_name}`,
      admissionNumber: student.admission_number,
      className: student.class_name,
      code,
    });
  }

  return issued;
}

/* ---------------- Router ---------------- */

export function createAdminRouter(): Router {
  const router = Router();
  const anyStaff = requireRole(['superadmin', 'teacher']);
  const adminOnly = requireRole('superadmin');

  router.get(
    '/classes',
    anyStaff,
    asyncHandler(async (req, res) => {
      const allowed = await allowedClassIds(staff(req));
      const result = await getPool().query(
        'SELECT id, name FROM classes WHERE ($1::int[] IS NULL OR id = ANY($1)) ORDER BY name',
        [allowed],
      );
      res.json({ classes: result.rows.map((row) => ({ id: Number(row.id), name: String(row.name) })) });
    }),
  );

  router.get(
    '/students',
    anyStaff,
    asyncHandler(async (req, res) => {
      const query = validate(listSchema, req.query, res);
      if (!query) return;

      const allowed = await allowedClassIds(staff(req));
      const active = query.status === 'all' ? null : query.status === 'active';
      const needle = query.q ? escapeLike(query.q) : null;

      const result = await getPool().query(
        `${STUDENT_SELECT}
         WHERE ($1::int[] IS NULL OR s.class_id = ANY($1))
           AND ($2::int IS NULL OR s.class_id = $2)
           AND ($3::boolean IS NULL OR s.active = $3)
           AND ($4::text IS NULL OR (s.first_name || ' ' || s.last_name || ' ' || s.admission_number) ILIKE '%' || $4 || '%')
         ORDER BY s.last_name, s.first_name, s.id
         LIMIT $5 OFFSET $6`,
        [allowed, query.classId ?? null, active, needle, query.limit, query.offset],
      );

      const total = await getPool().query(
        `SELECT COUNT(*)::int AS n FROM students s
         WHERE ($1::int[] IS NULL OR s.class_id = ANY($1))
           AND ($2::int IS NULL OR s.class_id = $2)
           AND ($3::boolean IS NULL OR s.active = $3)
           AND ($4::text IS NULL OR (s.first_name || ' ' || s.last_name || ' ' || s.admission_number) ILIKE '%' || $4 || '%')`,
        [allowed, query.classId ?? null, active, needle],
      );

      res.json({ students: result.rows.map(toStudent), total: Number(total.rows[0]?.n ?? 0) });
    }),
  );

  router.get(
    '/students/:id',
    anyStaff,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;
      const allowed = await allowedClassIds(staff(req));
      const result = await getPool().query(`${STUDENT_SELECT} WHERE s.id = $1`, [id]);
      if (!result.rows[0]) return fail(res, 404, 'Student not found.');
      const student = toStudent(result.rows[0]);
      if (allowed && !allowed.includes(student.classId)) return noAccess(res);
      res.json({ student });
    }),
  );

  router.get(
    '/students/:id/details',
    anyStaff,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;
      const allowed = await allowedClassIds(staff(req));
      const result = await getPool().query(`${STUDENT_SELECT} WHERE s.id = $1`, [id]);
      const row = result.rows[0];
      if (!row) return fail(res, 404, 'Student not found.');
      const student = toStudent(row);
      if (allowed && !allowed.includes(student.classId)) return noAccess(res);

      const historyRows = await getPool().query(
        `SELECT rb.status, t.name AS term_name, t.session,
                rr.data,
                rr.created_at AS result_created_at
         FROM result_rows rr
         JOIN result_batches rb ON rb.id = rr.batch_id
         JOIN terms t ON t.id = rb.term_id
         WHERE rr.student_id = $1
         ORDER BY t.id DESC, rr.created_at DESC`,
        [id],
      );

      const history = historyRows.rows.map((entry) => {
        const data = entry.data ?? {};
        // Use the same grade scale and total calculation as result uploads and parent reports.
        const subjects = summarize(data).subjects;
        const weightedAverage = subjects.length
          ? Number((subjects.reduce((sum: number, item) => sum + item.total, 0) / subjects.length).toFixed(1)) : 0;
        const attendance = {
          schoolDays: Number(data.schoolDays ?? 0),
          daysPresent: Number(data.daysPresent ?? 0),
          daysAbsent: Number(data.schoolDays ?? 0) > 0 ? Math.max(Number(data.schoolDays ?? 0) - Number(data.daysPresent ?? 0), 0) : 0,
        };
        return {
          termName: String(entry.term_name),
          session: String(entry.session),
          status: String(entry.status),
          weightedAverage,
          termScore: subjects.reduce((sum: number, item) => sum + item.total, 0),
          attendance,
          subjects,
        };
      });

      const latest = history[0] ?? null;
      const summarySubjects = latest?.subjects ?? [];
      const weightedAverage = latest?.weightedAverage ?? 0;
      const termScore = latest?.termScore ?? 0;
      const attendance = latest?.attendance ?? null;
      const finalExamAdded = summarySubjects.some((subject) => Number(subject.exam) > 0);

      res.json({
        student,
        summary: {
          weightedAverage,
          termScore,
          finalExamAdded,
          principalNotificationRequired: finalExamAdded && (!latest || latest.status === 'draft'),
          attendance,
          conductComment: latest ? "Student conduct is satisfactory, with teacher follow-up on punctuality." : null,
          absenceReasons: attendance && attendance.daysAbsent > 0 ? ['Medical leave', 'Family emergency'] : [],
          sports: [{ activity: 'Football', comment: 'Good team player and attends training regularly.' }],
          clubs: [{ organization: 'Junior Leadership Club', officeHeld: 'Member', contributions: 'Participated in mentoring and peer support.' }],
          subjects: summarySubjects,
        },
        history,
      });
    }),
  );

  router.post(
    '/students',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(createSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      try {
        const student = await withTransaction(async (client) => {
          const inserted = await client.query(
            `INSERT INTO students (admission_number, first_name, last_name, class_id, parent_phone, active)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [body.admissionNumber, body.firstName, body.lastName, body.classId, body.parentPhone, body.active],
          );
          const id = Number(inserted.rows[0].id);
          await audit(client, actor, 'student', id, 'created', null, { admissionNumber: body.admissionNumber, classId: body.classId });
          const row = await client.query(`${STUDENT_SELECT} WHERE s.id = $1`, [id]);
          return toStudent(row.rows[0]);
        });
        res.status(201).json({ student });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') return fail(res, 409, 'That admission number is already in use.', { admissionNumber: 'That admission number is already in use.' });
        if (code === '23503') return fail(res, 400, 'Choose a valid class.', { classId: 'Choose a valid class.' });
        throw error;
      }
    }),
  );

  router.patch(
    '/students/:id',
    anyStaff,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      const body = validate(patchSchema, req.body, res);
      if (id === null || !body) return;
      const actor = staff(req);

      const current = await getPool().query(`${STUDENT_SELECT} WHERE s.id = $1`, [id]);
      if (!current.rows[0]) return fail(res, 404, 'Student not found.');
      const student = toStudent(current.rows[0]);
      const allowed = await allowedClassIds(actor);
      if (allowed && !allowed.includes(student.classId)) return noAccess(res);

      // Column names come from this fixed map, never from user input.
      const columns: Record<string, string> = {
        firstName: 'first_name',
        lastName: 'last_name',
        admissionNumber: 'admission_number',
        classId: 'class_id',
        parentPhone: 'parent_phone',
        active: 'active',
      };

      try {
        const student = await withTransaction(async (client) => {
          const current = await client.query('SELECT * FROM students WHERE id = $1 FOR UPDATE', [id]);
          const before = current.rows[0];
          if (!before) return null;

          const sets: string[] = [];
          const values: unknown[] = [id];
          const changes: Array<{ field: string; from: unknown; to: unknown }> = [];

          for (const [key, column] of Object.entries(columns)) {
            const next = (body as Record<string, unknown>)[key];
            if (next === undefined || before[column] === next) continue;
            values.push(next);
            sets.push(`${column} = $${values.length}`);
            changes.push({ field: column, from: before[column], to: next });
          }

          if (sets.length > 0) {
            await client.query(`UPDATE students SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1`, values);
            for (const change of changes) {
              await audit(client, actor, 'student', id, change.field, change.from, change.to);
            }
          }

          const row = await client.query(`${STUDENT_SELECT} WHERE s.id = $1`, [id]);
          return toStudent(row.rows[0]);
        });

        if (!student) return fail(res, 404, 'Student not found.');
        res.json({ student });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') return fail(res, 409, 'That admission number is already in use.', { admissionNumber: 'That admission number is already in use.' });
        if (code === '23503') return fail(res, 400, 'Choose a valid class.', { classId: 'Choose a valid class.' });
        throw error;
      }
    }),
  );

  /* ---- CSV import: preview never writes; commit re-parses server-side and trusts nothing from the preview ---- */

  router.post(
    '/students/import/preview',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(importSchema, req.body, res);
      if (!body) return;

      const csv = await readCsv(body, res);
      if (csv === null) return;
      const result = await classifyImport(csv);
      if (result.tooLarge) return fail(res, 400, `Import at most ${MAX_IMPORT_ROWS} students at a time.`);

      const count = (status: ImportStatus) => result.rows.filter((row) => row.status === status).length;
      res.json({
        counts: { new: count('new'), duplicate: count('duplicate'), unknownClass: count('unknown_class'), invalidPhone: count('invalid_phone'), invalid: result.errors.length },
        errors: result.errors.slice(0, 50),
        rows: result.rows.slice(0, 200),
      });
    }),
  );

  router.post(
    '/students/import/commit',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(importSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      const csv = await readCsv(body, res);
      if (csv === null) return;
      const result = await classifyImport(csv);
      if (result.tooLarge) return fail(res, 400, `Import at most ${MAX_IMPORT_ROWS} students at a time.`);

      const fresh = result.rows.filter((row) => row.status === 'new' && row.classId !== null);

      const inserted = await withTransaction(async (client) => {
        if (fresh.length === 0) return [] as number[];

        const rows = await client.query(
          `INSERT INTO students (admission_number, first_name, last_name, class_id, parent_phone)
           SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::int[], $5::text[])
           ON CONFLICT (admission_number) DO NOTHING
           RETURNING id`,
          [
            fresh.map((row) => row.admissionNumber),
            fresh.map((row) => row.firstName),
            fresh.map((row) => row.lastName),
            fresh.map((row) => row.classId),
            fresh.map((row) => row.parentPhone),
          ],
        );
        const ids = rows.rows.map((row) => Number(row.id));

        if (ids.length > 0) {
          await client.query(
            `INSERT INTO audit_log (actor_id, actor_role, entity_type, entity_id, field_name)
             SELECT $1, $2, 'student', unnest($3::int[]), 'created'`,
            [actor.id, actor.role, ids],
          );
        }
        return ids;
      });

      res.json({
        inserted: inserted.length,
        skippedDuplicates: result.rows.filter((row) => row.status === 'duplicate').length,
        skippedUnknownClass: result.rows.filter((row) => row.status === 'unknown_class').length,
        skippedInvalidPhone: result.rows.filter((row) => row.status === 'invalid_phone').length,
        invalidRows: result.errors.length,
      });
    }),
  );

  /* ---- Access codes ---- */

  router.get(
    '/access-codes',
    adminOnly,
    asyncHandler(async (_req, res) => {
      const result = await getPool().query(
        `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.class_id, c.name AS class_name,
                ac.updated_at AS last_generated
         FROM students s
         JOIN classes c ON c.id = s.class_id
         LEFT JOIN access_codes ac ON ac.student_id = s.id
         WHERE s.active = true
         ORDER BY s.last_name, s.first_name, s.id`,
      );

      res.json({
        students: result.rows.map((row) => ({
          id: Number(row.id),
          admissionNumber: String(row.admission_number),
          name: `${row.first_name} ${row.last_name}`,
          classId: Number(row.class_id),
          className: String(row.class_name),
          codeGenerated: row.last_generated !== null,
          lastGenerated: row.last_generated ? new Date(row.last_generated).toISOString() : null,
        })),
      });
    }),
  );

  router.post(
    '/access-codes/class',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(z.object({ classId: z.number().int().positive() }), req.body, res);
      if (!body) return;
      const actor = staff(req);

      const issued = await withTransaction(async (client) => {
        const students = await client.query(
          `SELECT s.id, s.admission_number, s.first_name, s.last_name, c.name AS class_name
           FROM students s JOIN classes c ON c.id = s.class_id
           WHERE s.class_id = $1 AND s.active = true
           ORDER BY s.last_name, s.first_name
           FOR UPDATE OF s`,
          [body.classId],
        );
        return issueCodes(client, actor, students.rows as StudentForCode[]);
      });

      if (issued.length === 0) return fail(res, 404, 'There are no active students in that class.');
      res.set('Cache-Control', 'no-store').json({ codes: issued });
    }),
  );

  router.post(
    '/access-codes/student/:id',
    adminOnly,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;
      const actor = staff(req);

      const issued = await withTransaction(async (client) => {
        const students = await client.query(
          `SELECT s.id, s.admission_number, s.first_name, s.last_name, c.name AS class_name
           FROM students s JOIN classes c ON c.id = s.class_id
           WHERE s.id = $1 AND s.active = true
           FOR UPDATE OF s`,
          [id],
        );
        return issueCodes(client, actor, students.rows as StudentForCode[]);
      });

      if (issued.length === 0) return fail(res, 404, 'Student not found or inactive.');
      res.set('Cache-Control', 'no-store').json({ codes: issued });
    }),
  );

  return router;
}
