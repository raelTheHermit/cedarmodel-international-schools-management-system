import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import express from 'express';
import { z } from 'zod';
export const GENERIC_AUTH_ERROR = 'Invalid credentials or account locked.';
export const SESSION_COOKIE_NAME = 'school_portal_session';
const staffLoginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(6),
});
const parentLoginSchema = z.object({
    admissionNumber: z.string().trim().min(3),
    accessCode: z.string().trim().min(6),
});
const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1000 * 60 * 60 * 8,
};
function parseCookies(rawCookieHeader) {
    const cookies = {};
    if (!rawCookieHeader)
        return cookies;
    for (const part of rawCookieHeader.split(';')) {
        const trimmed = part.trim();
        if (!trimmed)
            continue;
        const equalsIndex = trimmed.indexOf('=');
        const key = equalsIndex >= 0 ? trimmed.slice(0, equalsIndex) : trimmed;
        const value = equalsIndex >= 0 ? trimmed.slice(equalsIndex + 1) : '';
        cookies[key] = decodeURIComponent(value);
    }
    return cookies;
}
function getRequestIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string')
        return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded))
        return forwarded[0]?.trim() ?? 'unknown';
    return req.socket.remoteAddress ?? 'unknown';
}
function readSessionUser(req) {
    const cookies = req.cookies ?? parseCookies(req.headers.cookie);
    req.cookies = cookies;
    const cookieValue = cookies[SESSION_COOKIE_NAME];
    if (!cookieValue)
        return null;
    try {
        const parsed = JSON.parse(cookieValue);
        return parsed && typeof parsed.kind === 'string' ? parsed : null;
    }
    catch {
        return null;
    }
}
function setSessionCookie(res, user) {
    res.cookie(SESSION_COOKIE_NAME, JSON.stringify(user), cookieOptions);
}
function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'strict', secure: cookieOptions.secure });
}
async function isLockedOut(repo, subject, ipAddress) {
    const failedAttempts = await repo.countRecentFailedAttempts(subject, ipAddress);
    return failedAttempts >= 5;
}
async function failAuth(req, res, repo, subject) {
    const ipAddress = getRequestIp(req);
    await repo.recordLoginAttempt({ subject, ipAddress, success: false });
    res.status(401).json({ message: GENERIC_AUTH_ERROR });
}
export function requireStaff(req, res, next) {
    const user = readSessionUser(req);
    if (user?.kind !== 'staff') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    req.user = user;
    next();
}
export function requireRole(role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    return (req, res, next) => {
        const user = readSessionUser(req);
        if (user?.kind !== 'staff' || !allowedRoles.includes(user.role)) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        req.user = user;
        next();
    };
}
export function requireParent(req, res, next) {
    const user = readSessionUser(req);
    if (user?.kind !== 'parent') {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }
    req.user = user;
    next();
}
function createDefaultRepository() {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST || !DB_USER || !DB_NAME) {
        throw new Error('Database environment variables are not configured.');
    }
    const pool = mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT ?? 3306),
        user: DB_USER,
        password: DB_PASSWORD ?? '',
        database: DB_NAME,
        connectionLimit: 10,
        waitForConnections: true,
    });
    return {
        async findStaffByEmail(email) {
            const [rows] = await pool.execute('SELECT id, email, password_hash AS passwordHash, role FROM staff_users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
            const row = rows[0];
            if (!row)
                return null;
            return {
                id: Number(row.id),
                email: row.email,
                passwordHash: row.passwordHash,
                role: row.role,
            };
        },
        async findStudentByAdmissionNumber(admissionNumber) {
            const [rows] = await pool.execute('SELECT id, admission_number AS admissionNumber, class_id AS classId, active FROM students WHERE admission_number = ? LIMIT 1', [admissionNumber]);
            const row = rows[0];
            if (!row)
                return null;
            return {
                id: Number(row.id),
                admissionNumber: row.admissionNumber,
                classId: Number(row.classId),
                active: Boolean(row.active),
            };
        },
        async findParentAccessCodeHash(studentId) {
            const [rows] = await pool.execute('SELECT code_hash AS codeHash FROM access_codes WHERE student_id = ? ORDER BY id DESC LIMIT 1', [studentId]);
            const row = rows[0];
            return row ? row.codeHash : null;
        },
        async countRecentFailedAttempts(subject, ipAddress) {
            const [rows] = await pool.execute(`SELECT COUNT(*) AS failedCount
        FROM login_attempts
        WHERE success = 0
          AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
          AND ((admission_number = ? AND ? IS NOT NULL) OR ip_address = ?)
        `, [subject, subject, ipAddress]);
            return Number(rows[0]?.failedCount ?? 0);
        },
        async recordLoginAttempt({ subject, ipAddress, success }) {
            await pool.execute('INSERT INTO login_attempts (admission_number, ip_address, success) VALUES (?, ?, ?)', [subject, ipAddress, success ? 1 : 0]);
        },
    };
}
export function createAuthApp(options) {
    const repo = options?.repo ?? createDefaultRepository();
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use((req, _res, next) => {
        req.cookies = parseCookies(req.headers.cookie);
        next();
    });
    app.post('/api/auth/staff', async (req, res) => {
        const parsed = staffLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return failAuth(req, res, repo, null);
        }
        const { email, password } = parsed.data;
        const ipAddress = getRequestIp(req);
        if (await isLockedOut(repo, email.toLowerCase(), ipAddress)) {
            await repo.recordLoginAttempt({ subject: email.toLowerCase(), ipAddress, success: false });
            return res.status(403).json({ message: GENERIC_AUTH_ERROR });
        }
        const user = await repo.findStaffByEmail(email);
        if (!user) {
            return failAuth(req, res, repo, email.toLowerCase());
        }
        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return failAuth(req, res, repo, email.toLowerCase());
        }
        await repo.recordLoginAttempt({ subject: email.toLowerCase(), ipAddress, success: true });
        const sessionUser = { kind: 'staff', id: user.id, email: user.email, role: user.role };
        setSessionCookie(res, sessionUser);
        return res.json({ message: 'Staff login successful', user: sessionUser });
    });
    app.post('/api/auth/parent', async (req, res) => {
        const parsed = parentLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return failAuth(req, res, repo, null);
        }
        const { admissionNumber, accessCode } = parsed.data;
        const ipAddress = getRequestIp(req);
        const subject = admissionNumber.trim();
        if (await isLockedOut(repo, subject, ipAddress)) {
            await repo.recordLoginAttempt({ subject, ipAddress, success: false });
            return res.status(403).json({ message: GENERIC_AUTH_ERROR });
        }
        const student = await repo.findStudentByAdmissionNumber(subject);
        if (!student || !student.active) {
            return failAuth(req, res, repo, subject);
        }
        const storedHash = await repo.findParentAccessCodeHash(student.id);
        if (!storedHash || !(await bcrypt.compare(accessCode, storedHash))) {
            return failAuth(req, res, repo, subject);
        }
        await repo.recordLoginAttempt({ subject, ipAddress, success: true });
        const sessionUser = {
            kind: 'parent',
            id: student.id,
            admissionNumber: student.admissionNumber,
            classId: student.classId,
        };
        setSessionCookie(res, sessionUser);
        return res.json({ message: 'Parent login successful', user: sessionUser });
    });
    app.post('/api/auth/logout', (_req, res) => {
        clearSessionCookie(res);
        res.json({ message: 'Logged out' });
    });
    app.get('/api/staff/me', requireStaff, (req, res) => {
        res.json({ user: req.user });
    });
    app.get('/api/parent/me', requireParent, (req, res) => {
        res.json({ user: req.user });
    });
    return app;
}
