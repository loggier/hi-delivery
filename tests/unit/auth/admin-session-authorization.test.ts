import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { cookieStore, cookiesMock, fromMock } = vi.hoisted(() => {
  const store = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  return {
    cookieStore: store,
    cookiesMock: vi.fn(async () => store),
    fromMock: vi.fn(),
  };
});

vi.mock('next/headers', () => ({ cookies: cookiesMock }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: fromMock }),
}));

import {
  ADMIN_SESSION_COOKIE,
  AdminSessionError,
  hashSessionToken,
  requireAdminOperationSession,
  revokeCurrentAdminWebSession,
} from '@/lib/auth/admin-session';
import { POST as signOut } from '@/app/api/auth/sign-out/route';

type SessionRow = {
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
} | null;

type UserRow = {
  id: string;
  role_id: string;
  status: string;
} | null;

let sessionResult: { data: SessionRow; error: unknown };
let userResult: { data: UserRow; error: unknown };
let revokeError: unknown;

function queryReturning(result: () => unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => result()),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function configureDatabase() {
  const sessionQuery = queryReturning(() => sessionResult);
  const userQuery = queryReturning(() => userResult);
  const revokeEq = vi.fn(async () => ({ error: revokeError }));
  const update = vi.fn(() => ({ eq: revokeEq }));

  fromMock.mockImplementation((table: string) => {
    if (table === 'admin_web_sessions') {
      return { ...sessionQuery, update };
    }
    if (table === 'users') {
      return userQuery;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { revokeEq, update };
}

async function expectSessionError(status: 401 | 403) {
  await expect(requireAdminOperationSession()).rejects.toMatchObject({
    name: 'AdminSessionError',
    status,
  });
}

describe('requireAdminOperationSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: 'session-token' });
    sessionResult = {
      data: {
        user_id: 'db-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        revoked_at: null,
      },
      error: null,
    };
    userResult = {
      data: { id: 'db-user', role_id: 'role-admin', status: 'ACTIVE' },
      error: null,
    };
    revokeError = null;
    configureDatabase();
  });

  it('rejects a missing session cookie with 401', async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expectSessionError(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    [
      'revoked',
      {
        user_id: 'db-user',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        revoked_at: new Date().toISOString(),
      },
    ],
    [
      'expired',
      {
        user_id: 'db-user',
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        revoked_at: null,
      },
    ],
  ])('rejects a %s session with 401', async (_case, session) => {
    sessionResult = { data: session, error: null };

    await expectSessionError(401);
  });

  it.each([
    ['inactive user', { id: 'db-user', role_id: 'role-admin', status: 'INACTIVE' }],
    ['non-admin user', { id: 'db-user', role_id: 'role-owner', status: 'ACTIVE' }],
  ])('rejects an %s with 403', async (_case, user) => {
    userResult = { data: user, error: null };

    await expectSessionError(403);
  });

  it('returns the current active admin identity from the database', async () => {
    const untrustedInput = {
      body: { id: 'body-user', roleId: 'role-admin', status: 'ACTIVE' },
      localStorage: { id: 'browser-user', roleId: 'role-admin', status: 'ACTIVE' },
    };

    const user = await (
      requireAdminOperationSession as unknown as (input: unknown) => ReturnType<
        typeof requireAdminOperationSession
      >
    )(untrustedInput);

    expect(user).toEqual({ id: 'db-user', roleId: 'role-admin', status: 'ACTIVE' });
    expect(fromMock).toHaveBeenCalledWith('users');
  });

  it('uses a typed authorization error', () => {
    expect(new AdminSessionError('Forbidden', 403)).toMatchObject({
      name: 'AdminSessionError',
      message: 'Forbidden',
      status: 403,
    });
  });
});

describe('revokeCurrentAdminWebSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: 'session-token' });
    sessionResult = { data: null, error: null };
    userResult = { data: null, error: null };
    revokeError = null;
  });

  it('throws a safe error and deletes the cookie when database revocation fails', async () => {
    revokeError = new Error('database unavailable');
    const { revokeEq, update } = configureDatabase();

    await expect(revokeCurrentAdminWebSession()).rejects.toThrow('Unable to revoke admin session');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ revoked_at: expect.any(String) }));
    expect(revokeEq).toHaveBeenCalledWith('token_hash', hashSessionToken('session-token'));
    expect(cookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
  });

  it('returns a safe non-2xx response and deletes the cookie when revocation fails', async () => {
    revokeError = new Error('database details must remain private');
    configureDatabase();

    const response = await signOut();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      message: 'No se pudo cerrar la sesión de forma segura.',
    });
    expect(cookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
  });
});
