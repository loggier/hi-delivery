import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ownerMock, metadataMock, clientMock, rpcMock, fromMock } = vi.hoisted(() => ({
  ownerMock: vi.fn(), metadataMock: vi.fn(), clientMock: vi.fn(), rpcMock: vi.fn(), fromMock: vi.fn(),
}));
vi.mock('@/lib/business-integrations/api-key-management', () => ({ requireBusinessIntegrationOwner: ownerMock, listBusinessApiKeyMetadata: metadataMock }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: clientMock }));
vi.mock('@/lib/auth/admin-session', () => ({ AdminSessionError: class AdminSessionError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } } }));
import { GET, POST, PATCH, DELETE } from '@/app/api/business-integrations/key/route';
import { AdminSessionError } from '@/lib/auth/admin-session';

const owner = { userId: 'user-1', businessId: 'biz-1' };
const existing = { id: 'key-1', key_prefix: 'hid_live_abcd1234…', enabled: false, created_at: '2026-10-01T00:00:00Z', last_used_at: null };
function query(result: { data?: unknown; error?: unknown } = { data: existing, error: null }) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'is', 'update', 'maybeSingle', 'single']) q[method] = vi.fn(() => q);
  q.maybeSingle.mockResolvedValue(result); q.single.mockResolvedValue(result);
  q.then = vi.fn((resolve: (x: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return q;
}
function req(method: string, body?: unknown, origin = 'http://localhost') {
  return new Request('http://localhost/api/business-integrations/key', {
    method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), Origin: origin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('business integration key lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks(); ownerMock.mockResolvedValue(owner); rpcMock.mockResolvedValue({ data: 'key-new', error: null });
    metadataMock.mockResolvedValue(existing);
    const q = query(); fromMock.mockReturnValue(q); clientMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
  });
  it('GET returns metadata only and never a digest or secret', async () => {
    const response = await GET();
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
    const body = await response.json();
    expect(body).toEqual({ key: { id: 'key-1', prefix: existing.key_prefix, enabled: false, created_at: existing.created_at, last_used_at: null } });
    expect(JSON.stringify(body)).not.toMatch(/digest|hid_live_[A-Za-z0-9_-]{20}/);
    expect(metadataMock).toHaveBeenCalledWith('biz-1');
  });
  it('POST atomically rotates and exposes the raw key only in the response', async () => {
    const response = await POST(req('POST', { business_id: 'attacker-business' }));
    expect(response.status).toBe(201); const body = await response.json();
    expect(body.key).toMatch(/^hid_live_/); expect(body).not.toHaveProperty('digest');
    expect(rpcMock).toHaveBeenCalledWith('rotate_business_api_key', expect.objectContaining({ business_id_in: 'biz-1', actor_user_id_in: 'user-1' }));
    expect(rpcMock.mock.calls[0][1].business_id_in).not.toBe('attacker-business');
  });
  it('requires same-origin on mutations', async () => {
    const response = await POST(req('POST', {}, 'https://evil.example'));
    expect(response.status).toBe(403); expect(rpcMock).not.toHaveBeenCalled();
  });
  it('denies accounts that do not resolve to an authorized active owner', async () => {
    ownerMock.mockRejectedValue(new AdminSessionError('denied', 403));
    expect((await GET()).status).toBe(403);
  });
  it('PATCH accepts only a boolean enabled value and scopes to the resolved business', async () => {
    const response = await PATCH(req('PATCH', { enabled: true, business_id: 'other' }));
    expect(response.status).toBe(200);
    const q = fromMock.mock.results[0].value;
    expect(q.update).toHaveBeenCalledWith({ enabled: true }); expect(q.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
  it('DELETE revokes the linked business key', async () => {
    expect((await DELETE(req('DELETE'))).status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith('business_api_keys');
    expect(fromMock.mock.results[0].value.update).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, revoked_at: expect.any(String) }));
  });
});
