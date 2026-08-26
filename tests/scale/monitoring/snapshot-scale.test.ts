import { describe, expect, it, vi } from 'vitest';
import { buildMonitoringSnapshot, type MonitoringSnapshotRepositories } from '@/lib/monitoring/snapshot-service';

describe('monitoring snapshot scale', () => {
  it('builds a snapshot for 500 riders and 1000 active orders under two seconds', async () => {
    const now = new Date('2026-08-26T12:00:00.000Z');
    const orders = Array.from({ length: 1000 }, (_, index) => ({
      id: `order-${index}`,
      status: 'on_the_way' as const,
      rider_id: `rider-${index % 500}`,
      created_at: now.toISOString(),
      assignment_attempts_exhausted: false,
    }));
    const riders = Array.from({ length: 500 }, (_, index) => ({
      id: `rider-${index}`,
      is_active_for_orders: true,
      last_location_update: now.toISOString(),
    }));
    const repositories: MonitoringSnapshotRepositories = {
      fetchSettings: vi.fn(async () => ({ data: {
        monitoring_unassigned_critical_minutes: 7,
        monitoring_gps_stale_critical_minutes: 10,
        monitoring_stopped_in_transit_minutes: 15,
        monitoring_meaningful_movement_meters: 50,
      }, error: null, available: true })),
      fetchActiveOrders: vi.fn(async () => ({ data: orders, error: null, available: true, availableRules: ['dispatch-exhausted'] })),
      fetchRelevantRiders: vi.fn(async () => ({ data: riders, error: null, available: true })),
      fetchMovementHistory: vi.fn(async () => ({ data: [], error: null, available: true })),
      reconcileIncidents: vi.fn(async () => []),
    };
    const startedAt = performance.now();
    const result = await buildMonitoringSnapshot({ repositories, now });
    const elapsedMs = performance.now() - startedAt;
    expect(result.orders).toHaveLength(1000);
    expect(result.riders).toHaveLength(500);
    expect(elapsedMs).toBeLessThan(2_000);
  });
});
