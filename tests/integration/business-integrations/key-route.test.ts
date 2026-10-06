import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const { ownerMock, metadataMock, clientMock, rpcMock, fromMock } = vi.hoisted(() => ({
  ownerMock: vi.fn(), metadataMock: vi.fn(), clientMock: vi.fn(), rpcMock: vi.fn(), fromMock: vi.fn(),
}));
vi.mock('@/lib/business-integrations/api-key-management', () => ({ requireBusinessIntegrationOwner: ownerMock, listBusinessApiKeyMetadata: metadataMock }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: clientMock }));
vi.mock('@/lib/auth/admin-session', () => ({ AdminSessionError: class AdminSessionError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } } }));
import { GET, POST, PATCH, DELETE } from '@/app/api/business-integrations/key/route';
import { AdminSessionError } from '@/lib/auth/admin-session';

const owner = { userId: 'user-1', businessId: 'biz-1' };
const currentKeyId = '11111111-1111-4111-8111-111111111111';
const existing = { id: currentKeyId, key_prefix: 'hid_live_abcd1234…', enabled: false, created_at: '2026-10-01T00:00:00Z', last_used_at: null };
let queryResult: { data?: unknown; error?: unknown } | undefined;
function query(result: { data?: unknown; error?: unknown } = { data: existing, error: null }) {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'is', 'update', 'maybeSingle', 'single']) q[method] = vi.fn(() => q);
  q.maybeSingle.mockImplementation(async () => queryResult ?? result); q.single.mockImplementation(async () => queryResult ?? result);
  q.then = vi.fn((resolve: (x: unknown) => unknown) => Promise.resolve(queryResult ?? result).then(resolve));
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
    vi.clearAllMocks(); queryResult = undefined; ownerMock.mockResolvedValue(owner); rpcMock.mockResolvedValue({ data: '22222222-2222-4222-8222-222222222222', error: null });
    metadataMock.mockResolvedValue(existing);
    const q = query(); fromMock.mockReturnValue(q); clientMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
  });
  it('GET returns metadata only and never a digest or secret', async () => {
    const response = await GET();
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
    const body = await response.json();
    expect(body).toEqual({ key: { id: currentKeyId, prefix: existing.key_prefix, enabled: false, created_at: existing.created_at, last_used_at: null } });
    expect(JSON.stringify(body)).not.toMatch(/digest|hid_live_[A-Za-z0-9_-]{20}/);
    expect(metadataMock).toHaveBeenCalledWith('biz-1');
  });
  it('POST atomically rotates and exposes the raw key only in the response', async () => {
    const response = await POST(req('POST', { business_id: 'attacker-business' }));
    expect(response.status).toBe(201); const body = await response.json();
    expect(body.key).toMatch(/^hid_live_/); expect(body).not.toHaveProperty('digest');
    expect(rpcMock).toHaveBeenCalledWith('rotate_business_api_key', expect.objectContaining({ business_id_in: 'biz-1', actor_user_id_in: 'user-1' }));
    expect(rpcMock.mock.calls[0][1].business_id_in).not.toBe('attacker-business');
    expect(body.enabled).toBe(false);
    expect(rpcMock.mock.calls[0][1].new_digest_in).toBe(createHash('sha256').update(body.key).digest('hex'));
    expect(Object.values(rpcMock.mock.calls[0][1])).not.toContain(body.key);
    metadataMock.mockResolvedValue(existing);
    const getResponse = await GET();
    expect(getResponse.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(await getResponse.json())).not.toContain(body.key);
  });
  it('requires same-origin on mutations', async () => {
    const response = await POST(req('POST', {}, 'https://evil.example'));
    expect(response.status).toBe(403); expect(rpcMock).not.toHaveBeenCalled();
  });
  it('denies accounts that do not resolve to an authorized active owner', async () => {
    ownerMock.mockRejectedValue(new AdminSessionError('sensitive session details', 403));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it.each(['GET', 'POST', 'PATCH', 'DELETE'] as const)('%s safely rejects an owner whose linked business is inactive before key operations', async (method) => {
    ownerMock.mockRejectedValue(new AdminSessionError('inactive business details', 403));
    const request = method === 'GET' ? undefined : req(method, method === 'PATCH' ? { key_id: currentKeyId, enabled: true } : {});
    const response = method === 'GET' ? await GET() : method === 'POST' ? await POST(request!) : method === 'PATCH' ? await PATCH(request!) : await DELETE(request!);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(metadataMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });
  it('maps authentication-required errors to a generic safe response', async () => {
    ownerMock.mockRejectedValue(new AdminSessionError('cookie hash / session details', 401));
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
  });
  it.each([true, false])('PATCH sets enabled=%s only on the requested live key in the linked business', async (enabled) => {
    const response = await PATCH(req('PATCH', { key_id: currentKeyId, enabled, business_id: 'other' }));
    expect(response.status).toBe(200);
    const q = fromMock.mock.results[0].value;
    expect(q.update).toHaveBeenCalledWith({ enabled });
    expect(q.eq).toHaveBeenCalledWith('id', currentKeyId);
    expect(q.eq).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(q.is).toHaveBeenCalledWith('revoked_at', null);
  });
  it('PATCH cannot update a replacement key when a stale key id is submitted after rotation', async () => {
    queryResult = { data: null, error: null };
    const staleKeyId = '33333333-3333-4333-8333-333333333333';
    const response = await PATCH(req('PATCH', { key_id: staleKeyId, enabled: true }));
    expect(response.status).toBe(404);
    expect(fromMock.mock.results[0].value.eq).toHaveBeenCalledWith('id', staleKeyId);
    expect(fromMock.mock.results[0].value.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
  it('PATCH rejects an id belonging to another business without changing any key', async () => {
    queryResult = { data: null, error: null };
    const foreignKeyId = '44444444-4444-4444-8444-444444444444';
    const response = await PATCH(req('PATCH', { key_id: foreignKeyId, enabled: true }));
    expect(response.status).toBe(404);
    expect(fromMock.mock.results[0].value.eq).toHaveBeenCalledWith('id', foreignKeyId);
    expect(fromMock.mock.results[0].value.eq).toHaveBeenCalledWith('business_id', 'biz-1');
  });
  it.each<[unknown, string]>([
    [{ enabled: true }, 'missing key_id'],
    [{ key_id: '', enabled: true }, 'empty key_id'],
    [{ key_id: 123, enabled: true }, 'non-string key_id'],
    [{ key_id: 'malformed-uuid', enabled: true }, 'malformed UUID key_id'],
    [{ key_id: currentKeyId, enabled: 'true' }, 'non-boolean enabled'],
  ])('PATCH rejects malformed payload: %s', async (body, _description) => {
    const response = await PATCH(req('PATCH', body));
    expect(response.status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });
  it('DELETE revokes the linked business key', async () => {
    expect((await DELETE(req('DELETE'))).status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith('business_api_keys');
    expect(fromMock.mock.results[0].value.update).toHaveBeenCalledWith(expect.objectContaining({ enabled: false, revoked_at: expect.any(String) }));
  });
  it.each(['PATCH', 'DELETE'] as const)('%s returns 404 when there is no live key', async (method) => {
    queryResult = { data: null, error: null };
    const response = method === 'PATCH' ? await PATCH(req(method, { key_id: currentKeyId, enabled: true })) : await DELETE(req(method));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ error: 'No active business API key' });
  });
  it.each(['PATCH', 'DELETE'] as const)('%s returns a generic no-store error on persistence failure', async (method) => {
    queryResult = { data: null, error: new Error('sensitive database details') };
    const response = method === 'PATCH' ? await PATCH(req(method, { key_id: currentKeyId, enabled: true })) : await DELETE(req(method));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
});
