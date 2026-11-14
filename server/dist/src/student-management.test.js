import { describe, expect, it } from 'vitest';
import { generateAccessCode, parseStudentRegisterCsv, regenerateAccessCode } from './student-management.js';
describe('student management', () => {
    it('validates and previews only stored student fields from the school register', () => {
        const csv = [
            'First name,Last name,Admission number,Class,Date of birth,Parent/Guardian name,Parent/Guardian address,Parent phone number,Religion,Sex',
            'Ada,Okafor,ADM-0001,Primary 4,2014-11-01,Grace Okafor,"10 Main Street, Lagos",08031234567,Christian,Female',
            'Femi,Bello,ADM-0002,Primary 4,2015-03-17,Jane Bello,"15 Broad Road, Lagos",2348036543210,Muslim,Male',
            ' , ,ADM-0003,Primary 4,2014-09-21,Grace Okafor,"10 Main Street, Lagos",,Christian,Female',
        ].join('\n');
        const result = parseStudentRegisterCsv(csv);
        expect(result.errors).toContain('Row 4: missing required fields for first name, last name, or parent phone number.');
        expect(result.preview[0]).toEqual({
            firstName: 'Ada',
            lastName: 'Okafor',
            admissionNumber: 'ADM-0001',
            className: 'Primary 4',
            parentPhone: '08031234567',
        });
        expect(result.preview[1]).toEqual({
            firstName: 'Femi',
            lastName: 'Bello',
            admissionNumber: 'ADM-0002',
            className: 'Primary 4',
            parentPhone: '08036543210',
        });
    });
    it('regenerates access codes and invalidates the previous code hash', () => {
        const firstCode = generateAccessCode();
        const { newCode, newHash, previousHash } = regenerateAccessCode({
            previousHash: 'old-hash',
            currentCode: firstCode,
        });
        expect(newCode).toHaveLength(8);
        expect(newCode).not.toBe(firstCode);
        expect(newHash).not.toBe(previousHash);
        expect(newHash).not.toBe('old-hash');
    });
});
