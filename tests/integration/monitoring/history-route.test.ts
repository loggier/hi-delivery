import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, fromMock } = vi.hoisted(() => ({ authMock: vi.fn(), fromMock: vi.fn() }));
vi.mock('@/lib/auth/admin-session', () => ({
  AdminSessionError: class AdminSessionError extends Error { status: 401 | 403; constructor(message: string, status: 401 | 403) { super(message); this.status = status; } },
  requireAdminOperationSession: authMock,
}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ schema: () => ({ from: fromMock }) }), resolveSupabaseSchema: () => 'grupohubs' }));

import { AdminSessionError } from '@/lib/auth/admin-session';
import { POST } from '@/app/api/monitoring/history/route';

function request(body: unknown) {
  return new Request('http://localhost/api/monitoring/history', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

describe('POST /api/monitoring/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin', status: 'ACTIVE' });
    const query = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [{ id: 2, rider_id: 'r1', latitude: 19, longitude: -99, recorded_at: '2026-08-26T10:00:00.000Z' }, { id: 1, rider_id: 'r1', latitude: 19, longitude: -99, recorded_at: '2026-08-26T10:00:00.000Z' }], error: null })) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.gte.mockReturnValue(query); query.lte.mockReturnValue(query); query.order.mockReturnValue(query); query.limit.mockReturnValue(query);
    fromMock.mockReturnValue(query);
  });

  it.each([[401], [403]] as const)('returns %i for auth failure', async (status) => {
    authMock.mockRejectedValue(new AdminSessionError('denied', status));
    expect((await POST(request({ riderId: 'r1', startAt: '2026-08-26T00:00:00.000Z', endAt: '2026-08-26T01:00:00.000Z' }))).status).toBe(status);
  });

  it.each([
    { riderId: '', startAt: '2026-08-26T00:00:00.000Z', endAt: '2026-08-26T01:00:00.000Z' },
    { riderId: 'r1', startAt: '2026-08-26T02:00:00.000Z', endAt: '2026-08-26T01:00:00.000Z' },
    { riderId: 'r1', startAt: '2026-08-01T00:00:00.000Z', endAt: '2026-08-10T00:00:00.000Z' },
  ])('rejects invalid or overlong ranges with 400', async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns ordered, capped points and no-store cache policy', async () => {
    const response = await POST(request({ riderId: 'r1', startAt: '2026-08-26T00:00:00.000Z', endAt: '2026-08-26T23:00:00.000Z' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ points: [{ id: 1, rider_id: 'r1', latitude: 19, longitude: -99, recorded_at: '2026-08-26T10:00:00.000Z' }, { id: 2, rider_id: 'r1', latitude: 19, longitude: -99, recorded_at: '2026-08-26T10:00:00.000Z' }], truncated: false });
  });

  it('maps database failure to a safe 500 response', async () => {
    fromMock.mockReturnValue({ select: () => ({ eq: () => ({ gte: () => ({ lte: () => ({ order: () => ({ order: () => ({ limit: () => Promise.resolve({ data: null, error: new Error('secret') }) }) }) }) }) }) }) });
    const response = await POST(request({ riderId: 'r1', startAt: '2026-08-26T00:00:00.000Z', endAt: '2026-08-26T01:00:00.000Z' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'No se pudo consultar el historial.' });
  });
});
