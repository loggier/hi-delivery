import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

type InsertedSession = {
  token_hash: string;
  user_id: string;
  expires_at: string;
};

const { cookieStore, fromMock, insertMock } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  fromMock: vi.fn(),
  insertMock: vi.fn(async (_session: InsertedSession) => ({ error: null })),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));

import {
  ADMIN_SESSION_COOKIE,
  createAdminWebSession,
  hashSessionToken,
  newSessionToken,
} from '@/lib/auth/admin-session';

describe('admin session tokens', () => {
  it('creates a 64-character hexadecimal token', () => {
    expect(newSessionToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes tokens to a deterministic, non-raw 64-character hexadecimal value', () => {
    const token = 'a'.repeat(64);

    const firstHash = hashSessionToken(token);
    const secondHash = hashSessionToken(token);

    expect(firstHash).toMatch(/^[0-9a-f]{64}$/);
    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(token);
  });

  it('stores only a 12-hour token hash and sets the raw token in a secure server cookie', async () => {
    fromMock.mockReturnValue({ insert: insertMock });
    const startedAt = Date.now();

    await createAdminWebSession('admin-user');

    const inserted = insertMock.mock.calls[0][0];
    const expiresAt = new Date(inserted.expires_at).getTime();
    expect(inserted).toMatchObject({
      user_id: 'admin-user',
      token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(inserted).not.toHaveProperty('token');
    expect(expiresAt).toBeGreaterThanOrEqual(startedAt + 12 * 60 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 12 * 60 * 60 * 1000);

    const [cookieName, rawToken, options] = cookieStore.set.mock.calls[0];
    expect(cookieName).toBe(ADMIN_SESSION_COOKIE);
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(rawToken)).toBe(inserted.token_hash);
    expect(options).toEqual({
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
  });
});
