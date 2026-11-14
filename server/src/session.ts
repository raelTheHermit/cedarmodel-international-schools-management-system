import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SessionUser } from './auth.js';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

let cachedSecret: Buffer | null = null;

// Read lazily: ES imports run before dotenv.config(), so the env is not populated at import time.
function getSecret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
  }
  cachedSecret = Buffer.from(secret, 'utf8');
  return cachedSecret;
}

/** Call once at startup (after dotenv) so a misconfigured deploy fails immediately instead of at first login. */
export function assertSessionConfig(): void {
  getSecret();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(body: string): string {
  return crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
}

type TokenPayload = { user: SessionUser; iat: number; exp: number };

/** Produces `<payload>.<signature>`. The payload is readable but cannot be altered without the secret. */
export function createSessionToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { user, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Returns the user only if the signature is valid and the token has not expired. */
export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload?.user || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.user;
  } catch {
    return null;
  }
}

/**
 * Express 4 does not catch rejected promises from async handlers: a DB error
 * would leave the request hanging or crash the process. Wrap every async route.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Mount last. Logs the real error server-side, returns a generic message to the client. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
