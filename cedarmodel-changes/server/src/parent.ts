import { Router } from 'express';
import { requireParent } from './auth.js';
import { getPool } from './db.js';
import { GRADE_SCALE, rankByAverage, summarize } from './grading.js';
import { attendanceTotals, getCurrentTerm } from './term-data.js';
import { asyncHandler } from './session.js';

/**
 * Everything here is derived from the signed session: a parent can only ever receive
 * their own child's published results, whatever they put in the URL.
 */
export function createParentRouter(): Router {
  const router = Router();

  router.get(
    '/report',
    requireParent,
    asyncHandler(async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const studentId = (req.user as { id: number }).id;
      const pool = getPool();

      const studentResult = await pool.query(
        `SELECT s.first_name, s.last_name, s.admission_number, s.active, c.name AS class_name
         FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1`,
        [studentId],
      );
      const student = studentResult.rows[0];
      if (!student || !student.active) return res.status(403).json({ message: 'Forbidden' });

      const schoolResult = await pool.query('SELECT name, email, phone FROM school_settings WHERE id = 1');
      const school = {
        name: String(schoolResult.rows[0]?.name ?? ''),
        email: String(schoolResult.rows[0]?.email ?? ''),
        phone: String(schoolResult.rows[0]?.phone ?? ''),
      };

      const term = await getCurrentTerm();
      const base = {
        school,
        student: { name: `${student.first_name} ${student.last_name}`, admissionNumber: String(student.admission_number), className: String(student.class_name) },
        term: term ? { name: term.name, session: term.session, nextTermBegins: term.nextTermBegins } : null,
      };

      if (!term) return res.json({ ...base, status: 'pending' });

      // Only a published batch is ever read. Drafts are invisible to this endpoint.
      const own = await pool.query(
        `SELECT rr.data, rb.id AS batch_id, c.name AS class_name
         FROM result_rows rr
         JOIN result_batches rb ON rb.id = rr.batch_id
         JOIN classes c ON c.id = rb.class_id
         WHERE rr.student_id = $1 AND rb.term_id = $2 AND rb.status = 'published'`,
        [studentId, term.id],
      );
      const row = own.rows[0];
      if (!row) return res.json({ ...base, status: 'pending' });

      const classmates = await pool.query('SELECT student_id, data FROM result_rows WHERE batch_id = $1', [row.batch_id]);
      const averages = classmates.rows.map((entry) => ({ id: Number(entry.student_id), average: summarize(entry.data).average }));
      const ranks = rankByAverage(averages);

      const report = summarize(row.data);
      const register = (await attendanceTotals([studentId], term.id)).get(studentId);
      const schoolDays = register?.schoolDays ?? report.schoolDays;
      const daysPresent = register?.present ?? report.daysPresent;
      res.json({
        ...base,
        status: 'published',
        student: { ...base.student, className: String(row.class_name) },
        gradeScale: GRADE_SCALE,
        subjects: report.subjects,
        summary: {
          average: report.average,
          highest: report.highest,
          creditsEarned: report.creditsEarned,
          subjectCount: report.subjects.length,
          position: { rank: ranks.get(studentId) ?? 0, of: averages.length },
        },
        attendance: schoolDays !== null && daysPresent !== null ? { schoolDays, present: daysPresent } : null,
        comment: report.comment,
      });
    }),
  );

  return router;
}
