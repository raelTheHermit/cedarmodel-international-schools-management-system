import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createAuthApp } from './auth.js';
describe('authentication', () => {
    const buildRepo = (overrides = {}) => ({
        findStaffByEmail: async () => ({
            id: 1,
            email: 'admin@cedarmodel.local',
            passwordHash: await bcrypt.hash('Admin123!', 10),
            role: 'administrator',
        }),
        findStudentByAdmissionNumber: async () => ({
            id: 7,
            admissionNumber: 'ADM-0001',
            classId: 2,
            active: true,
        }),
        findParentAccessCodeHash: async () => bcrypt.hashSync('CODE1234', 10),
        countRecentFailedAttempts: async (_admissionNumber, _ipAddress) => 0,
        recordLoginAttempt: async () => undefined,
        ...overrides,
    });
    it('rejects a wrong parent access code with a generic error', async () => {
        const repo = buildRepo();
        const app = createAuthApp({ repo });
        const response = await request(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.2')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'WRONG99' });
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid credentials or account locked.');
        expect(response.headers['set-cookie']).toBeUndefined();
    });
    it('locks out a parent after repeated failed attempts', async () => {
        const repo = buildRepo({
            countRecentFailedAttempts: async (admissionNumber, ipAddress) => {
                expect(admissionNumber).toBe('ADM-0001');
                expect(ipAddress).toBe('10.0.0.3');
                return 5;
            },
        });
        const app = createAuthApp({ repo });
        const response = await request(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.3')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'CODE1234' });
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Invalid credentials or account locked.');
    });
    it('blocks a staff user from parent-only routes and a parent from staff-only routes', async () => {
        const repo = buildRepo();
        const app = createAuthApp({ repo });
        const staffLogin = await request(app)
            .post('/api/auth/staff')
            .set('X-Forwarded-For', '10.0.0.4')
            .send({ email: 'admin@cedarmodel.local', password: 'Admin123!' });
        expect(staffLogin.status).toBe(200);
        const staffAccess = await request(app)
            .get('/api/parent/me')
            .set('Cookie', staffLogin.headers['set-cookie'][0].split(';')[0]);
        expect(staffAccess.status).toBe(403);
        const parentLogin = await request(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.5')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'CODE1234' });
        expect(parentLogin.status).toBe(200);
        const parentAccess = await request(app)
            .get('/api/staff/me')
            .set('Cookie', parentLogin.headers['set-cookie'][0].split(';')[0]);
        expect(parentAccess.status).toBe(403);
    });
});
