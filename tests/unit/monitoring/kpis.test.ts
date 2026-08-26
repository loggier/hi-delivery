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

  it('deduplicates orders and riders by id with the last row winning for all KPIs', () => {
    const orders = [
      order('unassigned', { status: 'completed' }),
      order('unassigned', { status: 'pending_acceptance' }),
      order('transit', { status: 'accepted', riderId: null }),
      order('transit', { status: 'out_for_delivery', riderId: 'occupied' }),
      order('terminal', { status: 'accepted' }),
      order('terminal', { status: 'delivered' }),
    ];
    const riders = [
      rider('occupied', { activeForOrders: false, lastLocationReceivedAt: null }),
      rider('occupied', { activeForOrders: false }),
      rider('available', { lastLocationReceivedAt: null }),
      rider('available'),
      rider('signal', { lastLocationReceivedAt: '2026-08-25T11:59:00Z' }),
      rider('signal', { lastLocationReceivedAt: null }),
    ];
    const conditions = [
      condition('unassigned:unassigned', 'unassigned'),
      condition('gps-stale:unassigned:rider', 'unassigned'),
      condition('late-delivery:terminal', 'terminal'),
      condition('late-delivery:missing', 'missing'),
    ];

    expect(computeMonitoringKpis(orders, riders, conditions, thresholds, now)).toEqual({
      openOrders: 2,
      unassigned: 1,
      onTheWay: 1,
      atRisk: 1,
      ridersOnline: 2,
      available: 1,
      occupied: 1,
      noSignal: 1,
    });
  });

  it('counts risk only for deduplicated open orders present in the snapshot', () => {
    const orders = [
      order('open'),
      order('terminal', { status: 'completed' }),
    ];
    const conditions = [
      condition('gps-stale:open:rider', 'open'),
      condition('late-delivery:terminal', 'terminal'),
      condition('late-delivery:missing', 'missing'),
    ];

    expect(computeMonitoringKpis(orders, [], conditions, thresholds, now).atRisk).toBe(1);
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

  it('counts assigned rider ids as occupied and no signal when rider rows are missing', () => {
    const result = computeMonitoringKpis(
      [
        order('first', { riderId: 'missing-rider' }),
        order('second', { riderId: 'missing-rider', status: 'picked_up' }),
      ],
      [],
      [],
      thresholds,
      now,
    );

    expect(result).toMatchObject({
      ridersOnline: 0,
      available: 0,
      occupied: 1,
      noSignal: 1,
    });
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

  it('treats future location timestamps as no signal', () => {
    const result = computeMonitoringKpis(
      [],
      [rider('future', { lastLocationReceivedAt: '2026-08-25T12:00:01Z' })],
      [],
      thresholds,
      now,
    );

    expect(result).toMatchObject({ ridersOnline: 0, available: 0, noSignal: 1 });
  });
});
