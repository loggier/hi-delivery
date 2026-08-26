import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, getMock, transitionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getMock: vi.fn(),
  transitionMock: vi.fn(),
}));

vi.mock('@/lib/auth/admin-session', () => ({
  AdminSessionError: class AdminSessionError extends Error {
    status: 401 | 403;
    constructor(message: string, status: 401 | 403) { super(message); this.status = status; }
  },
  requireAdminOperationSession: authMock,
}));
vi.mock('@/lib/monitoring/incident-repository', () => ({
  getMonitoringIncidentForOperation: getMock,
  transitionMonitoringIncident: transitionMock,
}));

import { AdminSessionError } from '@/lib/auth/admin-session';
import { PATCH } from '@/app/api/monitoring/incidents/[id]/route';

const incident = {
  id: 42,
  conditionKey: 'gps-stale:order-1:rider-1',
  type: 'gps-stale',
  priority: 'P1',
  status: 'attending',
  orderId: 'order-1',
  riderId: 'rider-1',
  firstDetectedAt: '2026-08-26T12:00:00.000Z',
  lastDetectedAt: '2026-08-26T12:01:00.000Z',
  attendingAt: '2026-08-26T12:00:10.000Z',
  resolvedAt: null,
  metadata: {},
};

function request(body: unknown) {
  return new Request('http://localhost/api/monitoring/incidents/42', {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('PATCH /api/monitoring/incidents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ id: 'admin-7', roleId: 'role-admin', status: 'ACTIVE' });
    getMock.mockResolvedValue(incident);
    transitionMock.mockResolvedValue({ status: 'resolved', closed: true });
  });

  it.each([[401], [403]] as const)('maps auth failure to %i', async (status) => {
    authMock.mockRejectedValue(new AdminSessionError('denied', status));
    expect((await PATCH(request({ action: 'attend' }), { params: Promise.resolve({ id: '42' }) })).status).toBe(status);
  });

  it('derives actor from the authenticated session and resolves only after an inactive condition check', async () => {
    getMock.mockResolvedValue({ ...incident, status: 'attending' });
    const response = await PATCH(request({ action: 'request_close', reason: '  condition cleared  ' }), { params: Promise.resolve({ id: '42' }) });
    expect(response.status).toBe(200);
    expect(transitionMock).toHaveBeenCalledWith({ incident, action: 'request_close', reason: 'condition cleared', actorId: 'admin-7' });
  });

  it('keeps an active condition attending', async () => {
    transitionMock.mockResolvedValue({ status: 'attending', closed: false });
    const response = await PATCH(request({ action: 'request_close', reason: 'still active' }), { params: Promise.resolve({ id: '42' }) });
    expect(await response.json()).toEqual({ status: 'attending', closed: false });
  });

  it('rejects invalid bodies and missing incidents without exposing DB errors', async () => {
    expect((await PATCH(request({ action: 'request_close', reason: 'x' }), { params: Promise.resolve({ id: '42' }) })).status).toBe(400);
    getMock.mockResolvedValue(null);
    expect((await PATCH(request({ action: 'attend' }), { params: Promise.resolve({ id: '42' }) })).status).toBe(404);
    getMock.mockRejectedValue(new Error('database token details'));
    const response = await PATCH(request({ action: 'attend' }), { params: Promise.resolve({ id: '42' }) });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'No se pudo actualizar el incidente.' });
  });
});
