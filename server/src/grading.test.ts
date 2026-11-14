import { describe, expect, it } from 'vitest';
import { gradeFor, rankByAverage, summarize } from './grading.js';

describe('grading', () => {
  it('maps totals to grades at the band edges', () => {
    expect([100, 80, 79, 70, 60, 50, 40, 39, 0].map(gradeFor)).toEqual(['A', 'A', 'B', 'B', 'C', 'D', 'E', 'F', 'F']);
  });

  it('summarizes subjects, credits and average', () => {
    const result = summarize({
      subjects: [
        { subject: 'Maths', ca1: 18, ca2: 17, exam: 53 },
        { subject: 'English', ca1: 5, ca2: 5, exam: 20 },
      ],
      schoolDays: 62,
      daysPresent: 59,
      comment: null,
    });
    expect(result.subjects.map((s) => s.total)).toEqual([88, 30]);
    expect(result.average).toBe(59);
    expect(result.creditsEarned).toBe(1);
    expect(result.highest).toBe(88);
  });

  it('ranks with ties sharing a position', () => {
    const ranks = rankByAverage([
      { id: 1, average: 95 },
      { id: 2, average: 90 },
      { id: 3, average: 90 },
      { id: 4, average: 80 },
    ]);
    expect([1, 2, 3, 4].map((id) => ranks.get(id))).toEqual([1, 2, 2, 4]);
  });
});
