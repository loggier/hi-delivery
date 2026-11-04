import { describe, expect, it } from 'vitest';
import {
  delayMinutes,
  dispatchCandidates,
  formatKm,
  groupOpenOrdersByRider,
  riderOperationalState,
  shortOrderCode,
  sortOrdersByPriority,
  trackingSteps,
} from '@/app/(admin)/monitoring/_lib/view-model';
import type { MonitoringIncident, MonitoringOrder, MonitoringRider, MonitoringThresholds } from '@/lib/monitoring/types';

const NOW = Date.parse('2026-08-26T12:00:00.000Z');
const FRESH = '2026-08-26T11:59:00.000Z';
const STALE = '2026-08-26T11:00:00.000Z';
const thresholds: MonitoringThresholds = { unassignedCriticalMinutes: 7, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 15, meaningfulMovementMeters: 50, source: 'settings' };

function order(overrides: Partial<MonitoringOrder> & { id: string }): MonitoringOrder {
  return { status: 'pending_acceptance', riderId: null, createdAt: '2026-08-26T11:50:00.000Z', expectedDeliveryAt: null, assignmentExhaustedAt: null, pickup: { latitude: 19.43, longitude: -99.13 }, delivery: null, ...overrides };
}

function rider(overrides: Partial<MonitoringRider> & { id: string }): MonitoringRider {
  return { activeForOrders: true, lastLocationReceivedAt: FRESH, lastLocationUpdate: FRESH, latitude: 19.43, longitude: -99.13, ...overrides };
}

describe('riderOperationalState', () => {
  it('reports stale location before any activity', () => {
    expect(riderOperationalState(rider({ id: 'r1', lastLocationReceivedAt: STALE }), [order({ id: 'o1', status: 'picked_up', riderId: 'r1' })], 10, NOW)).toBe('sin_senal');
  });

  it('distinguishes en ruta, ocupado, disponible and no disponible', () => {
    const transit = order({ id: 'o1', status: 'on_the_way', riderId: 'r1' });
    const prep = order({ id: 'o2', status: 'cooking', riderId: 'r1' });
    expect(riderOperationalState(rider({ id: 'r1' }), [transit], 10, NOW)).toBe('en_ruta');
    expect(riderOperationalState(rider({ id: 'r1' }), [prep], 10, NOW)).toBe('ocupado');
    expect(riderOperationalState(rider({ id: 'r1' }), [], 10, NOW)).toBe('disponible');
    expect(riderOperationalState(rider({ id: 'r1', activeForOrders: false }), [], 10, NOW)).toBe('no_disponible');
  });
});

describe('order priority and delay', () => {
  it('sorts P1 incidents first, then by delay', () => {
    const incidents: MonitoringIncident[] = [{ id: 1, conditionKey: 'k', type: 'gps-stale', priority: 'P1', status: 'open', orderId: 'b', riderId: null, firstDetectedAt: FRESH, lastDetectedAt: FRESH, attendingAt: null, resolvedAt: null, metadata: {} }];
    const sorted = sortOrdersByPriority([order({ id: 'a' }), order({ id: 'b' })], incidents, thresholds, NOW);
    expect(sorted.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('exposes delay only for unassigned orders over the configured threshold', () => {
    expect(delayMinutes(order({ id: 'a', createdAt: '2026-08-26T11:50:00.000Z' }), thresholds, NOW)).toBe(3);
    expect(delayMinutes(order({ id: 'a', createdAt: '2026-08-26T11:55:00.000Z' }), thresholds, NOW)).toBeNull();
    expect(delayMinutes(order({ id: 'a', riderId: 'r1', status: 'accepted', createdAt: '2026-08-26T11:00:00.000Z' }), thresholds, NOW)).toBeNull();
  });
});

describe('dispatchCandidates', () => {
  it('returns only real available riders with fresh location, nearest first', () => {
    const target = order({ id: 'o1', riderId: 'busy-rider' });
    const riders = [
      rider({ id: 'near', latitude: 19.431, longitude: -99.131 }),
      rider({ id: 'far', latitude: 19.5, longitude: -99.2 }),
      rider({ id: 'stale', lastLocationReceivedAt: STALE, lastLocationUpdate: STALE }),
      rider({ id: 'paused', activeForOrders: false }),
      rider({ id: 'busy', latitude: 19.43, longitude: -99.13 }),
      rider({ id: 'busy-rider', latitude: 19.43, longitude: -99.13 }),
    ];
    const ordersByRider = groupOpenOrdersByRider([order({ id: 'x', riderId: 'busy', status: 'cooking' })]);
    const result = dispatchCandidates(target, riders, ordersByRider, 10, NOW);
    expect(result.map((item) => item.rider.id)).toEqual(['near', 'far']);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });

  it('returns an empty list when no rider qualifies, so the UI hides the block', () => {
    expect(dispatchCandidates(order({ id: 'o1' }), [rider({ id: 'r1', activeForOrders: false })], new Map(), 10, NOW)).toEqual([]);
  });
});

describe('tracking and formatting', () => {
  it('marks stages from the real order status', () => {
    const steps = trackingSteps(order({ id: 'o1', status: 'picked_up', riderId: 'r1' }));
    expect(steps.find((step) => step.state === 'current')?.label).toBe('Pedido recogido');
    expect(steps[0].state).toBe('done');
  });

  it('shows missing values as not available, never as zero', () => {
    expect(formatKm(null)).toBe('No disponible');
    expect(formatKm(2.44)).toBe('2.4 km');
    expect(shortOrderCode('abcdef1234')).toBe('#ABCDEF12');
  });
});
