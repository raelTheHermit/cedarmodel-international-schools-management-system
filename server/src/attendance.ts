import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { getPool, withTransaction } from './db.js';
import { asyncHandler } from './session.js';
import { allowedClassIds, audit, fail, staff, validate } from './students.js';
import { getCurrentTerm } from './term-data.js';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.').refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Choose a valid date.');

const statusField = z.enum(['present', 'absent', 'late']);

const saveSchema = z.object({
  classId: z.number().int().positive(),
  date: dateField,
  entries: z.array(z.object({ studentId: z.number().int().positive(), status: statusField })).min(1).max(500),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const TEACHER_BACKFILL_DAYS = 14;

export function createAttendanceRouter(): Router {
  const router = Router();
  const anyStaff = requireRole(['superadmin', 'teacher']);

  router.get(
    '/attendance',
    anyStaff,
    asyncHandler(async (req, res) => {
      const query = validate(z.object({ classId: z.coerce.number().int().positive(), date: dateField }), req.query, res);
      if (!query) return;

      const allowed = await allowedClassIds(staff(req));
      if (allowed && !allowed.includes(query.classId)) return fail(res, 403, 'You can only take attendance for your own classes.');

      const result = await getPool().query(
        `SELECT s.id, s.first_name, s.last_name, s.admission_number, ar.status
         FROM students s
         LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.attendance_date = $2
         WHERE s.class_id = $1 AND s.active = true
         ORDER BY s.last_name, s.first_name, s.id`,
        [query.classId, query.date],
      );

      res.json({
        date: query.date,
        saved: result.rows.some((row) => row.status !== null),
        students: result.rows.map((row) => ({
          id: Number(row.id),
          name: `${row.first_name} ${row.last_name}`,
          admissionNumber: String(row.admission_number),
          status: row.status ? String(row.status) : null,
        })),
      });
    }),
  );

  router.put(
    '/attendance',
    anyStaff,
    asyncHandler(async (req, res) => {
      const body = validate(saveSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      const allowed = await allowedClassIds(actor);
      if (allowed && !allowed.includes(body.classId)) return fail(res, 403, 'You can only take attendance for your own classes.');

      const term = await getCurrentTerm();
      if (!term) return fail(res, 409, 'An administrator must set the current term before attendance can be taken.');

      // "Tomorrow" is allowed so a server in UTC does not reject a Lagos morning.
      const when = new Date(`${body.date}T00:00:00Z`).getTime();
      const today = Date.now();
      if (when > today + DAY_MS) return fail(res, 400, 'You can’t take attendance for a future date.');
      if (actor.role === 'teacher' && when < today - TEACHER_BACKFILL_DAYS * DAY_MS) {
        return fail(res, 403, `Teachers can only edit attendance from the last ${TEACHER_BACKFILL_DAYS} days. Ask an administrator.`);
      }

      const students = await getPool().query('SELECT id FROM students WHERE class_id = $1 AND active = true', [body.classId]);
      const expected = new Set<number>(students.rows.map((row) => Number(row.id)));
      const given = new Set(body.entries.map((entry) => entry.studentId));
      if (given.size !== body.entries.length || given.size !== expected.size || [...given].some((id) => !expected.has(id))) {
        return fail(res, 400, 'The register must include every active student in the class exactly once. Reload the page and try again.');
      }

      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO attendance_records (student_id, term_id, attendance_date, status, recorded_by)
           SELECT x.student_id, $1, $2::date, x.status, $3
           FROM unnest($4::int[], $5::text[]) AS x(student_id, status)
           ON CONFLICT (student_id, attendance_date)
           DO UPDATE SET status = EXCLUDED.status, term_id = EXCLUDED.term_id, recorded_by = EXCLUDED.recorded_by, updated_at = NOW()`,
          [term.id, body.date, actor.id, body.entries.map((entry) => entry.studentId), body.entries.map((entry) => entry.status)],
        );
        await audit(client, actor, 'class', body.classId, 'attendance', null, {
          date: body.date,
          absent: body.entries.filter((entry) => entry.status === 'absent').length,
        });
      });

      res.json({ ok: true, saved: body.entries.length });
    }),
  );

  return router;
}
