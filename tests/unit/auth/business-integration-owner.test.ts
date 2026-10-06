import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { cookieStore, cookiesMock, fromMock } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn() }, cookiesMock: vi.fn(), fromMock: vi.fn(),
}));
vi.mock('next/headers', () => ({ cookies: cookiesMock }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: fromMock }) }));

import { requireBusinessIntegrationOwnerSession } from '@/lib/auth/admin-session';

let session: any;
let user: any;
let business: any;
function query(result: () => unknown) {
  const q: any = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => result()) };
  q.select.mockReturnValue(q); q.eq.mockReturnValue(q); return q;
}
function setup() {
  const results: Record<string, any> = {
    admin_web_sessions: query(() => session), users: query(() => user), businesses: query(() => business),
  };
  fromMock.mockImplementation((table: string) => results[table]);
}

describe('requireBusinessIntegrationOwnerSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.get.mockReturnValue({ value: 'session-token' }); cookiesMock.mockResolvedValue(cookieStore);
    session = { data: { user_id: 'db-user', expires_at: new Date(Date.now() + 60_000).toISOString(), revoked_at: null }, error: null };
    user = { data: { id: 'db-user', role_id: 'owen-business', status: 'ACTIVE' }, error: null };
    business = { data: { id: 'business-db', status: 'ACTIVE' }, error: null }; setup();
  });

  it('accepts active owen-business and returns the database-linked business identity', async () => {
    await expect(requireBusinessIntegrationOwnerSession()).resolves.toEqual({ id: 'db-user', roleId: 'owen-business', businessId: 'business-db' });
    expect(fromMock).toHaveBeenCalledWith('businesses');
  });

  it.each([
    ['admin role', { id: 'db-user', role_id: 'role-admin', status: 'ACTIVE' }],
    ['legacy role alias', { id: 'db-user', role_id: 'role-owner', status: 'ACTIVE' }],
    ['rider role', { id: 'db-user', role_id: 'role-rider', status: 'ACTIVE' }],
    ['inactive owner', { id: 'db-user', role_id: 'owen-business', status: 'INACTIVE' }],
  ])('denies %s', async (_label, row) => {
    user = { data: row, error: null }; setup();
    await expect(requireBusinessIntegrationOwnerSession()).rejects.toMatchObject({ name: 'AdminSessionError', status: 403 });
    expect(fromMock).not.toHaveBeenCalledWith('businesses');
  });

  it.each([
    ['missing session', null],
    ['revoked session', { user_id: 'db-user', expires_at: new Date(Date.now() + 60_000).toISOString(), revoked_at: '2026-10-01T00:00:00Z' }],
    ['expired session', { user_id: 'db-user', expires_at: new Date(Date.now() - 60_000).toISOString(), revoked_at: null }],
  ])('denies %s', async (_label, row) => {
    session = { data: row, error: null }; setup();
    await expect(requireBusinessIntegrationOwnerSession()).rejects.toMatchObject({ name: 'AdminSessionError', status: 401 });
    expect(fromMock).not.toHaveBeenCalledWith('users');
  });

  it('denies an owner with no linked business', async () => {
    business = { data: null, error: null }; setup();
    await expect(requireBusinessIntegrationOwnerSession()).rejects.toMatchObject({ name: 'AdminSessionError', status: 403 });
  });

  it('denies an owner whose linked business is inactive', async () => {
    business = { data: { id: 'business-db', status: 'INACTIVE' }, error: null }; setup();
    await expect(requireBusinessIntegrationOwnerSession()).rejects.toMatchObject({ name: 'AdminSessionError', status: 403 });
  });
});
