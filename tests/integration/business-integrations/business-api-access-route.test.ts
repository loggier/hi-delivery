import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminSessionMock, createClientMock, fromMock } = vi.hoisted(() => ({
  adminSessionMock: vi.fn(),
  createClientMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/lib/auth/admin-session', () => ({
  AdminSessionError: class AdminSessionError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
  },
  requireAdminOperationSession: adminSessionMock,
}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: createClientMock }));

import { PATCH } from '@/app/api/businesses/[id]/api-access/route';
import { AdminSessionError } from '@/lib/auth/admin-session';

const businessId = 'biz-123';
let result: { data: unknown; error: unknown };

function request(body: unknown, origin = 'http://localhost') {
  return new Request(`http://localhost/api/businesses/${businessId}/api-access`, {
    method: 'PATCH',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupQuery() {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    select: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  fromMock.mockReturnValue(builder);
  createClientMock.mockReturnValue({ from: fromMock });
  return builder;
}

describe('PATCH /api/businesses/[id]/api-access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    result = { data: { id: businessId, api_enabled: true }, error: null };
    adminSessionMock.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin', status: 'ACTIVE' });
  });

  it('allows an administrator to enable or disable only the entitlement column', async () => {
    for (const enabled of [true, false]) {
      const builder = setupQuery();
      const response = await PATCH(request({ enabled }), { params: Promise.resolve({ id: businessId }) });
      expect(response.status).toBe(200);
      expect(builder.update).toHaveBeenCalledWith({ api_enabled: enabled });
      expect(builder.eq).toHaveBeenCalledWith('id', businessId);
      expect(builder.select).toHaveBeenCalledWith('id, api_enabled');
    }
  });

  it('rejects unauthenticated and non-admin sessions without updating the business', async () => {
    const builder = setupQuery();
    adminSessionMock.mockRejectedValueOnce(new AdminSessionError('no session', 401));
    const unauthorized = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: businessId }) });
    expect(unauthorized.status).toBe(401);

    adminSessionMock.mockResolvedValueOnce({ id: 'owner-1', roleId: 'owen-business', status: 'ACTIVE' });
    const forbidden = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: businessId }) });
    expect(forbidden.status).toBe(403);
    expect(builder.update).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests and invalid payloads before persistence', async () => {
    const builder = setupQuery();
    const crossOrigin = await PATCH(request({ enabled: true }, 'https://attacker.example'), { params: Promise.resolve({ id: businessId }) });
    expect(crossOrigin.status).toBe(403);

    for (const body of [{}, { enabled: 'true' }, { enabled: true, business_id: 'other-business' }]) {
      const response = await PATCH(request(body), { params: Promise.resolve({ id: businessId }) });
      expect(response.status).toBe(400);
    }
    expect(builder.update).not.toHaveBeenCalled();
  });

  it('rejects malformed and oversized business IDs without touching persistence', async () => {
    const builder = setupQuery();
    const malformed = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: '' }) });
    const oversized = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: 'b'.repeat(129) }) });
    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(builder.update).not.toHaveBeenCalled();
  });

  it('returns no-store safe responses for missing businesses and database failures', async () => {
    result = { data: null, error: null };
    setupQuery();
    const missing = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: businessId }) });
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toContain('no-store');

    result = { data: null, error: new Error('private database detail') };
    setupQuery();
    const failed = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id: businessId }) });
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain('private database detail');
  });
});
