import { parseCsvLine } from './student-management.js';

export type ParsedResultRow = {
  line: number;
  admissionNumber: string;
  subject: string;
  ca1: number;
  ca2: number;
  exam: number;
  schoolDays: number | null;
  daysPresent: number | null;
  comment: string | null;
};

const LIMITS = { ca1: 20, ca2: 20, exam: 60 };

function parseScore(raw: string, max: number): number | null {
  const text = raw.trim();
  if (text === '') return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0 || value > max || Math.round(value * 10) / 10 !== value) return null;
  return value;
}

function parseDays(raw: string): number | null | 'bad' {
  const text = raw.trim();
  if (text === '') return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 && value <= 366 ? value : 'bad';
}

/**
 * Long format, one row per student per subject:
 *   Admission number, Subject, CA1, CA2, Exam [, School days, Days present, Teacher comment]
 */
export function parseResultsCsv(csvText: string): { rows: ParsedResultRow[]; errors: string[] } {
  const rawLines = csvText.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const lines = rawLines.map((text, index) => ({ text, line: index + 1 })).filter((entry) => entry.text.trim() !== '');

  if (lines.length < 2) return { rows: [], errors: ['The file has no result rows.'] };

  const headers = parseCsvLine(lines[0].text).map((header) => header.trim().toLowerCase());
  const required = ['admission number', 'subject', 'ca1', 'ca2', 'exam'];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length > 0) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const rows: ParsedResultRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const entry of lines.slice(1)) {
    const values = parseCsvLine(entry.text);
    const get = (name: string) => values[headers.indexOf(name)] ?? '';

    const admissionNumber = get('admission number').trim().toUpperCase();
    const subject = get('subject').trim();
    const ca1 = parseScore(get('ca1'), LIMITS.ca1);
    const ca2 = parseScore(get('ca2'), LIMITS.ca2);
    const exam = parseScore(get('exam'), LIMITS.exam);
    const schoolDays = headers.includes('school days') ? parseDays(get('school days')) : null;
    const daysPresent = headers.includes('days present') ? parseDays(get('days present')) : null;
    const comment = headers.includes('teacher comment') ? get('teacher comment').trim().slice(0, 500) || null : null;

    const problems: string[] = [];
    if (!admissionNumber) problems.push('admission number is missing');
    if (!subject || subject.length > 100) problems.push('subject is missing or too long');
    if (ca1 === null) problems.push(`CA1 must be a number from 0 to ${LIMITS.ca1}`);
    if (ca2 === null) problems.push(`CA2 must be a number from 0 to ${LIMITS.ca2}`);
    if (exam === null) problems.push(`Exam must be a number from 0 to ${LIMITS.exam}`);
    if (schoolDays === 'bad' || daysPresent === 'bad') problems.push('school days and days present must be whole numbers');
    if (typeof schoolDays === 'number' && typeof daysPresent === 'number' && daysPresent > schoolDays) {
      problems.push('days present cannot exceed school days');
    }

    const key = `${admissionNumber}|${subject.toLowerCase()}`;
    if (admissionNumber && subject && seen.has(key)) problems.push(`${subject} is listed twice for ${admissionNumber}`);
    seen.add(key);

    if (problems.length > 0) {
      errors.push(`Row ${entry.line}: ${problems.join('; ')}.`);
      continue;
    }

    rows.push({
      line: entry.line,
      admissionNumber,
      subject,
      ca1: ca1 as number,
      ca2: ca2 as number,
      exam: exam as number,
      schoolDays: schoolDays as number | null,
      daysPresent: daysPresent as number | null,
      comment,
    });
  }

  return { rows, errors };
}
