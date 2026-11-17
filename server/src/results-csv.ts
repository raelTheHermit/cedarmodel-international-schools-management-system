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

  const rawHeaders = parseCsvLine(lines[0].text).map((header) => header.trim());
  const headers = rawHeaders.map((header) => header.toLowerCase());
  const longFormat = headers.includes('subject');
  const wideFormat = rawHeaders.some((header) => /^(.*?)(?:\s*\((ca1|ca2|exam)\)|\s+(ca1|ca2|exam))$/i.test(header));

  const longMissing = ['admission number', 'subject', 'ca1', 'ca2', 'exam'].filter((header) => !headers.includes(header));
  if (longFormat && longMissing.length > 0) {
    return { rows: [], errors: [`Missing required columns: ${longMissing.join(', ')}`] };
  }

  const missing = ['admission number'].filter((header) => !headers.includes(header));
  if (missing.length > 0) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  if (!longFormat && !wideFormat) {
    return { rows: [], errors: ['Missing required columns: subject, ca1, ca2, exam'] };
  }

  const rows: ParsedResultRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const findIndex = (name: string) => rawHeaders.findIndex((header) => header.trim().toLowerCase() === name.trim().toLowerCase());
  const get = (name: string) => {
    const index = findIndex(name);
    return index >= 0 ? parseCsvLine(lines[0].text)[index] ?? '' : '';
  };

  for (const entry of lines.slice(1)) {
    const values = parseCsvLine(entry.text);
    const valueAt = (name: string) => values[findIndex(name)] ?? '';

    const admissionNumber = valueAt('admission number').trim().toUpperCase();
    const schoolDays = headers.includes('school days') ? parseDays(valueAt('school days')) : null;
    const daysPresent = headers.includes('days present') ? parseDays(valueAt('days present')) : null;
    const comment = headers.includes('teacher comment') ? valueAt('teacher comment').trim().slice(0, 500) || null : null;

    if (longFormat) {
      const subject = valueAt('subject').trim();
      const ca1 = parseScore(valueAt('ca1'), LIMITS.ca1);
      const ca2 = parseScore(valueAt('ca2'), LIMITS.ca2);
      const exam = parseScore(valueAt('exam'), LIMITS.exam);

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
      continue;
    }

    const subjectFields = new Map<string, { ca1: string; ca2: string; exam: string }>();
    for (const [index, header] of rawHeaders.entries()) {
      if (index >= values.length) continue;
      const trimmed = header.trim();
      if (!trimmed || trimmed.toLowerCase() === 'admission number' || trimmed.toLowerCase() === 'school days' || trimmed.toLowerCase() === 'days present' || trimmed.toLowerCase() === 'teacher comment') continue;

      const match = trimmed.match(/^(.*?)(?:\s*\((ca1|ca2|exam)\)|\s+(ca1|ca2|exam))$/i);
      if (!match) continue;
      const subject = match[1].trim();
      const scoreType = (match[2] ?? match[3] ?? '').toLowerCase();
      if (!subject || !scoreType) continue;

      const current = subjectFields.get(subject) ?? { ca1: '', ca2: '', exam: '' };
      current[scoreType as 'ca1' | 'ca2' | 'exam'] = values[index] ?? '';
      subjectFields.set(subject, current);
    }

    const wideSubjects = [...subjectFields.entries()];
    if (wideSubjects.length === 0) {
      errors.push(`Row ${entry.line}: no subject score columns were found.`);
      continue;
    }

    for (const [subject, scores] of wideSubjects) {
      const ca1 = parseScore(scores.ca1, LIMITS.ca1);
      const ca2 = parseScore(scores.ca2, LIMITS.ca2);
      const exam = parseScore(scores.exam, LIMITS.exam);
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
  }

  return { rows, errors };
}
