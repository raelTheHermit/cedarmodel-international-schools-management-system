"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_COOKIE_NAME = exports.GENERIC_AUTH_ERROR = void 0;
exports.createCorsMiddleware = createCorsMiddleware;
exports.requireStaff = requireStaff;
exports.requireRole = requireRole;
exports.requireParent = requireParent;
exports.buildRecentFailedAttemptsQuery = buildRecentFailedAttemptsQuery;
exports.createAuthApp = createAuthApp;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const zod_1 = require("zod");
const database_config_js_1 = require("./database-config.js");
const session_js_1 = require("./session.js");
exports.GENERIC_AUTH_ERROR = "Invalid credentials or account locked.";
exports.SESSION_COOKIE_NAME = "school_portal_session";
const staffLoginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email(),
    password: zod_1.z.string().min(6),
});
const parentLoginSchema = zod_1.z.object({
    admissionNumber: zod_1.z.string().trim().min(3),
    accessCode: zod_1.z.string().trim().min(6),
});
const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 1000 * 60 * 60 * 8,
};
// Compared against when the email is unknown, so "no such account" costs the same time as "wrong password".
const DUMMY_HASH = bcryptjs_1.default.hashSync("not-a-real-password", 10);
function parseCookies(rawCookieHeader) {
    const cookies = {};
    if (!rawCookieHeader)
        return cookies;
    for (const part of rawCookieHeader.split(";")) {
        const trimmed = part.trim();
        if (!trimmed)
            continue;
        const equalsIndex = trimmed.indexOf("=");
        const key = equalsIndex >= 0 ? trimmed.slice(0, equalsIndex) : trimmed;
        const value = equalsIndex >= 0 ? trimmed.slice(equalsIndex + 1) : "";
        try {
            cookies[key] = decodeURIComponent(value);
        }
        catch {
            // A malformed cookie must not take the request down; treat it as absent.
        }
    }
    return cookies;
}
function getRequestIp(req) {
    // `trust proxy` is set below, so req.ip is the real client address and the
    // client cannot choose it by sending its own X-Forwarded-For header.
    return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
function readSessionUser(req) {
    const cookies = req.cookies ?? parseCookies(req.headers.cookie);
    req.cookies = cookies;
    return (0, session_js_1.verifySessionToken)(cookies[exports.SESSION_COOKIE_NAME]);
}
function setSessionCookie(res, user) {
    res.cookie(exports.SESSION_COOKIE_NAME, (0, session_js_1.createSessionToken)(user), cookieOptions);
}
function clearSessionCookie(res) {
    res.clearCookie(exports.SESSION_COOKIE_NAME, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: cookieOptions.secure,
    });
}
function createCorsMiddleware() {
    const allowedOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
    return (req, res, next) => {
        const origin = req.headers.origin;
        if (!origin || origin !== allowedOrigin) {
            next();
            return;
        }
        res.header("Access-Control-Allow-Origin", allowedOrigin);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.header("Vary", "Origin");
        if (req.method === "OPTIONS") {
            res.sendStatus(204);
            return;
        }
        next();
    };
}
async function isLockedOut(repo, subject, ipAddress) {
    const failedAttempts = await repo.countRecentFailedAttempts(subject, ipAddress);
    return failedAttempts >= 5;
}
async function failAuth(req, res, repo, subject) {
    const ipAddress = getRequestIp(req);
    await repo.recordLoginAttempt({ subject, ipAddress, success: false });
    res.status(401).json({ message: exports.GENERIC_AUTH_ERROR });
}
function requireStaff(req, res, next) {
    const user = readSessionUser(req);
    if (user?.kind !== "staff") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    req.user = user;
    next();
}
function requireRole(role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    return (req, res, next) => {
        const user = readSessionUser(req);
        if (user?.kind !== "staff" || !allowedRoles.includes(user.role)) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
        req.user = user;
        next();
    };
}
function requireParent(req, res, next) {
    const user = readSessionUser(req);
    if (user?.kind !== "parent") {
        res.status(403).json({ message: "Forbidden" });
        return;
    }
    req.user = user;
    next();
}
function buildRecentFailedAttemptsQuery() {
    return `
    SELECT COUNT(*)::int AS "failedCount"
    FROM login_attempts
    WHERE success = false
      AND created_at >= NOW() - INTERVAL '15 minutes'
      AND (
        (COALESCE($1, '') <> '' AND admission_number = $1)
        OR ip_address = $2
      )
  `;
}
function createDefaultRepository() {
    const pool = new pg_1.Pool({
        ...(0, database_config_js_1.getDatabaseConfig)(),
        max: Number(process.env.DB_POOL_MAX ?? 5),
    });
    return {
        async findStaffByEmail(email) {
            // Deactivated staff must not be able to sign in.
            const result = await pool.query('SELECT id, email, password_hash AS "passwordHash", role FROM staff_users WHERE email = $1 AND active = true LIMIT 1', [email.toLowerCase()]);
            const row = result.rows[0];
            if (!row)
                return null;
            return {
                id: Number(row.id),
                email: String(row.email),
                passwordHash: String(row.passwordHash),
                role: String(row.role),
            };
        },
        async findStudentByAdmissionNumber(admissionNumber) {
            // Admission numbers are stored uppercase by the admin API; match case-insensitively for older rows.
            const result = await pool.query('SELECT id, admission_number AS "admissionNumber", class_id AS "classId", active FROM students WHERE upper(admission_number) = upper($1) LIMIT 1', [admissionNumber]);
            const row = result.rows[0];
            if (!row)
                return null;
            return {
                id: Number(row.id),
                admissionNumber: String(row.admissionNumber),
                classId: Number(row.classId),
                active: Boolean(row.active),
            };
        },
        async findParentAccessCodeHash(studentId) {
            const result = await pool.query(`SELECT code_hash AS "codeHash" FROM access_codes
         WHERE student_id = $1 AND (code_expires_at IS NULL OR code_expires_at > NOW())
         ORDER BY id DESC LIMIT 1`, [studentId]);
            const row = result.rows[0];
            return row ? String(row.codeHash) : null;
        },
        async countRecentFailedAttempts(subject, ipAddress) {
            const result = await pool.query(buildRecentFailedAttemptsQuery(), [
                subject ?? null,
                ipAddress,
            ]);
            return Number(result.rows[0]?.failedCount ?? 0);
        },
        async recordLoginAttempt({ subject, ipAddress, success }) {
            await pool.query("INSERT INTO login_attempts (admission_number, ip_address, success) VALUES ($1, $2, $3)", [subject, ipAddress, success]);
        },
    };
}
function createAuthApp(options) {
    const repo = options?.repo ?? createDefaultRepository();
    const app = (0, express_1.default)();
    // One proxy hop (Vercel / Render): lets req.ip reflect the real client.
    app.set("trust proxy", 1);
    app.use(express_1.default.json({ limit: "1mb" }));
    app.use((req, _res, next) => {
        req.cookies = parseCookies(req.headers.cookie);
        next();
    });
    app.post("/api/auth/staff", (0, session_js_1.asyncHandler)(async (req, res) => {
        const parsed = staffLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return failAuth(req, res, repo, null);
        }
        const { email, password } = parsed.data;
        const subject = email.toLowerCase();
        const ipAddress = getRequestIp(req);
        if (await isLockedOut(repo, subject, ipAddress)) {
            await repo.recordLoginAttempt({ subject, ipAddress, success: false });
            return res.status(403).json({ message: exports.GENERIC_AUTH_ERROR });
        }
        const user = await repo.findStaffByEmail(email);
        // Always run one bcrypt comparison so response time does not reveal whether the email exists.
        const passwordMatches = await bcryptjs_1.default.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !passwordMatches) {
            return failAuth(req, res, repo, subject);
        }
        await repo.recordLoginAttempt({ subject, ipAddress, success: true });
        const sessionUser = {
            kind: "staff",
            id: user.id,
            email: user.email,
            role: user.role,
        };
        setSessionCookie(res, sessionUser);
        return res.json({ message: "Staff login successful", user: sessionUser });
    }));
    app.post("/api/auth/parent", (0, session_js_1.asyncHandler)(async (req, res) => {
        const parsed = parentLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return failAuth(req, res, repo, null);
        }
        const { admissionNumber, accessCode } = parsed.data;
        const ipAddress = getRequestIp(req);
        const subject = admissionNumber.trim().toUpperCase();
        if (await isLockedOut(repo, subject, ipAddress)) {
            await repo.recordLoginAttempt({ subject, ipAddress, success: false });
            return res.status(403).json({ message: exports.GENERIC_AUTH_ERROR });
        }
        const student = await repo.findStudentByAdmissionNumber(subject);
        const storedHash = student?.active
            ? await repo.findParentAccessCodeHash(student.id)
            : null;
        const codeMatches = await bcryptjs_1.default.compare(accessCode, storedHash ?? DUMMY_HASH);
        if (!student || !student.active || !storedHash || !codeMatches) {
            return failAuth(req, res, repo, subject);
        }
        await repo.recordLoginAttempt({ subject, ipAddress, success: true });
        const sessionUser = {
            kind: "parent",
            id: student.id,
            admissionNumber: student.admissionNumber,
            classId: student.classId,
        };
        setSessionCookie(res, sessionUser);
        return res.json({
            message: "Parent login successful",
            user: sessionUser,
        });
    }));
    app.post("/api/auth/logout", (_req, res) => {
        clearSessionCookie(res);
        res.json({ message: "Logged out" });
    });
    app.get("/api/staff/me", requireStaff, (req, res) => {
        res.json({ user: req.user });
    });
    app.get("/api/parent/me", requireParent, (req, res) => {
        res.json({ user: req.user });
    });
    return app;
}
