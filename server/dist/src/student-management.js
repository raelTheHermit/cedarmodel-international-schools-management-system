"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.parseCsvLine = parseCsvLine;
exports.parseStudentRegisterCsv = parseStudentRegisterCsv;
exports.generateAccessCode = generateAccessCode;
exports.regenerateAccessCode = regenerateAccessCode;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function normalizePhone(phone) {
    const trimmed = phone.trim();
    if (!trimmed)
        return '';
    const digits = trimmed.replace(/\D/g, '');
    if (!digits)
        return '';
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
function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            }
            else {
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
function parseStudentRegisterCsv(csvText) {
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
    const preview = [];
    const errors = [];
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
        const values = parseCsvLine(lines[rowIndex]);
        const record = {};
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
function generateAccessCode() {
    // crypto.randomInt is cryptographically secure; Math.random() is predictable and must not be used for credentials.
    let code = '';
    for (let index = 0; index < 8; index += 1) {
        code += ACCESS_CODE_ALPHABET[(0, node_crypto_1.randomInt)(ACCESS_CODE_ALPHABET.length)];
    }
    return code;
}
function regenerateAccessCode(input) {
    let nextCode = input.currentCode;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidate = generateAccessCode();
        if (candidate !== input.currentCode) {
            nextCode = candidate;
            break;
        }
    }
    const newHash = bcryptjs_1.default.hashSync(nextCode, 10);
    return {
        newCode: nextCode,
        newHash,
        previousHash: input.previousHash,
    };
}
