import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './session.js';

const user = { kind: 'staff', id: 1, email: 'a@school.test', role: 'teacher' } as const;

describe('session tokens', () => {
  it('round-trips a valid token', () => {
    expect(verifySessionToken(createSessionToken(user))).toEqual(user);
  });

  it('rejects a forged role even with a copied signature', () => {
    const [body, signature] = createSessionToken(user).split('.');
    const forgedBody = Buffer.from(JSON.stringify({ user: { ...user, role: 'superadmin' }, iat: 0, exp: 9999999999 })).toString('base64url');
    expect(verifySessionToken(`${forgedBody}.${signature}`)).toBeNull();
    expect(verifySessionToken(`${body}.tampered`)).toBeNull();
  });

  it('rejects unsigned JSON like the old cookie format', () => {
    expect(verifySessionToken(JSON.stringify({ kind: 'staff', id: 1, email: 'x', role: 'superadmin' }))).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});
