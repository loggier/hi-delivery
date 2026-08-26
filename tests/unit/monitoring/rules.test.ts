import { describe, expect, it } from 'vitest';

import { detectMonitoringConditions } from '@/lib/monitoring/rules';
import type {
  MonitoringOrder,
  MonitoringRider,
  MonitoringSnapshot,
  MonitoringThresholds,
  RiderMovementWindow,
} from '@/lib/monitoring/types';

const now = new Date('2026-08-25T12:00:00Z');
const thresholds: MonitoringThresholds = {
  unassignedCriticalMinutes: 7,
  gpsStaleCriticalMinutes: 10,
  stoppedInTransitMinutes: 15,
  meaningfulMovementMeters: 50,
  source: 'settings',
};

const order = (overrides: Partial<MonitoringOrder> = {}): MonitoringOrder => ({
  id: 'order-1',
  status: 'pending_acceptance',
  riderId: null,
  createdAt: '2026-08-25T11:53:00Z',
  expectedDeliveryAt: null,
  assignmentExhaustedAt: null,
  isOutsideZone: false,
  hasRepeatedRejections: false,
  ...overrides,
});

const rider = (overrides: Partial<MonitoringRider> = {}): MonitoringRider => ({
  id: 'rider-1',
  activeForOrders: true,
  lastLocationReceivedAt: '2026-08-25T11:50:00Z',
  lastLocationUpdate: '2026-08-25T11:59:00Z',
  hasIrregularReporting: false,
  ...overrides,
});

const detect = (
  orders: MonitoringOrder[],
  riders: MonitoringRider[] = [],
  movementByRiderId: Readonly<Record<string, RiderMovementWindow>> = {},
) => detectMonitoringConditions({ orders, riders, movementByRiderId }, thresholds, now);

describe('monitoring condition rules', () => {
  it('marks unassigned orders at exactly 7:00 but not at 6:59', () => {
    const conditions = detect([
      order({ id: 'critical', createdAt: '2026-08-25T11:53:00Z' }),
      order({ id: 'safe', createdAt: '2026-08-25T11:53:01Z' }),
    ]);

    expect(conditions.map((condition) => condition.key)).toEqual(['unassigned:critical']);
  });

  it('uses the server location timestamp and marks GPS stale at exactly 10:00', () => {
    const conditions = detect(
      [
        order({ id: 'critical', status: 'accepted', riderId: 'critical-rider' }),
        order({ id: 'safe', status: 'accepted', riderId: 'safe-rider' }),
      ],
      [
        rider({ id: 'critical-rider', lastLocationReceivedAt: '2026-08-25T11:50:00Z' }),
        rider({
          id: 'safe-rider',
          lastLocationReceivedAt: '2026-08-25T11:50:01Z',
          lastLocationUpdate: '2026-08-25T11:00:00Z',
        }),
      ],
    );

    expect(conditions.map((condition) => condition.key)).toEqual([
      'gps-stale:critical:critical-rider',
    ]);
  });

  it('falls back to device location time and treats invalid dates as stale', () => {
    const conditions = detect(
      [
        order({ id: 'fallback', status: 'accepted', riderId: 'fallback-rider' }),
        order({ id: 'invalid', status: 'accepted', riderId: 'invalid-rider' }),
      ],
      [
        rider({
          id: 'fallback-rider',
          lastLocationReceivedAt: null,
          lastLocationUpdate: '2026-08-25T11:59:00Z',
        }),
        rider({
          id: 'invalid-rider',
          lastLocationReceivedAt: 'not-a-date',
          lastLocationUpdate: null,
        }),
      ],
    );

    expect(conditions.map((condition) => condition.key)).toEqual([
      'gps-stale:invalid:invalid-rider',
    ]);
  });

  it('marks stopped transit at exactly 15:00 only below the movement threshold', () => {
    const orders = [
      order({ id: 'critical', status: 'picked_up', riderId: 'critical-rider' }),
      order({ id: 'too-recent', status: 'out_for_delivery', riderId: 'recent-rider' }),
      order({ id: 'moved-50', status: 'on_the_way', riderId: 'moved-rider' }),
      order({ id: 'not-transit', status: 'accepted', riderId: 'waiting-rider' }),
    ];
    const riders = orders.map((item) =>
      rider({ id: item.riderId!, lastLocationReceivedAt: '2026-08-25T11:59:00Z' }),
    );
    const movementByRiderId = {
      'critical-rider': movement('critical-rider', '2026-08-25T11:45:00Z', 49.99),
      'recent-rider': movement('recent-rider', '2026-08-25T11:45:01Z', 0),
      'moved-rider': movement('moved-rider', '2026-08-25T11:40:00Z', 50),
      'waiting-rider': movement('waiting-rider', '2026-08-25T11:40:00Z', 0),
    };

    const conditions = detect(orders, riders, movementByRiderId);

    expect(conditions.map((condition) => condition.key)).toEqual([
      'stopped-in-transit:critical:critical-rider',
    ]);
  });

  it('emits deterministic dispatch exhausted and normalized P2 conditions', () => {
    const conditions = detect([
      order({
        assignmentExhaustedAt: '2026-08-25T11:58:00Z',
        isOutsideZone: true,
        hasRepeatedRejections: true,
      }),
    ]);

    expect(conditions.map((condition) => condition.key)).toEqual([
      'unassigned:order-1',
      'dispatch-exhausted:order-1',
      'outside-zone:order-1',
      'repeated-rejections:order-1',
    ]);
    expect(conditions.every((condition) => !('coordinates' in condition.metadata))).toBe(true);
    expect(conditions.every((condition) => !('history' in condition.metadata))).toBe(true);
  });

  it('does not invent late-delivery SLA and snapshots can disable that rule', () => {
    const conditions = detect([order({ status: 'on_the_way', riderId: 'rider-1' })], [rider()]);
    const snapshot: MonitoringSnapshot = {
      generatedAt: now.toISOString(),
      health: { schema: 'degraded', disabledRules: ['late-delivery'] },
      thresholds,
      orders: [],
      riders: [],
      conditions,
      incidents: [],
      kpis: {
        openOrders: 0,
        unassigned: 0,
        onTheWay: 0,
        atRisk: 0,
        ridersOnline: 0,
        available: 0,
        occupied: 0,
        noSignal: 0,
      },
    };

    expect(conditions.some((condition) => condition.type === 'late-delivery')).toBe(false);
    expect(snapshot.health.disabledRules).toContain('late-delivery');
  });

  it('marks late delivery only when an expected timestamp exists', () => {
    const conditions = detect([
      order({
        id: 'late',
        status: 'on_the_way',
        riderId: 'rider-1',
        expectedDeliveryAt: '2026-08-25T11:59:59Z',
      }),
    ], [rider()]);

    expect(conditions.map((condition) => condition.key)).toContain('late-delivery:late');
  });
});

function movement(
  riderId: string,
  windowStartedAt: string,
  distanceMeters: number,
): RiderMovementWindow {
  return { riderId, windowStartedAt, windowEndedAt: now.toISOString(), distanceMeters };
}
