import { describe, expect, it, vi } from 'vitest';

import { buildMonitoringSnapshot, type MonitoringSnapshotRepositories } from '@/lib/monitoring/snapshot-service';

const now = new Date('2026-08-26T12:00:00.000Z');

function repositories(overrides: Partial<MonitoringSnapshotRepositories> = {}): MonitoringSnapshotRepositories {
  return {
    fetchSettings: vi.fn(async () => ({ data: null, error: { code: '42703', message: 'column missing' } })),
    fetchActiveOrders: vi.fn(async () => ({ data: [], error: null })),
    fetchRelevantRiders: vi.fn(async () => ({ data: [], error: null })),
    fetchMovementHistory: vi.fn(async () => ({ data: [], error: null })),
    reconcileIncidents: vi.fn(async () => []),
    ...overrides,
  };
}

describe('protected monitoring snapshot schema fallbacks', () => {
  it('uses 7/10/15/50 fallback thresholds and reports disabled optional rules', async () => {
    const result = await buildMonitoringSnapshot({ repositories: repositories(), now });
    expect(result.thresholds).toEqual({
      unassignedCriticalMinutes: 7,
      gpsStaleCriticalMinutes: 10,
      stoppedInTransitMinutes: 15,
      meaningfulMovementMeters: 50,
      source: 'fallback',
    });
    expect(result.dataHealth).toEqual({
      schema: 'degraded',
      disabledRules: expect.arrayContaining(['late-delivery', 'outside-zone', 'repeated-rejections', 'irregular-reporting']),
    });
  });

  it('reconciles once and computes KPIs before applying filters', async () => {
    const reconcileIncidents = vi.fn(async () => []);
    const repo = repositories({
      fetchActiveOrders: vi.fn(async () => ({ data: [
        { id: 'o1', status: 'pending_acceptance', rider_id: null, created_at: '2026-08-26T11:00:00.000Z' },
        { id: 'terminal', status: 'completed', rider_id: null, created_at: '2026-08-26T10:00:00.000Z' },
      ], error: null })),
      reconcileIncidents,
    });
    const result = await buildMonitoringSnapshot({ repositories: repo, now, filter: { riderId: 'missing' } });
    expect(result.kpis.openOrders).toBe(1);
    expect(result.orders).toEqual([]);
    expect(reconcileIncidents).toHaveBeenCalledTimes(1);
    expect(result.serverTimestamp).toBe(now.toISOString());
  });

  it('continues safely when optional movement history is unavailable', async () => {
    const repo = repositories({
      fetchActiveOrders: vi.fn(async () => ({ data: [{ id: 'o1', status: 'on_the_way', rider_id: 'r1', created_at: now.toISOString() }], error: null })),
      fetchRelevantRiders: vi.fn(async () => ({ data: [{ id: 'r1', is_active_for_orders: true, last_location_update: now.toISOString() }], error: null })),
      fetchMovementHistory: vi.fn(async () => ({ data: null, error: { code: 'PGRST204', message: 'optional column missing' } })),
    });
    const result = await buildMonitoringSnapshot({ repositories: repo, now });
    expect(result.dataHealth.disabledRules).toContain('stopped-in-transit');
  });

  it('does not swallow non-schema repository errors', async () => {
    const repo = repositories({
      fetchActiveOrders: vi.fn(async () => ({ data: null, error: { code: '42501', message: 'denied' } })),
    });
    await expect(buildMonitoringSnapshot({ repositories: repo, now })).rejects.toThrow('Unable to load monitoring snapshot');
  });
});
