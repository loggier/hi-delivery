import { describe, expect, it } from 'vitest';
import { applyFreshLocationPatch, interpolateMonitoringRiders } from '@/app/(admin)/monitoring/_components/operations-map';
import type { MonitoringRider } from '@/lib/monitoring/types';

// Synthetic fixture only.
const rider: MonitoringRider & { latitude: number; longitude: number } = {
  id: 'rider-1', activeForOrders: true, latitude: 19.4, longitude: -99.1, lastLocationReceivedAt: '2026-08-26T10:00:00.000Z', lastLocationUpdate: '2026-08-26T10:00:00.000Z',
};

describe('operations map location helpers', () => {
  it('ignores a patch older than the current location', () => {
    const older = { ...rider, latitude: 10, lastLocationReceivedAt: '2026-08-26T09:00:00.000Z' };
    expect(applyFreshLocationPatch(rider, older)).toBe(rider);
  });

  it('applies a newer patch', () => {
    const newer = { ...rider, latitude: 19.5, lastLocationReceivedAt: '2026-08-26T10:01:00.000Z' };
    expect(applyFreshLocationPatch(rider, newer).latitude).toBe(19.5);
  });

  it('uses incoming metadata while interpolating changed positions', () => {
    const previous = { ...rider, latitude: 19.4, longitude: -99.1 };
    const incoming = { ...previous, latitude: 19.6, course: 180, activeForOrders: false, lastLocationUpdate: '2026-08-26T10:01:00.000Z' };
    expect(interpolateMonitoringRiders([previous], [incoming], 0.5)[0]).toMatchObject({ latitude: 19.5, course: 180, activeForOrders: false, lastLocationUpdate: '2026-08-26T10:01:00.000Z' });
  });
});
