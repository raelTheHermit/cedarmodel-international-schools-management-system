import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { getPool, withTransaction } from './db.js';
import { asyncHandler } from './session.js';
import { audit, fail, staff, validate } from './students.js';

const BCRYPT_ROUNDS = 12;

// bcrypt silently ignores everything past 72 bytes, so cap there instead of pretending longer passwords help.
const passwordField = z.string().min(10, 'Use at least 10 characters.').max(72, 'Use at most 72 characters.');
const roleField = z.enum(['superadmin', 'teacher']);
const classIds = z.array(z.number().int().positive()).max(50);
const idParam = z.coerce.number().int().positive();

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(255),
  password: passwordField,
  role: roleField,
  classIds: classIds.default([]),
});

const patchSchema = z
  .object({ active: z.boolean(), role: roleField, classIds })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

async function setClasses(client: PoolClient, staffId: number, ids: number[]) {
  await client.query('DELETE FROM teacher_classes WHERE staff_id = $1', [staffId]);
  if (ids.length > 0) {
    await client.query(
      'INSERT INTO teacher_classes (staff_id, class_id) SELECT $1, unnest($2::int[])',
      [staffId, [...new Set(ids)]],
    );
  }
}

export function createStaffRouter(): Router {
  const router = Router();
  const adminOnly = requireRole('superadmin');

  router.get(
    '/staff',
    adminOnly,
    asyncHandler(async (_req, res) => {
      const result = await getPool().query(
        `SELECT u.id, u.email, u.role, u.active,
                COALESCE(array_agg(tc.class_id) FILTER (WHERE tc.class_id IS NOT NULL), '{}') AS class_ids
         FROM staff_users u
         LEFT JOIN teacher_classes tc ON tc.staff_id = u.id
         GROUP BY u.id
         ORDER BY u.active DESC, u.email`,
      );
      res.json({
        staff: result.rows.map((row) => ({
          id: Number(row.id),
          email: String(row.email),
          role: String(row.role),
          active: Boolean(row.active),
          classIds: (row.class_ids as Array<number | string>).map(Number),
        })),
      });
    }),
  );

  router.post(
    '/staff',
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = validate(createSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);
      const hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

      try {
        const id = await withTransaction(async (client) => {
          const inserted = await client.query(
            'INSERT INTO staff_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
            [body.email, hash, body.role],
          );
          const staffId = Number(inserted.rows[0].id);
          if (body.role === 'teacher') await setClasses(client, staffId, body.classIds);
          await audit(client, actor, 'staff', staffId, 'created', null, { role: body.role });
          return staffId;
        });
        res.status(201).json({ id });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === '23505') return fail(res, 409, 'A staff account with that email already exists.', { email: 'A staff account with that email already exists.' });
        if (code === '23503') return fail(res, 400, 'One of the selected classes no longer exists.');
        throw error;
      }
    }),
  );

  router.patch(
    '/staff/:id',
    adminOnly,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      const body = validate(patchSchema, req.body, res);
      if (id === null || !body) return;
      const actor = staff(req);

      const outcome = await withTransaction(async (client) => {
        const locked = await client.query('SELECT id, role, active FROM staff_users WHERE id = $1 FOR UPDATE', [id]);
        const target = locked.rows[0];
        if (!target) return 'missing' as const;

        const nextActive = body.active ?? Boolean(target.active);
        const nextRole = body.role ?? (String(target.role) as 'superadmin' | 'teacher');
        const losesAdmin = String(target.role) === 'superadmin' && Boolean(target.active) && (!nextActive || nextRole !== 'superadmin');

        if (losesAdmin && id === actor.id) return 'self' as const;
        if (losesAdmin) {
          const others = await client.query(
            "SELECT COUNT(*)::int AS n FROM staff_users WHERE role = 'superadmin' AND active = true AND id <> $1",
            [id],
          );
          if (Number(others.rows[0].n) === 0) return 'last-admin' as const;
        }

        const revoke = (body.active === false && Boolean(target.active)) || (body.role !== undefined && body.role !== String(target.role));
        const sets: string[] = [];
        const values: unknown[] = [id];
        if (body.active !== undefined && body.active !== Boolean(target.active)) { values.push(body.active); sets.push(`active = $${values.length}`); }
        if (body.role !== undefined && body.role !== String(target.role)) { values.push(body.role); sets.push(`role = $${values.length}`); }
        if (revoke) sets.push('token_version = token_version + 1');
        if (sets.length > 0) await client.query(`UPDATE staff_users SET ${sets.join(', ')} WHERE id = $1`, values);

        if (body.active !== undefined && body.active !== Boolean(target.active)) await audit(client, actor, 'staff', id, 'active', target.active, body.active);
        if (body.role !== undefined && body.role !== String(target.role)) await audit(client, actor, 'staff', id, 'role', target.role, body.role);

        if (body.classIds !== undefined || (body.role === 'superadmin')) {
          await setClasses(client, id, nextRole === 'teacher' ? body.classIds ?? [] : []);
          await audit(client, actor, 'staff', id, 'classes', null, nextRole === 'teacher' ? body.classIds ?? [] : []);
        }
        return 'ok' as const;
      });

      if (outcome === 'missing') return fail(res, 404, 'Staff account not found.');
      if (outcome === 'self') return fail(res, 400, 'You can’t deactivate or demote your own account.');
      if (outcome === 'last-admin') return fail(res, 409, 'At least one active administrator must remain.');
      res.json({ ok: true });
    }),
  );

  router.post(
    '/staff/:id/password',
    adminOnly,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      const body = validate(z.object({ password: passwordField }), req.body, res);
      if (id === null || !body) return;
      const actor = staff(req);
      const hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

      // Bumping token_version signs the person out everywhere immediately.
      const updated = await withTransaction(async (client) => {
        const result = await client.query('UPDATE staff_users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1 RETURNING id', [id, hash]);
        if (!result.rows[0]) return false;
        await audit(client, actor, 'staff', id, 'password_reset', null, null);
        return true;
      });

      if (!updated) return fail(res, 404, 'Staff account not found.');
      res.json({ ok: true });
    }),
  );

  return router;
}
