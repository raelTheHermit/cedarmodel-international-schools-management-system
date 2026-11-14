"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const student_management_js_1 = require("./student-management.js");
(0, vitest_1.describe)('student management', () => {
    (0, vitest_1.it)('validates and previews only stored student fields from the school register', () => {
        const csv = [
            'First name,Last name,Admission number,Class,Date of birth,Parent/Guardian name,Parent/Guardian address,Parent phone number,Religion,Sex',
            'Ada,Okafor,ADM-0001,Primary 4,2014-11-01,Grace Okafor,"10 Main Street, Lagos",08031234567,Christian,Female',
            'Femi,Bello,ADM-0002,Primary 4,2015-03-17,Jane Bello,"15 Broad Road, Lagos",2348036543210,Muslim,Male',
            ' , ,ADM-0003,Primary 4,2014-09-21,Grace Okafor,"10 Main Street, Lagos",,Christian,Female',
        ].join('\n');
        const result = (0, student_management_js_1.parseStudentRegisterCsv)(csv);
        (0, vitest_1.expect)(result.errors).toContain('Row 4: missing required fields for first name, last name, or parent phone number.');
        (0, vitest_1.expect)(result.preview[0]).toEqual({
            firstName: 'Ada',
            lastName: 'Okafor',
            admissionNumber: 'ADM-0001',
            className: 'Primary 4',
            parentPhone: '08031234567',
        });
        (0, vitest_1.expect)(result.preview[1]).toEqual({
            firstName: 'Femi',
            lastName: 'Bello',
            admissionNumber: 'ADM-0002',
            className: 'Primary 4',
            parentPhone: '08036543210',
        });
    });
    (0, vitest_1.it)('regenerates access codes and invalidates the previous code hash', () => {
        const firstCode = (0, student_management_js_1.generateAccessCode)();
        const { newCode, newHash, previousHash } = (0, student_management_js_1.regenerateAccessCode)({
            previousHash: 'old-hash',
            currentCode: firstCode,
        });
        (0, vitest_1.expect)(newCode).toHaveLength(8);
        (0, vitest_1.expect)(newCode).not.toBe(firstCode);
        (0, vitest_1.expect)(newHash).not.toBe(previousHash);
        (0, vitest_1.expect)(newHash).not.toBe('old-hash');
    });
});
