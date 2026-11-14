import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { getPool, withTransaction } from './db.js';
import { getCurrentTerm } from './results.js';
import { asyncHandler } from './session.js';
import { audit, fail, staff, validate } from './students.js';

type AuditRow = Record<string, unknown>;

function describe(row: AuditRow): { title: string; owner: string } {
  const type = String(row.entity_type);
  const field = String(row.field_name);
  const newValue = row.new_value;
  const student = row.first_name ? `${row.first_name} ${row.last_name}` : `Student #${row.entity_id}`;

  if (type === 'student') {
    if (field === 'created') return { title: 'Student added', owner: student };
    if (field === 'access_code') return { title: 'Access code generated', owner: student };
    if (field === 'class_id') return { title: 'Student moved class', owner: student };
    if (field === 'active') return { title: newValue === false ? 'Student deactivated' : 'Student reactivated', owner: student };
    return { title: 'Student record updated', owner: student };
  }
  if (type === 'result_batch') {
    const owner = `${row.batch_class ?? 'Class'} · ${row.batch_term ?? ''}`.trim();
    if (field === 'uploaded') return { title: 'Results uploaded', owner };
    return { title: newValue === 'published' ? 'Results published' : 'Results unpublished', owner };
  }
  if (type === 'class') return { title: 'Class created', owner: String(row.class_name ?? '') };
  if (type === 'term') return { title: field === 'current' ? 'Current term changed' : 'Term created', owner: `${row.term_name ?? ''} ${row.term_session ?? ''}`.trim() };
  if (type === 'settings') return { title: 'School details updated', owner: 'School profile' };
  return { title: `${type} ${field}`, owner: '' };
}

