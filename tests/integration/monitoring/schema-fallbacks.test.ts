import { describe, expect, it, vi } from 'vitest';

import { buildMonitoringSnapshot, type MonitoringSnapshotRepositories } from '@/lib/monitoring/snapshot-service';
import { createSupabaseIncidentStore, reconcileMonitoringIncidents } from '@/lib/monitoring/incident-repository';

const now = new Date('2026-08-26T12:00:00.000Z');

function repositories(overrides: Partial<MonitoringSnapshotRepositories> = {}): MonitoringSnapshotRepositories {
  return {
    fetchSettings: vi.fn(async () => ({ data: null, error: { code: '42703', message: 'expected_delivery_at missing' } })),
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
    const fetchRelevantRiders = vi.fn(async () => ({ data: [{ id: 'r-offline', is_active_for_orders: false, last_location_update: now.toISOString() }], error: null }));
    const repo = repositories({
      fetchSettings: vi.fn(async () => ({ data: {
        monitoring_unassigned_critical_minutes: 2,
        monitoring_gps_stale_critical_minutes: 3,
        monitoring_stopped_in_transit_minutes: 4,
        monitoring_meaningful_movement_meters: 25,
      }, error: null })),
      fetchActiveOrders: vi.fn(async () => ({ data: [
        { id: 'o1', status: 'pending_acceptance', rider_id: null, created_at: '2026-08-26T11:00:00.000Z' },
        { id: 'terminal', status: 'completed', rider_id: null, created_at: '2026-08-26T10:00:00.000Z' },
      ], error: null })),
      reconcileIncidents,
      fetchRelevantRiders,
    });
    const result = await buildMonitoringSnapshot({ repositories: repo, now, filter: { riderId: 'missing' } });
    expect(result.thresholds).toEqual({ unassignedCriticalMinutes: 2, gpsStaleCriticalMinutes: 3, stoppedInTransitMinutes: 4, meaningfulMovementMeters: 25, source: 'settings' });
    expect(result.kpis.openOrders).toBe(1);
    expect(result.orders).toEqual([]);
    expect(reconcileIncidents).toHaveBeenCalledTimes(1);
    expect(fetchRelevantRiders).toHaveBeenCalledWith([]);
    expect(result.serverTimestamp).toBe(now.toISOString());
  });

  it('continues safely when optional movement history is unavailable', async () => {
    const repo = repositories({
      fetchActiveOrders: vi.fn(async () => ({ data: [{ id: 'o1', status: 'on_the_way', rider_id: 'r1', created_at: now.toISOString() }], error: null })),
      fetchRelevantRiders: vi.fn(async () => ({ data: [{ id: 'r1', is_active_for_orders: true, last_location_update: now.toISOString() }], error: null })),
      fetchMovementHistory: vi.fn(async () => ({ data: null, error: { code: 'PGRST204', message: 'recorded_at optional column missing' } })),
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

  it.each([
    ['PGRST200', 'relation missing'],
    ['42P01', 'table missing'],
    ['42703', 'column policy denied by operation'],
  ])('does not classify %s unrelated database errors as schema fallbacks', async (code, message) => {
    const active = repositories({
      fetchActiveOrders: vi.fn(async () => ({ data: [{ id: 'o1', status: 'on_the_way', rider_id: 'r1', created_at: now.toISOString() }], error: null })),
      fetchRelevantRiders: vi.fn(async () => ({ data: [{ id: 'r1', is_active_for_orders: true, last_location_update: now.toISOString() }], error: null })),
      fetchMovementHistory: vi.fn(async () => ({ data: null, error: { code, message } })),
    });
    await expect(buildMonitoringSnapshot({ repositories: active, now })).rejects.toThrow('Unable to load monitoring snapshot');
  });

  it('maps RPC incident rows through the shared incident store mapper', async () => {
    const rpc = vi.fn(async () => ({ data: [{ id: 4, condition_key: 'unassigned:o1', incident_type: 'unassigned', priority: 'P1', status: 'open', order_id: 'o1', rider_id: null, first_detected_at: now.toISOString(), last_detected_at: now.toISOString(), attending_at: null, resolved_at: null, condition_metadata: {} }], error: null }));
    const store = createSupabaseIncidentStore({ rpc });
    const incidents = await reconcileMonitoringIncidents(store, [], ['unassigned'], now);
    expect(incidents[0]).toMatchObject({ conditionKey: 'unassigned:o1', firstDetectedAt: now.toISOString(), lastDetectedAt: now.toISOString() });
    expect(incidents[0]).not.toHaveProperty('condition_key');
  });
});
