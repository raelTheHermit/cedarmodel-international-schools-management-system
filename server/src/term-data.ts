import { getPool } from './db.js';

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

/**
 * Term attendance from the daily register. A student with no register entries in the term has no entry in the map,
 * so callers can fall back to whatever the results upload carried.
 */
export async function attendanceTotals(studentIds: number[], termId: number): Promise<Map<number, { schoolDays: number; present: number }>> {
  const totals = new Map<number, { schoolDays: number; present: number }>();
  if (studentIds.length === 0) return totals;

  const result = await getPool().query(
    `SELECT student_id, COUNT(*)::int AS days, COUNT(*) FILTER (WHERE status <> 'absent')::int AS present
     FROM attendance_records
     WHERE term_id = $1 AND student_id = ANY($2::int[])
     GROUP BY student_id`,
    [termId, studentIds],
  );
  for (const row of result.rows) totals.set(Number(row.student_id), { schoolDays: Number(row.days), present: Number(row.present) });
  return totals;
}
