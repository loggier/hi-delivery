import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/admin-session', () => ({
  AdminSessionError: class AdminSessionError extends Error {
    status: 401 | 403;
    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
  requireAdminOperationSession: vi.fn(),
}));
vi.mock('@/lib/monitoring/snapshot-service', () => ({
  buildMonitoringSnapshot: vi.fn(),
  parseMonitoringFilter: vi.fn((params: URLSearchParams) => ({
    search: params.get('search') ?? undefined,
  })),
}));

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { buildMonitoringSnapshot } from '@/lib/monitoring/snapshot-service';
import { GET } from '@/app/api/monitoring/snapshot/route';

const authMock = vi.mocked(requireAdminOperationSession);
const buildMock = vi.mocked(buildMonitoringSnapshot);

describe('GET /api/monitoring/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ id: 'admin-1', roleId: 'role-admin', status: 'ACTIVE' });
    buildMock.mockResolvedValue({
      serverTimestamp: '2026-08-26T12:00:00.000Z',
      dataHealth: { schema: 'healthy', disabledRules: [] },
      thresholds: {
        unassignedCriticalMinutes: 7,
        gpsStaleCriticalMinutes: 10,
        stoppedInTransitMinutes: 15,
        meaningfulMovementMeters: 50,
        source: 'fallback',
      },
      kpis: { openOrders: 0, unassigned: 0, onTheWay: 0, atRisk: 0, ridersOnline: 0, available: 0, occupied: 0, noSignal: 0 },
      incidents: [],
      orders: [],
      riders: [],
    });
  });

  it('returns 401 without an authenticated session', async () => {
    authMock.mockRejectedValue(new AdminSessionError('Authentication required', 401));
    const response = await GET(new Request('http://localhost/api/monitoring/snapshot'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for a non-admin session', async () => {
    authMock.mockRejectedValue(new AdminSessionError('Admin access required', 403));
    const response = await GET(new Request('http://localhost/api/monitoring/snapshot'));
    expect(response.status).toBe(403);
  });

  it('returns 400 for malformed filters', async () => {
    const { parseMonitoringFilter } = await import('@/lib/monitoring/snapshot-service');
    vi.mocked(parseMonitoringFilter).mockImplementationOnce(() => {
      throw new Error('invalid filter');
    });
    const response = await GET(new Request('http://localhost/api/monitoring/snapshot?search=x'));
    expect(response.status).toBe(400);
  });

  it('returns the exact protected snapshot shape and disables caching', async () => {
    const response = await GET(new Request('http://localhost/api/monitoring/snapshot?risk=all'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(Object.keys(await response.json()).sort()).toEqual([
      'dataHealth', 'incidents', 'kpis', 'orders', 'riders', 'serverTimestamp', 'thresholds',
    ].sort());
  });

  it('maps unexpected failures to a safe 500 response', async () => {
    buildMock.mockRejectedValue(new Error('database coordinates must remain private'));
    const response = await GET(new Request('http://localhost/api/monitoring/snapshot'));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'No se pudo actualizar la operación.' });
  });
});
