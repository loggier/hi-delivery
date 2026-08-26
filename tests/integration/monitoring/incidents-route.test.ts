import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, getMock, transitionMock, closeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getMock: vi.fn(),
  transitionMock: vi.fn(),
  closeMock: vi.fn(),
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
  requestCloseMonitoringIncident: closeMock,
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
    closeMock.mockResolvedValue({ status: 'resolved', closed: true });
  });

  it.each([[401], [403]] as const)('maps auth failure to %i', async (status) => {
    authMock.mockRejectedValue(new AdminSessionError('denied', status));
    expect((await PATCH(request({ action: 'attend' }), { params: Promise.resolve({ id: '42' }) })).status).toBe(status);
  });

  it('derives actor from the authenticated session and resolves only after an inactive condition check', async () => {
    getMock.mockResolvedValue({ ...incident, status: 'attending' });
    const response = await PATCH(request({ action: 'request_close', reason: '  condition cleared  ' }), { params: Promise.resolve({ id: '42' }) });
    expect(response.status).toBe(200);
    expect(closeMock).toHaveBeenCalledWith({ incident, reason: 'condition cleared', actorId: 'admin-7' });
  });

  it('keeps an active condition attending', async () => {
    closeMock.mockResolvedValue({ status: 'attending', closed: false });
    const response = await PATCH(request({ action: 'request_close', reason: 'still active' }), { params: Promise.resolve({ id: '42' }) });
    expect(await response.json()).toEqual({ status: 'attending', closed: false });
    expect(closeMock).toHaveBeenCalledWith(expect.objectContaining({ reason: 'still active', actorId: 'admin-7' }));
  });

  it('passes an inactive condition and authenticated actor to close', async () => {
    await PATCH(request({ action: 'request_close', reason: 'fixed by operator' }), { params: Promise.resolve({ id: '42' }) });
    expect(closeMock).toHaveBeenCalledWith({ incident, reason: 'fixed by operator', actorId: 'admin-7' });
  });

  it('persists open active incidents as attending before returning closed false', async () => {
    getMock.mockResolvedValue({ ...incident, status: 'open', attendingAt: null });
    closeMock.mockResolvedValue({ status: 'attending', closed: false });
    const response = await PATCH(request({ action: 'request_close', reason: 'still active' }), { params: Promise.resolve({ id: '42' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'attending', closed: false });
    expect(closeMock).toHaveBeenCalledWith(expect.objectContaining({ incident: expect.objectContaining({ status: 'open' }), actorId: 'admin-7' }));
  });

  it('returns 409 when the condition becomes active during an inactive close race', async () => {
    closeMock.mockRejectedValue(new Error('stale incident'));
    const response = await PATCH(request({ action: 'request_close', reason: 'condition cleared' }), { params: Promise.resolve({ id: '42' }) });
    expect(response.status).toBe(409);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('maps a stale lifecycle update to 409', async () => {
    transitionMock.mockRejectedValue(new Error('stale incident'));
    expect((await PATCH(request({ action: 'attend' }), { params: Promise.resolve({ id: '42' }) })).status).toBe(409);
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