export async function listAudit(limit: number, offset: number) {
  const result = await getPool().query(
    `SELECT a.id, a.entity_type, a.entity_id, a.field_name, a.new_value, a.created_at, a.actor_role,
            su.email AS actor_email,
            s.first_name, s.last_name,
            c.name AS class_name,
            bc.name AS batch_class, bt.name AS batch_term,
            t.name AS term_name, t.session AS term_session
     FROM audit_log a
     LEFT JOIN staff_users su ON su.id = a.actor_id
     LEFT JOIN students s ON a.entity_type = 'student' AND s.id = a.entity_id
     LEFT JOIN classes c ON a.entity_type = 'class' AND c.id = a.entity_id
     LEFT JOIN result_batches rb ON a.entity_type = 'result_batch' AND rb.id = a.entity_id
     LEFT JOIN classes bc ON bc.id = rb.class_id
     LEFT JOIN terms bt ON bt.id = rb.term_id
     LEFT JOIN terms t ON a.entity_type = 'term' AND t.id = a.entity_id
     ORDER BY a.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    ...describe(row),
    detail: row.actor_email ? String(row.actor_email) : 'System',
    at: new Date(row.created_at).toISOString(),
  }));
}

const termSchema = z.object({
  name: z.string().trim().min(2).max(100),
  session: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Use the format 2025/2026.'),
  nextTermBegins: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.').nullable().optional(),
  makeCurrent: z.boolean().default(false),
});

const settingsSchema = z.object({
  name: z.string().trim().max(150),
  email: z.string().trim().max(255).refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address.'),
  phone: z.string().trim().max(50),
});

const promoteSchema = z.object({
  fromClassId: z.number().int().positive(),
  toClassId: z.number().int().positive(),
  studentIds: z.array(z.number().int().positive()).max(1000).optional(),
});

const idParam = z.coerce.number().int().positive();

export function createExtrasRouter(): Router {
  const router = Router();
  const adminOnly = requireRole('superadmin');

  router.get(
    '/overview',
    adminOnly,
    asyncHandler(async (_req, res) => {
      const pool = getPool();
      const term = await getCurrentTerm();

      const counts = await pool.query(
        `SELECT (SELECT COUNT(*) FROM students)::int AS students,
                (SELECT COUNT(*) FROM students WHERE active)::int AS active_students,
                (SELECT COUNT(*) FROM classes)::int AS classes,
                (SELECT COUNT(*) FROM access_codes ac JOIN students s ON s.id = ac.student_id WHERE s.active)::int AS codes`,
      );

      let results = { draft: 0, published: 0, notUploaded: 0 };
      if (term) {
        const batches = await pool.query(
          `SELECT COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
                  COUNT(*) FILTER (WHERE status = 'published')::int AS published
           FROM result_batches WHERE term_id = $1`,
          [term.id],
        );
        const missing = await pool.query(
          `SELECT COUNT(*)::int AS n FROM classes c
           WHERE EXISTS (SELECT 1 FROM students s WHERE s.class_id = c.id AND s.active)
             AND NOT EXISTS (SELECT 1 FROM result_batches rb WHERE rb.class_id = c.id AND rb.term_id = $1)`,
          [term.id],
        );
        results = { draft: Number(batches.rows[0].draft), published: Number(batches.rows[0].published), notUploaded: Number(missing.rows[0].n) };
      }

      const row = counts.rows[0];
      res.json({
        counts: { students: Number(row.students), activeStudents: Number(row.active_students), classes: Number(row.classes), codesIssued: Number(row.codes) },
        term,
        results,
        recent: await listAudit(5, 0),
      });
    }),
  );

  router.get(
    '/audit',
    adminOnly,
    asyncHandler(async (req, res) => {
      const query = validate(z.object({ limit: z.coerce.number().int().min(1).max(200).default(50), offset: z.coerce.number().int().min(0).default(0) }), req.query, res);
      if (!query) return;
      res.json({ entries: await listAudit(query.limit, query.offset) });
    }),
  );

  /* ---- Terms ---- */

  router.get(
    '/terms',
    adminOnly,
    asyncHandler(async (_req, res) => {
      const result = await getPool().query('SELECT id, name, session, is_current, next_term_begins FROM terms ORDER BY session DESC, id DESC');
      res.json({
        terms: result.rows.map((row) => ({
          id: Number(row.id),
          name: String(row.name),
          session: String(row.session),
          isCurrent: Boolean(row.is_current),
          nextTermBegins: row.next_term_begins ? new Date(row.next_term_begins).toISOString().slice(0, 10) : null,
        })),
      });
    }),
  );

  router.post(
    '/terms',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(termSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      try {
        await withTransaction(async (client) => {
          if (body.makeCurrent) await client.query('UPDATE terms SET is_current = false WHERE is_current');
          const inserted = await client.query(
            'INSERT INTO terms (name, session, next_term_begins, is_current) VALUES ($1, $2, $3, $4) RETURNING id',
            [body.name, body.session, body.nextTermBegins ?? null, body.makeCurrent],
          );
          await audit(client, actor, 'term', Number(inserted.rows[0].id), body.makeCurrent ? 'current' : 'created', null, { name: body.name, session: body.session });
        });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') return fail(res, 409, 'That term already exists for this session.');
        throw error;
      }
      res.status(201).json({ ok: true });
    }),
  );

  router.post(
    '/terms/:id/current',
    adminOnly,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;
      const actor = staff(req);

      const found = await withTransaction(async (client) => {
        const exists = await client.query('SELECT id FROM terms WHERE id = $1 FOR UPDATE', [id]);
        if (!exists.rows[0]) return false;
        await client.query('UPDATE terms SET is_current = false WHERE is_current AND id <> $1', [id]);
        await client.query('UPDATE terms SET is_current = true WHERE id = $1', [id]);
        await audit(client, actor, 'term', id, 'current', null, true);
        return true;
      });

      if (!found) return fail(res, 404, 'Term not found.');
      res.json({ ok: true });
    }),
  );

  /* ---- School profile ---- */

  router.get(
    '/settings',
    adminOnly,
    asyncHandler(async (_req, res) => {
      const result = await getPool().query('SELECT name, email, phone FROM school_settings WHERE id = 1');
      res.json({ settings: { name: String(result.rows[0]?.name ?? ''), email: String(result.rows[0]?.email ?? ''), phone: String(result.rows[0]?.phone ?? '') } });
    }),
  );

  router.put(
    '/settings',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(settingsSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO school_settings (id, name, email, phone) VALUES (1, $1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone, updated_at = NOW()`,
          [body.name, body.email, body.phone],
        );
        await audit(client, actor, 'settings', 1, 'updated', null, null);
      });
      res.json({ ok: true });
    }),
  );

  /* ---- Classes and promotion ---- */

  router.post(
    '/classes',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(z.object({ name: z.string().trim().min(1, 'Enter a class name.').max(100) }), req.body, res);
      if (!body) return;
      const actor = staff(req);

      try {
        const id = await withTransaction(async (client) => {
          const inserted = await client.query('INSERT INTO classes (name) VALUES ($1) RETURNING id', [body.name]);
          const classId = Number(inserted.rows[0].id);
          await audit(client, actor, 'class', classId, 'created', null, { name: body.name });
          return classId;
        });
        res.status(201).json({ class: { id, name: body.name } });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') return fail(res, 409, 'A class with that name already exists.');
        throw error;
      }
    }),
  );

  router.post(
    '/students/promote',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(promoteSchema, req.body, res);
      if (!body) return;
      if (body.fromClassId === body.toClassId) return fail(res, 400, 'Choose a different class to move students into.');
      const actor = staff(req);

      const moved = await withTransaction(async (client) => {
        const target = await client.query('SELECT id FROM classes WHERE id = $1', [body.toClassId]);
        if (!target.rows[0]) return null;

        const students = await client.query(
          `SELECT id FROM students
           WHERE class_id = $1 AND active = true AND ($2::int[] IS NULL OR id = ANY($2))
           FOR UPDATE`,
          [body.fromClassId, body.studentIds ?? null],
        );
        const ids = students.rows.map((row) => Number(row.id));
        if (ids.length === 0) return 0;

        await client.query('UPDATE students SET class_id = $2, updated_at = NOW() WHERE id = ANY($1::int[])', [ids, body.toClassId]);
        for (const id of ids) await audit(client, actor, 'student', id, 'class_id', body.fromClassId, body.toClassId);
        return ids.length;
      });

      if (moved === null) return fail(res, 400, 'Choose a valid class to move students into.');
      res.json({ moved });
    }),
  );

  return router;
}
