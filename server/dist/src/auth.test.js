"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const auth_js_1 = require("./auth.js");
(0, vitest_1.describe)('authentication', () => {
    const buildRepo = (overrides = {}) => ({
        findStaffByEmail: async () => ({
            id: 1,
            email: 'admin@cedarmodel.local',
            passwordHash: await bcryptjs_1.default.hash('Admin123!', 10),
            role: 'superadmin',
        }),
        findStudentByAdmissionNumber: async () => ({
            id: 7,
            admissionNumber: 'ADM-0001',
            classId: 2,
            active: true,
        }),
        findParentAccessCodeHash: async () => bcryptjs_1.default.hashSync('CODE1234', 10),
        countRecentFailedAttempts: async (_admissionNumber, _ipAddress) => 0,
        recordLoginAttempt: async () => undefined,
        ...overrides,
    });
    (0, vitest_1.it)('rejects a wrong parent access code with a generic error', async () => {
        const repo = buildRepo();
        const app = (0, auth_js_1.createAuthApp)({ repo });
        const response = await (0, supertest_1.default)(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.2')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'WRONG99' });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.message).toBe('Invalid credentials or account locked.');
        (0, vitest_1.expect)(response.headers['set-cookie']).toBeUndefined();
    });
    (0, vitest_1.it)('locks out a parent after repeated failed attempts', async () => {
        const repo = buildRepo({
            countRecentFailedAttempts: async (admissionNumber, ipAddress) => {
                (0, vitest_1.expect)(admissionNumber).toBe('ADM-0001');
                (0, vitest_1.expect)(ipAddress).toBe('10.0.0.3');
                return 5;
            },
        });
        const app = (0, auth_js_1.createAuthApp)({ repo });
        const response = await (0, supertest_1.default)(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.3')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'CODE1234' });
        (0, vitest_1.expect)(response.status).toBe(403);
        (0, vitest_1.expect)(response.body.message).toBe('Invalid credentials or account locked.');
    });
    (0, vitest_1.it)('blocks a staff user from parent-only routes and a parent from staff-only routes', async () => {
        const repo = buildRepo();
        const app = (0, auth_js_1.createAuthApp)({ repo });
        const staffLogin = await (0, supertest_1.default)(app)
            .post('/api/auth/staff')
            .set('X-Forwarded-For', '10.0.0.4')
            .send({ email: 'admin@cedarmodel.local', password: 'Admin123!' });
        (0, vitest_1.expect)(staffLogin.status).toBe(200);
        const staffAccess = await (0, supertest_1.default)(app)
            .get('/api/parent/me')
            .set('Cookie', staffLogin.headers['set-cookie'][0].split(';')[0]);
        (0, vitest_1.expect)(staffAccess.status).toBe(403);
        const parentLogin = await (0, supertest_1.default)(app)
            .post('/api/auth/parent')
            .set('X-Forwarded-For', '10.0.0.5')
            .send({ admissionNumber: 'ADM-0001', accessCode: 'CODE1234' });
        (0, vitest_1.expect)(parentLogin.status).toBe(200);
        const parentAccess = await (0, supertest_1.default)(app)
            .get('/api/staff/me')
            .set('Cookie', parentLogin.headers['set-cookie'][0].split(';')[0]);
        (0, vitest_1.expect)(parentAccess.status).toBe(403);
    });
    (0, vitest_1.it)('builds a Postgres-safe lockout query when the subject is null', () => {
        const query = (0, auth_js_1.buildRecentFailedAttemptsQuery)();
        (0, vitest_1.expect)(query).toContain('COALESCE($1, \'\')');
        (0, vitest_1.expect)(query).toContain('admission_number = $1');
        (0, vitest_1.expect)(query).not.toContain('$2 IS NOT NULL');
    });
    (0, vitest_1.it)('allows the configured frontend origin across the API', async () => {
        const previousOrigin = process.env.CLIENT_ORIGIN;
        process.env.CLIENT_ORIGIN = 'http://localhost:5173';
        const app = (0, auth_js_1.createAuthApp)({ repo: buildRepo() });
        app.use((0, auth_js_1.createCorsMiddleware)());
        const response = await (0, supertest_1.default)(app)
            .options('/api/auth/staff')
            .set('Origin', 'http://localhost:5173')
            .set('Access-Control-Request-Method', 'POST');
        (0, vitest_1.expect)(response.status).toBe(204);
        (0, vitest_1.expect)(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
        (0, vitest_1.expect)(response.headers['access-control-allow-credentials']).toBe('true');
        if (previousOrigin === undefined) {
            delete process.env.CLIENT_ORIGIN;
        }
        else {
            process.env.CLIENT_ORIGIN = previousOrigin;
        }
    });
    (0, vitest_1.it)('uses Postgres-compatible migration syntax', () => {
        const migrationPath = node_path_1.default.resolve(__dirname, '../migrations/001_schema.sql');
        const sql = (0, node_fs_1.readFileSync)(migrationPath, 'utf8');
        (0, vitest_1.expect)(sql).not.toMatch(/AUTO_INCREMENT|ENUM\(|TINYINT\(|ON UPDATE|KEY\s+idx_|INSERT INTO .* VALUES \?/i);
        (0, vitest_1.expect)(sql).toContain('GENERATED BY DEFAULT AS IDENTITY');
        (0, vitest_1.expect)(sql).toContain('BOOLEAN');
    });
});
