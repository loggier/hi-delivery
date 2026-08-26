import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, fromMock, rpcMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
}));
vi.mock('@/lib/auth/admin-session', () => ({
  AdminSessionError: class AdminSessionError extends Error { status: 401 | 403; constructor(message: string, status: 401 | 403) { super(message); this.status = status; } },
  requireAdminOperationSession: authMock,
}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: fromMock, rpc: rpcMock }) }));

import { AdminSessionError } from '@/lib/auth/admin-session';
import { POST } from '@/app/api/monitoring/snapshot/route';
import * as snapshotRoute from '@/app/api/monitoring/snapshot/route';
import * as snapshotService from '@/lib/monitoring/snapshot-service';

function queryFor(table: string) {
  const result = table === 'system_settings'
    ? { data: { monitoring_unassigned_critical_minutes: 2, monitoring_gps_stale_critical_minutes: 3, monitoring_stopped_in_transit_minutes: 4, monitoring_meaningful_movement_meters: 25 }, error: null }
    : table === 'orders'
      ? { data: [{ id: 'active', status: 'pending_acceptance', rider_id: null, created_at: '2026-08-26T11:00:00.000Z' }], error: null }
      : { data: [], error: null };
  const query = { select: vi.fn(), maybeSingle: vi.fn(), not: vi.fn(), eq: vi.fn(), or: vi.fn(), in: vi.fn(), gte: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result)) };
  query.select.mockReturnValue(query); query.maybeSingle.mockReturnValue(query); query.not.mockReturnValue(query); query.eq.mockReturnValue(query); query.or.mockReturnValue(query); query.in.mockReturnValue(query); query.gte.mockReturnValue(query);
  return query;
}

describe('POST /api/monitoring/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin', status: 'ACTIVE' });
    fromMock.mockImplementation((table: string) => queryFor(table));
    rpcMock.mockResolvedValue({ data: [{ id: 4, condition_key: 'unassigned:active', incident_type: 'unassigned', priority: 'P1', status: 'open', order_id: 'active', rider_id: null, first_detected_at: '2026-08-26T12:00:00.000Z', last_detected_at: '2026-08-26T12:00:00.000Z', attending_at: null, resolved_at: null, condition_metadata: {} }], error: null });
  });

  it('exposes only the approved POST contract', () => {
    expect(snapshotRoute).not.toHaveProperty('GET');
  });

  it.each([[401], [403]] as const)('maps admin authorization failure to %i', async (status) => {
    authMock.mockRejectedValue(new AdminSessionError('denied', status));
    expect((await POST(new Request('http://localhost/api/monitoring/snapshot', { method: 'POST' }))).status).toBe(status);
  });

  it('validates query filters and returns 400 without invoking data access', async () => {
    const response = await POST(new Request('http://localhost/api/monitoring/snapshot?orderStatus=not-real', { method: 'POST' }));
    expect(response.status).toBe(400);
  });

  it('uses JSON POST filters as the single builder input', async () => {
    const builder = vi.spyOn(snapshotService, 'buildMonitoringSnapshot').mockResolvedValue({} as never);
    const response = await POST(new Request('http://localhost/api/monitoring/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk: 'atRisk', zoneId: 'z1', search: 'abc' }),
    }));
    expect(response.status).toBe(200);
    expect(builder).toHaveBeenCalledWith({ filter: { risk: 'atRisk', zoneId: 'z1', search: 'abc' } });
    builder.mockRestore();
  });

  it('rejects malformed JSON POST filters', async () => {
    const response = await POST(new Request('http://localhost/api/monitoring/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    }));
    expect(response.status).toBe(400);
  });

  it('runs the real parser and builder, returns configured thresholds, filters active data, and disables cache', async () => {
    const response = await POST(new Request('http://localhost/api/monitoring/snapshot?orderStatus=pending_acceptance&search=active', { method: 'POST' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(Object.keys(body).sort()).toEqual(['serverTimestamp', 'dataHealth', 'thresholds', 'kpis', 'incidents', 'orders', 'riders'].sort());
    expect(body.thresholds).toMatchObject({ unassignedCriticalMinutes: 2, gpsStaleCriticalMinutes: 3, stoppedInTransitMinutes: 4, meaningfulMovementMeters: 25 });
    expect(body.orders).toEqual([expect.objectContaining({ id: 'active' })]);
    expect(body.orders).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'terminal' })]));
    expect(body.incidents[0]).toMatchObject({ conditionKey: 'unassigned:active', firstDetectedAt: '2026-08-26T12:00:00.000Z', lastDetectedAt: '2026-08-26T12:00:00.000Z' });
    expect(body.incidents[0]).not.toHaveProperty('condition_key');
    expect(Object.keys(body.incidents[0]).sort()).toEqual(['id', 'conditionKey', 'type', 'priority', 'status', 'orderId', 'riderId', 'firstDetectedAt', 'lastDetectedAt', 'attendingAt', 'resolvedAt', 'metadata'].sort());
  });
});
