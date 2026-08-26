import { describe, expect, it } from 'vitest';
import {
  mergeMonitoringLocationPatches,
  monitoringFilterForKpi,
  type MonitoringLocationPatch,
} from '@/app/(admin)/monitoring/_hooks/use-monitoring-controller';
import type { MonitoringRider } from '@/lib/monitoring/types';

const rider = (id: string): MonitoringRider => ({
  id,
  zoneId: 'zone-1',
  activeForOrders: true,
  lastLocationReceivedAt: null,
  lastLocationUpdate: null,
});

describe('monitoring filter helpers', () => {
  it('maps KPI selections to compatible monitoring filters', () => {
    expect(monitoringFilterForKpi('unassigned')).toEqual({ risk: 'unassigned' });
    expect(monitoringFilterForKpi('atRisk')).toEqual({ risk: 'atRisk' });
    expect(monitoringFilterForKpi('noSignal')).toEqual({ risk: 'noSignal' });
    expect(monitoringFilterForKpi('onTheWay')).toEqual({ risk: 'onTheWay' });
    expect(monitoringFilterForKpi('available')).toEqual({ risk: 'available' });
    expect(monitoringFilterForKpi('occupied')).toEqual({ risk: 'occupied' });
    expect(monitoringFilterForKpi('all')).toEqual({});
  });

  it('merges valid location patches without changing rider order or input', () => {
    const riders = [rider('r1'), rider('r2')];
    const patches = new Map<string, MonitoringLocationPatch>([
      ['r2', { riderId: 'r2', latitude: 20, longitude: -99, speed: 3, course: 90, receivedAt: '2025-01-01T00:00:00.000Z' }],
    ]);

    const merged = mergeMonitoringLocationPatches(riders, patches);

    expect(merged.map((item) => item.id)).toEqual(['r1', 'r2']);
    expect(merged[1]).toMatchObject({ lastLocationReceivedAt: '2025-01-01T00:00:00.000Z', lastLocationUpdate: '2025-01-01T00:00:00.000Z' });
    expect(riders[1].lastLocationReceivedAt).toBeNull();
    expect(merged).not.toBe(riders);
  });

  it('ignores patches for unknown riders and invalid coordinates', () => {
    const riders = [rider('r1')];
    const patches = new Map<string, MonitoringLocationPatch>([
      ['unknown', { riderId: 'unknown', latitude: 1, longitude: 2, receivedAt: 'now' }],
      ['r1', { riderId: 'r1', latitude: Number.NaN, longitude: 2, receivedAt: 'now' }],
    ]);

    expect(mergeMonitoringLocationPatches(riders, patches)).toEqual(riders);
  });
});
