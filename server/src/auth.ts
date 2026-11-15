import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { getDatabaseConfig } from './database-config.js';
import { asyncHandler, createSessionToken, verifySessionToken } from './session.js';

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      user?: SessionUser;
    }
  }
}

export const GENERIC_AUTH_ERROR = 'Invalid credentials or account locked.';
export const SESSION_COOKIE_NAME = 'school_portal_session';

export type StaffRole = 'superadmin' | 'teacher';

export type StaffUserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  role: StaffRole;
  tokenVersion?: number;
};

export type StudentRecord = {
  id: number;
  admissionNumber: string;
  classId: number;
  active: boolean;
};

export type AuthRepository = {
  findStaffByEmail: (email: string) => Promise<StaffUserRecord | null>;
  /** Optional so test repositories need not implement it. Production always does. */
  isStaffSessionValid?: (user: { id: number; role: StaffRole; tokenVersion: number }) => Promise<boolean>;
  findStudentByAdmissionNumber: (admissionNumber: string) => Promise<StudentRecord | null>;
  findParentAccessCodeHash: (studentId: number) => Promise<string | null>;
  countRecentFailedAttempts: (subject: string | null, ipAddress: string) => Promise<number>;
  recordLoginAttempt: (input: {
    subject: string | null;
    ipAddress: string;
    success: boolean;
  }) => Promise<void>;
};

export type SessionUser =
  | { kind: 'staff'; id: number; email: string; role: StaffRole; tokenVersion?: number }
  | { kind: 'parent'; id: number; admissionNumber: string; classId: number };

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
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 1000 * 60 * 60 * 8,
};

// Compared against when the email is unknown, so "no such account" costs the same time as "wrong password".
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function parseCookies(rawCookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!rawCookieHeader) return cookies;

  for (const part of rawCookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf('=');
    const key = equalsIndex >= 0 ? trimmed.slice(0, equalsIndex) : trimmed;
    const value = equalsIndex >= 0 ? trimmed.slice(equalsIndex + 1) : '';

    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      // A malformed cookie must not take the request down; treat it as absent.
    }
  }

  return cookies;
}

function getRequestIp(req: Request): string {
  // `trust proxy` is set below, so req.ip is the real client address and the
  // client cannot choose it by sending its own X-Forwarded-For header.
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function readSessionUser(req: Request): SessionUser | null {
  const cookies = req.cookies ?? parseCookies(req.headers.cookie);
  req.cookies = cookies;
  return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}

function setSessionCookie(res: Response, user: SessionUser): void {
  res.cookie(SESSION_COOKIE_NAME, createSessionToken(user), cookieOptions);
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'strict', secure: cookieOptions.secure });
}

export function createCorsMiddleware() {
  const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (!origin || origin !== allowedOrigin) {
      next();
      return;
    }

    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
}

async function isLockedOut(repo: AuthRepository, subject: string | null, ipAddress: string): Promise<boolean> {
  const failedAttempts = await repo.countRecentFailedAttempts(subject, ipAddress);
  return failedAttempts >= 5;
}

async function failAuth(req: Request, res: Response, repo: AuthRepository, subject: string | null): Promise<void> {
  const ipAddress = getRequestIp(req);
  await repo.recordLoginAttempt({ subject, ipAddress, success: false });
  res.status(401).json({ message: GENERIC_AUTH_ERROR });
}

// Set by createAuthApp. Fails closed if the auth app was never created.
let staffValidator: (user: Extract<SessionUser, { kind: 'staff' }>) => Promise<boolean> = async () => false;

