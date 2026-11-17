import { describe, expect, it } from 'vitest';
import { parseResultsCsv } from './results-csv.js';

const header = 'Admission number,Subject,CA1,CA2,Exam,School days,Days present,Teacher comment';

describe('parseResultsCsv', () => {
  it('parses valid rows including optional columns', () => {
    const { rows, errors } = parseResultsCsv([header, 'adm-1,Maths,18,17,53,62,59,"Strong, steady work"'].join('\n'));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ admissionNumber: 'ADM-1', subject: 'Maths', ca1: 18, exam: 53, schoolDays: 62, daysPresent: 59, comment: 'Strong, steady work' });
  });

  it('rejects out-of-range scores, duplicates and impossible attendance with row numbers', () => {
    const { rows, errors } = parseResultsCsv([
      header,
      'ADM-1,Maths,21,17,53,,,',
      'ADM-1,English,10,10,10,60,70,',
      'ADM-1,Biology,10,10,10,,,',
      'ADM-1,biology,10,10,10,,,',
    ].join('\n'));
    expect(rows).toHaveLength(1);
    expect(errors[0]).toContain('Row 2');
    expect(errors[0]).toContain('CA1');
    expect(errors[1]).toContain('days present cannot exceed');
    expect(errors[2]).toContain('listed twice');
  });

  it('parses a report-sheet style CSV with subject columns', () => {
    const { rows, errors } = parseResultsCsv([
      'Admission number,Mathematics CA1,Mathematics CA2,Mathematics Exam,English Language CA1,English Language CA2,English Language Exam,School days,Days present,Teacher comment',
      'ADM-1,18,17,53,16,15,50,62,59,"Strong, steady work"',
    ].join('\n'));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ admissionNumber: 'ADM-1', subject: 'Mathematics', ca1: 18, ca2: 17, exam: 53, schoolDays: 62, daysPresent: 59, comment: 'Strong, steady work' });
    expect(rows[1]).toMatchObject({ admissionNumber: 'ADM-1', subject: 'English Language', ca1: 16, ca2: 15, exam: 50 });
  });

  it('reports missing required columns', () => {
    expect(parseResultsCsv('Admission number,Subject\nADM-1,Maths').errors[0]).toContain('Missing required columns');
  });
});
