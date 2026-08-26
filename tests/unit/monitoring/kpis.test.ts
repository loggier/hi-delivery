import { describe, expect, it } from 'vitest';

import { computeMonitoringKpis } from '@/lib/monitoring/kpis';
import type {
  DetectedCondition,
  MonitoringOrder,
  MonitoringRider,
  MonitoringThresholds,
} from '@/lib/monitoring/types';

const now = new Date('2026-08-25T12:00:00Z');
const thresholds: MonitoringThresholds = {
  unassignedCriticalMinutes: 7,
  gpsStaleCriticalMinutes: 10,
  stoppedInTransitMinutes: 15,
  meaningfulMovementMeters: 50,
  source: 'settings',
};

const order = (id: string, overrides: Partial<MonitoringOrder> = {}): MonitoringOrder => ({
  id,
  status: 'accepted',
  riderId: null,
  createdAt: '2026-08-25T11:30:00Z',
  expectedDeliveryAt: null,
  assignmentExhaustedAt: null,
  ...overrides,
});

const rider = (id: string, overrides: Partial<MonitoringRider> = {}): MonitoringRider => ({
  id,
  activeForOrders: true,
  lastLocationReceivedAt: '2026-08-25T11:59:00Z',
  lastLocationUpdate: null,
  ...overrides,
});

const condition = (key: string, orderId: string): DetectedCondition => ({
  key,
  type: 'gps-stale',
  priority: 'P1',
  orderId,
  riderId: null,
  detectedAt: now.toISOString(),
  metadata: {},
});

describe('monitoring KPIs', () => {
  it('counts each order once, excludes terminal orders, and deduplicates P1 risk', () => {
    const orders = [
      order('unassigned', { status: 'pending_acceptance' }),
      order('transit', { status: 'out_for_delivery', riderId: 'busy' }),
      order('done', { status: 'completed', riderId: 'other' }),
      order('legacy-done', { status: 'delivered' }),
    ];
    const conditions = [
      condition('gps-stale:transit:busy', 'transit'),
      condition('stopped-in-transit:transit:busy', 'transit'),
      { ...condition('outside-zone:unassigned', 'unassigned'), priority: 'P2' as const },
    ];

    const result = computeMonitoringKpis(orders, [], conditions, thresholds, now);

    expect(result).toMatchObject({ openOrders: 2, unassigned: 1, onTheWay: 1, atRisk: 1 });
    expect(Object.keys(result)).toHaveLength(8);
  });

  it('counts a stale occupied rider in occupied and noSignal, not available', () => {
    const result = computeMonitoringKpis(
      [order('active', { riderId: 'busy', status: 'accepted' })],
      [rider('busy', { lastLocationReceivedAt: '2026-08-25T11:50:00Z' })],
      [],
      thresholds,
      now,
    );

    expect(result).toMatchObject({ ridersOnline: 0, available: 0, occupied: 1, noSignal: 1 });
  });

  it('prefers server receipt time and applies online eligibility without double counting', () => {
    const result = computeMonitoringKpis(
      [order('active', { riderId: 'occupied-off-duty', status: 'picked_up' })],
      [
        rider('available'),
        rider('server-stale', {
          lastLocationReceivedAt: '2026-08-25T11:50:00Z',
          lastLocationUpdate: '2026-08-25T11:59:00Z',
        }),
        rider('occupied-off-duty', { activeForOrders: false }),
        rider('irrelevant-off-duty', { activeForOrders: false }),
      ],
      [],
      thresholds,
      now,
    );

    expect(result).toMatchObject({
      ridersOnline: 2,
      available: 1,
      occupied: 1,
      noSignal: 1,
    });
  });

  it('treats missing and invalid timestamps as no signal without throwing', () => {
    const result = computeMonitoringKpis(
      [],
      [
        rider('missing', { lastLocationReceivedAt: null, lastLocationUpdate: null }),
        rider('invalid', { lastLocationReceivedAt: 'invalid' }),
      ],
      [],
      thresholds,
      now,
    );

    expect(result).toMatchObject({ ridersOnline: 0, available: 0, occupied: 0, noSignal: 2 });
  });
});
