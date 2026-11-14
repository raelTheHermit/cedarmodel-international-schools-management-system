import type { Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { getPool, withTransaction } from './db.js';
import { rankByAverage, summarize } from './grading.js';
import type { StoredResult } from './grading.js';
import { parseResultsCsv } from './results-csv.js';
import { asyncHandler } from './session.js';
import { allowedClassIds, audit, fail, readCsv, staff, validate } from './students.js';
import { tableInputSchema } from './table-input.js';

export type TermRow = { id: number; name: string; session: string; nextTermBegins: string | null };

export async function getCurrentTerm(): Promise<TermRow | null> {
  const result = await getPool().query('SELECT id, name, session, next_term_begins FROM terms WHERE is_current LIMIT 1');
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: String(row.name),
    session: String(row.session),
    nextTermBegins: row.next_term_begins ? new Date(row.next_term_begins).toISOString().slice(0, 10) : null,
  };
}

const uploadSchema = z.intersection(
  tableInputSchema,
  z.object({ classId: z.number().int().positive(), dryRun: z.boolean().default(false) }),
);

const idParam = z.coerce.number().int().positive();

async function loadBatch(id: number) {
  const result = await getPool().query(
    `SELECT rb.id, rb.class_id, rb.status, c.name AS class_name, t.name AS term_name, t.session
     FROM result_batches rb
     JOIN classes c ON c.id = rb.class_id
     JOIN terms t ON t.id = rb.term_id
     WHERE rb.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

function noAccess(res: Response) {
  return fail(res, 403, 'You can only work with your own classes.');
}

export function createResultsRouter(): Router {
  const router = Router();
  const anyStaff = requireRole(['superadmin', 'teacher']);
  const adminOnly = requireRole('superadmin');

  router.get(
    '/terms/current',
    anyStaff,
    asyncHandler(async (_req, res) => {
      res.json({ term: await getCurrentTerm() });
    }),
  );

  router.get(
    '/results/batches',
    anyStaff,
    asyncHandler(async (req, res) => {
      const term = await getCurrentTerm();
      if (!term) return res.json({ term: null, batches: [] });

      const allowed = await allowedClassIds(staff(req));
      const result = await getPool().query(
        `SELECT rb.id, rb.class_id, c.name AS class_name, rb.status, rb.uploaded_at, rb.reviewed_at,
                su.email AS uploader,
                (SELECT COUNT(*)::int FROM result_rows rr WHERE rr.batch_id = rb.id) AS student_count
         FROM result_batches rb
         JOIN classes c ON c.id = rb.class_id
         LEFT JOIN staff_users su ON su.id = rb.uploaded_by
         WHERE rb.term_id = $1 AND ($2::int[] IS NULL OR rb.class_id = ANY($2))
         ORDER BY c.name`,
        [term.id, allowed],
      );

      res.json({
        term,
        batches: result.rows.map((row) => ({
          id: Number(row.id),
          classId: Number(row.class_id),
          className: String(row.class_name),
          status: String(row.status),
          uploadedAt: new Date(row.uploaded_at).toISOString(),
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
          uploader: row.uploader ? String(row.uploader) : null,
          studentCount: Number(row.student_count),
        })),
      });
    }),
  );

  router.post(
    '/results/upload',
    anyStaff,
    asyncHandler(async (req, res) => {
      const body = validate(uploadSchema, req.body, res);
      if (!body) return;
      const actor = staff(req);

      const allowed = await allowedClassIds(actor);
      if (allowed && !allowed.includes(body.classId)) return noAccess(res);

      const term = await getCurrentTerm();
      if (!term) return fail(res, 409, 'Set the current term before uploading results.');

      const csv = await readCsv(body, res);
      if (csv === null) return;
      const parsed = parseResultsCsv(csv);

      const students = await getPool().query(
        'SELECT id, upper(admission_number) AS number FROM students WHERE class_id = $1 AND active = true',
        [body.classId],
      );
      if (students.rows.length === 0) return fail(res, 404, 'That class has no active students.');
      const idByNumber = new Map<string, number>(students.rows.map((row) => [String(row.number), Number(row.id)]));

      const errors = [...parsed.errors];
      const grouped = new Map<number, StoredResult>();

      for (const row of parsed.rows) {
        const studentId = idByNumber.get(row.admissionNumber);
        if (!studentId) {
          errors.push(`Row ${row.line}: ${row.admissionNumber} is not an active student in this class.`);
          continue;
        }
        let entry = grouped.get(studentId);
        if (!entry) {
          entry = { subjects: [], schoolDays: null, daysPresent: null, comment: null };
          grouped.set(studentId, entry);
        }
        entry.subjects.push({ subject: row.subject, ca1: row.ca1, ca2: row.ca2, exam: row.exam });
        entry.schoolDays ??= row.schoolDays;
        entry.daysPresent ??= row.daysPresent;
        entry.comment ??= row.comment;
      }

      if (grouped.size === 0 && errors.length === 0) errors.push('The file has no result rows.');

      const summary = {
        students: grouped.size,
        rows: parsed.rows.length,
        missingStudents: students.rows.length - grouped.size,
        errors: errors.slice(0, 100),
        totalErrors: errors.length,
      };

      if (errors.length > 0) {
        if (body.dryRun) return res.json({ ok: false, ...summary });
        return res.status(400).json({ ok: false, message: 'The file has errors. Fix them and upload again.', ...summary });
      }
      if (body.dryRun) return res.json({ ok: true, ...summary });

      try {
        const batchId = await withTransaction(async (client) => {
          const existing = await client.query(
            'SELECT id, status FROM result_batches WHERE class_id = $1 AND term_id = $2 FOR UPDATE',
            [body.classId, term.id],
          );

          let id: number;
          if (existing.rows[0]) {
            if (existing.rows[0].status === 'published') return null;
            id = Number(existing.rows[0].id);
            await client.query('DELETE FROM result_rows WHERE batch_id = $1', [id]);
            await client.query(
              'UPDATE result_batches SET uploaded_by = $2, uploaded_at = NOW(), reviewed_by = NULL, reviewed_at = NULL WHERE id = $1',
              [id, actor.id],
            );
          } else {
            const inserted = await client.query(
              `INSERT INTO result_batches (class_id, term_id, layout, status, uploaded_by)
               VALUES ($1, $2, 'standard', 'draft', $3) RETURNING id`,
              [body.classId, term.id, actor.id],
            );
            id = Number(inserted.rows[0].id);
          }

          const payload = JSON.stringify([...grouped].map(([studentId, data]) => ({ student_id: studentId, data })));
          await client.query(
            `INSERT INTO result_rows (batch_id, student_id, data)
             SELECT $1, x.student_id, x.data
             FROM jsonb_to_recordset($2::jsonb) AS x(student_id int, data jsonb)`,
            [id, payload],
          );
          await audit(client, actor, 'result_batch', id, 'uploaded', null, { students: grouped.size });
          return id;
        });

        if (batchId === null) {
          return fail(res, 409, 'These results are already published. An administrator must unpublish them before you upload again.');
        }
        res.json({ ok: true, batchId, ...summary });
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return fail(res, 409, 'Another upload for this class is in progress. Try again in a moment.');
        }
        throw error;
      }
    }),
  );

  router.get(
    '/results/batches/:id',
    anyStaff,
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;

      const batch = await loadBatch(id);
      if (!batch) return fail(res, 404, 'Result set not found.');

      const allowed = await allowedClassIds(staff(req));
      if (allowed && !allowed.includes(Number(batch.class_id))) return noAccess(res);

      const rows = await getPool().query(
        `SELECT rr.student_id, rr.data, s.first_name, s.last_name, s.admission_number
         FROM result_rows rr JOIN students s ON s.id = rr.student_id
         WHERE rr.batch_id = $1`,
        [id],
      );

      const entries = rows.rows.map((row) => ({
        studentId: Number(row.student_id),
        name: `${row.first_name} ${row.last_name}`,
        admissionNumber: String(row.admission_number),
        ...summarize(row.data),
      }));
      const ranks = rankByAverage(entries.map((entry) => ({ id: entry.studentId, average: entry.average })));

      const missing = await getPool().query(
        `SELECT first_name, last_name, admission_number FROM students
         WHERE class_id = $1 AND active = true AND id <> ALL($2::int[]) ORDER BY last_name, first_name`,
        [batch.class_id, entries.map((entry) => entry.studentId)],
      );

      res.json({
        batch: {
          id: Number(batch.id),
          className: String(batch.class_name),
          status: String(batch.status),
          termName: String(batch.term_name),
          session: String(batch.session),
        },
        students: entries
          .map((entry) => ({ ...entry, rank: ranks.get(entry.studentId) ?? 0 }))
          .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
        missing: missing.rows.map((row) => ({ name: `${row.first_name} ${row.last_name}`, admissionNumber: String(row.admission_number) })),
      });
    }),
  );

  const setStatus = (next: 'published' | 'draft') =>
    asyncHandler(async (req, res) => {
      const id = validate(idParam, req.params.id, res);
      if (id === null) return;
      const actor = staff(req);

      const outcome = await withTransaction(async (client) => {
        const locked = await client.query('SELECT id, status FROM result_batches WHERE id = $1 FOR UPDATE', [id]);
        const batch = locked.rows[0];
        if (!batch) return 'missing' as const;
        if (batch.status === next) return 'unchanged' as const;

        if (next === 'published') {
          const count = await client.query('SELECT COUNT(*)::int AS n FROM result_rows WHERE batch_id = $1', [id]);
          if (Number(count.rows[0].n) === 0) return 'empty' as const;
          await client.query("UPDATE result_batches SET status = 'published', reviewed_by = $2, reviewed_at = NOW() WHERE id = $1", [id, actor.id]);
        } else {
          await client.query("UPDATE result_batches SET status = 'draft', reviewed_by = NULL, reviewed_at = NULL WHERE id = $1", [id]);
        }

        await audit(client, actor, 'result_batch', id, 'status', batch.status, next);
        return 'ok' as const;
      });

      if (outcome === 'missing') return fail(res, 404, 'Result set not found.');
      if (outcome === 'empty') return fail(res, 409, 'This result set has no student results to publish.');
      res.json({ ok: true, status: next });
    });

  router.post('/results/batches/:id/publish', adminOnly, setStatus('published'));
  router.post('/results/batches/:id/unpublish', adminOnly, setStatus('draft'));

  return router;
}
