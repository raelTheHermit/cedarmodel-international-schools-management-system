export const GRADE_SCALE = [
  { grade: 'A', min: 80, max: 100 },
  { grade: 'B', min: 70, max: 79 },
  { grade: 'C', min: 60, max: 69 },
  { grade: 'D', min: 50, max: 59 },
  { grade: 'E', min: 40, max: 49 },
  { grade: 'F', min: 0, max: 39 },
];

/** A subject total at or above this earns the credit. */
export const CREDIT_MARK = 40;

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function gradeFor(total: number): string {
  return (GRADE_SCALE.find((band) => total >= band.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).grade;
}

/** What result_rows.data holds. Validated on upload; read defensively everywhere else. */
export type StoredResult = {
  subjects: Array<{ subject: string; ca1: number; ca2: number; exam: number }>;
  schoolDays: number | null;
  daysPresent: number | null;
  comment: string | null;
};

export function summarize(data: Partial<StoredResult> | null | undefined) {
  const subjects = (data?.subjects ?? []).map((entry) => {
    const ca1 = Number(entry.ca1) || 0;
    const ca2 = Number(entry.ca2) || 0;
    const exam = Number(entry.exam) || 0;
    const total = round1(ca1 + ca2 + exam);
    return { subject: String(entry.subject), ca1, ca2, exam, total, grade: gradeFor(total), credit: total >= CREDIT_MARK };
  });
  const sum = round1(subjects.reduce((acc, entry) => acc + entry.total, 0));
  const average = subjects.length ? round1(sum / subjects.length) : 0;
  const highest = subjects.reduce((max, entry) => Math.max(max, entry.total), 0);

  return {
    subjects,
    average,
    highest,
    creditsEarned: subjects.filter((entry) => entry.credit).length,
    schoolDays: data?.schoolDays ?? null,
    daysPresent: data?.daysPresent ?? null,
    comment: data?.comment ?? null,
  };
}

/** Competition ranking by average: 95, 90, 90, 80 -> 1, 2, 2, 4. */
export function rankByAverage(entries: Array<{ id: number; average: number }>): Map<number, number> {
  const sorted = [...entries].sort((a, b) => b.average - a.average);
  const ranks = new Map<number, number>();
  sorted.forEach((entry, index) => {
    const previous = sorted[index - 1];
    ranks.set(entry.id, previous && previous.average === entry.average ? (ranks.get(previous.id) as number) : index + 1);
  });
  return ranks;
}