async function guardStaff(req: Request, res: Response, next: NextFunction, allowed?: StaffRole[]): Promise<void> {
  try {
    const user = readSessionUser(req);
    if (user?.kind !== 'staff' || (allowed && !allowed.includes(user.role)) || !(await staffValidator(user))) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  void guardStaff(req, res, next);
}

export function requireRole(role: StaffRole | StaffRole[]) {
  const allowedRoles = Array.isArray(role) ? role : [role];
  return (req: Request, res: Response, next: NextFunction): void => {
    void guardStaff(req, res, next, allowedRoles);
  };
}

export function requireParent(req: Request, res: Response, next: NextFunction): void {
  const user = readSessionUser(req);
  if (user?.kind !== 'parent') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  req.user = user;
  next();
}

export function buildRecentFailedAttemptsQuery(): string {
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

function createDefaultRepository(): AuthRepository {
  const pool = new Pool({
    ...getDatabaseConfig(),
    max: Number(process.env.DB_POOL_MAX ?? 5),
  });

  return {
    async findStaffByEmail(email: string) {
      // Deactivated staff must not be able to sign in.
      const result = await pool.query(
        'SELECT id, email, password_hash AS "passwordHash", role, token_version AS "tokenVersion" FROM staff_users WHERE email = $1 AND active = true LIMIT 1',
        [email.toLowerCase()],
      );

      const row = result.rows[0];
      if (!row) return null;

      return {
        id: Number(row.id),
        email: String(row.email),
        passwordHash: String(row.passwordHash),
        role: String(row.role) as StaffRole,
        tokenVersion: Number(row.tokenVersion ?? 0),
      };
    },

    async isStaffSessionValid(user) {
      // Deactivation, demotion and password resets take effect on the very next request.
      const result = await pool.query('SELECT role, active, token_version FROM staff_users WHERE id = $1', [user.id]);
      const row = result.rows[0];
      return Boolean(row) && row.active === true && String(row.role) === user.role && Number(row.token_version) === user.tokenVersion;
    },

    async findStudentByAdmissionNumber(admissionNumber: string) {
      // Admission numbers are stored uppercase by the admin API; match case-insensitively for older rows.
      const result = await pool.query(
        'SELECT id, admission_number AS "admissionNumber", class_id AS "classId", active FROM students WHERE upper(admission_number) = upper($1) LIMIT 1',
        [admissionNumber],
      );

      const row = result.rows[0];
      if (!row) return null;

      return {
        id: Number(row.id),
        admissionNumber: String(row.admissionNumber),
        classId: Number(row.classId),
        active: Boolean(row.active),
      };
    },

    async findParentAccessCodeHash(studentId: number) {
      const result = await pool.query(
        `SELECT code_hash AS "codeHash" FROM access_codes
         WHERE student_id = $1 AND (code_expires_at IS NULL OR code_expires_at > NOW())
         ORDER BY id DESC LIMIT 1`,
        [studentId],
      );

      const row = result.rows[0];
      return row ? String(row.codeHash) : null;
    },

    async countRecentFailedAttempts(subject: string | null, ipAddress: string) {
      const result = await pool.query(buildRecentFailedAttemptsQuery(), [subject ?? null, ipAddress]);

      return Number(result.rows[0]?.failedCount ?? 0);
    },

    async recordLoginAttempt({ subject, ipAddress, success }) {
      await pool.query(
        'INSERT INTO login_attempts (admission_number, ip_address, success) VALUES ($1, $2, $3)',
        [subject, ipAddress, success],
      );
    },
  };
}

export function createAuthApp(options?: { repo?: AuthRepository }) {
  const repo = options?.repo ?? createDefaultRepository();
  const app = express();

  staffValidator = repo.isStaffSessionValid
    ? (user) => repo.isStaffSessionValid!({ id: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 })
    : async () => true;

  // One proxy hop (Vercel / Render): lets req.ip reflect the real client.
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '1mb' }));
  app.use((req, _res, next) => {
    req.cookies = parseCookies(req.headers.cookie);
    next();
  });

  app.post(
    '/api/auth/staff',
    asyncHandler(async (req, res) => {
      const parsed = staffLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return failAuth(req, res, repo, null);
      }

      const { email, password } = parsed.data;
      const subject = email.toLowerCase();
      const ipAddress = getRequestIp(req);

      if (await isLockedOut(repo, subject, ipAddress)) {
        await repo.recordLoginAttempt({ subject, ipAddress, success: false });
        return res.status(403).json({ message: GENERIC_AUTH_ERROR });
      }

      const user = await repo.findStaffByEmail(email);
      // Always run one bcrypt comparison so response time does not reveal whether the email exists.
      const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !passwordMatches) {
        return failAuth(req, res, repo, subject);
      }

      await repo.recordLoginAttempt({ subject, ipAddress, success: true });
      const sessionUser: SessionUser = { kind: 'staff', id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion ?? 0 };
      setSessionCookie(res, sessionUser);
      return res.json({ message: 'Staff login successful', user: sessionUser });
    }),
  );

  app.post(
    '/api/auth/parent',
    asyncHandler(async (req, res) => {
      const parsed = parentLoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return failAuth(req, res, repo, null);
      }

      const { admissionNumber, accessCode } = parsed.data;
      const ipAddress = getRequestIp(req);
      const subject = admissionNumber.trim().toUpperCase();

      if (await isLockedOut(repo, subject, ipAddress)) {
        await repo.recordLoginAttempt({ subject, ipAddress, success: false });
        return res.status(403).json({ message: GENERIC_AUTH_ERROR });
      }

      const student = await repo.findStudentByAdmissionNumber(subject);
      const storedHash = student?.active ? await repo.findParentAccessCodeHash(student.id) : null;
      const codeMatches = await bcrypt.compare(accessCode, storedHash ?? DUMMY_HASH);

      if (!student || !student.active || !storedHash || !codeMatches) {
        return failAuth(req, res, repo, subject);
      }

      await repo.recordLoginAttempt({ subject, ipAddress, success: true });

      const sessionUser: SessionUser = {
        kind: 'parent',
        id: student.id,
        admissionNumber: student.admissionNumber,
        classId: student.classId,
      };

      setSessionCookie(res, sessionUser);
      return res.json({ message: 'Parent login successful', user: sessionUser });
    }),
  );

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
