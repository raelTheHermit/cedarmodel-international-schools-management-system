import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import { getDatabaseConfig } from './database-config.js';

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
};

export type StudentRecord = {
  id: number;
  admissionNumber: string;
  classId: number;
  active: boolean;
};

export type AuthRepository = {
  findStaffByEmail: (email: string) => Promise<StaffUserRecord | null>;
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
  | { kind: 'staff'; id: number; email: string; role: StaffRole }
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

function parseCookies(rawCookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!rawCookieHeader) return cookies;

  for (const part of rawCookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const equalsIndex = trimmed.indexOf('=');
    const key = equalsIndex >= 0 ? trimmed.slice(0, equalsIndex) : trimmed;
    const value = equalsIndex >= 0 ? trimmed.slice(equalsIndex + 1) : '';
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function getRequestIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.trim() ?? 'unknown';
  return req.socket.remoteAddress ?? 'unknown';
}

function readSessionUser(req: Request): SessionUser | null {
  const cookies = req.cookies ?? parseCookies(req.headers.cookie);
  req.cookies = cookies;

  const cookieValue = cookies[SESSION_COOKIE_NAME];
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(cookieValue) as SessionUser;
    return parsed && typeof parsed.kind === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function setSessionCookie(res: Response, user: SessionUser): void {
  res.cookie(SESSION_COOKIE_NAME, JSON.stringify(user), cookieOptions);
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
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  const user = readSessionUser(req);
  if (user?.kind !== 'staff') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(role: StaffRole | StaffRole[]) {
  const allowedRoles = Array.isArray(role) ? role : [role];

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = readSessionUser(req);
    if (user?.kind !== 'staff' || !allowedRoles.includes(user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    req.user = user;
    next();
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
    max: 10,
  });

  return {
    async findStaffByEmail(email: string) {
      const result = await pool.query(
        'SELECT id, email, password_hash AS "passwordHash", role FROM staff_users WHERE email = $1 LIMIT 1',
        [email.toLowerCase()],
      );

      const row = result.rows[0];
      if (!row) return null;

      return {
        id: Number(row.id),
        email: String(row.email),
        passwordHash: String(row.passwordHash),
        role: String(row.role) as StaffRole,
      };
    },

    async findStudentByAdmissionNumber(admissionNumber: string) {
      const result = await pool.query(
        'SELECT id, admission_number AS "admissionNumber", class_id AS "classId", active FROM students WHERE admission_number = $1 LIMIT 1',
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
        'SELECT code_hash AS "codeHash" FROM access_codes WHERE student_id = $1 ORDER BY id DESC LIMIT 1',
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
    const sessionUser: SessionUser = { kind: 'staff', id: user.id, email: user.email, role: user.role };
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

    const sessionUser: SessionUser = {
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
