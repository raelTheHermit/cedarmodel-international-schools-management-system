import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';

export type StudentImportPreview = {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  parentPhone: string;
};

export type ParseStudentRegisterCsvResult = {
  preview: StudentImportPreview[];
  errors: string[];
};

const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('234')) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith('0')) {
    return digits;
  }

  // Excel drops the leading zero of phone numbers: 8031234567 -> 08031234567.
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `0${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('80')) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseStudentRegisterCsv(csvText: string): ParseStudentRegisterCsvResult {
  // Excel often prepends a BOM, which would otherwise corrupt the first header name.
  const lines = csvText.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { preview: [], errors: ['No rows were provided for import.'] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const requiredHeaderMap = {
    'first name': 'firstName',
    'last name': 'lastName',
    'admission number': 'admissionNumber',
    class: 'className',
    'parent phone number': 'parentPhone',
  };

  const missingHeaders = Object.keys(requiredHeaderMap).filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      preview: [],
      errors: [`Missing required columns: ${missingHeaders.join(', ')}`],
    };
  }

  const preview: StudentImportPreview[] = [];
  const errors: string[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const values = parseCsvLine(lines[rowIndex]);
    const record: Record<string, string> = {};

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      record[headers[columnIndex]] = values[columnIndex] ?? '';
    }

    const firstName = String(record['first name'] ?? '').trim();
    const lastName = String(record['last name'] ?? '').trim();
    const admissionNumber = String(record['admission number'] ?? '').trim();
    const className = String(record.class ?? '').trim();
    const parentPhone = normalizePhone(String(record['parent phone number'] ?? ''));

    if (!firstName || !lastName || !admissionNumber || !className || !parentPhone) {
      errors.push(`Row ${rowIndex + 1}: missing required fields for first name, last name, or parent phone number.`);
      continue;
    }

    preview.push({
      firstName,
      lastName,
      admissionNumber,
      className,
      parentPhone,
    });
  }

  return { preview, errors };
}

export function generateAccessCode(): string {
  // crypto.randomInt is cryptographically secure; Math.random() is predictable and must not be used for credentials.
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code += ACCESS_CODE_ALPHABET[randomInt(ACCESS_CODE_ALPHABET.length)];
  }
  return code;
}

export function regenerateAccessCode(input: { previousHash: string; currentCode: string }): {
  newCode: string;
  newHash: string;
  previousHash: string;
} {
  let nextCode = input.currentCode;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateAccessCode();
    if (candidate !== input.currentCode) {
      nextCode = candidate;
      break;
    }
  }

  const newHash = bcrypt.hashSync(nextCode, 10);

  return {
    newCode: nextCode,
    newHash,
    previousHash: input.previousHash,
  };
}
