import { isInTransitStatus, isOpenOrderStatus } from './statuses';
import { isLocationStale } from './rules';
import type {
  DetectedCondition,
  MonitoringKpis,
  MonitoringOrder,
  MonitoringRider,
  MonitoringThresholds,
} from './types';

export function computeMonitoringKpis(
  orders: readonly MonitoringOrder[],
  riders: readonly MonitoringRider[],
  conditions: readonly DetectedCondition[],
  thresholds: MonitoringThresholds,
  now: Date,
): MonitoringKpis {
  const deduplicatedOrders = [...new Map(orders.map((order) => [order.id, order])).values()];
  const deduplicatedRiders = [...new Map(riders.map((rider) => [rider.id, rider])).values()];
  const riderIds = new Set(deduplicatedRiders.map((rider) => rider.id));
  const openOrders = deduplicatedOrders.filter((order) => isOpenOrderStatus(order.status));
  const openOrderIds = new Set(openOrders.map((order) => order.id));
  const activeRiderIds = new Set(
    openOrders.flatMap((order) => (order.riderId === null ? [] : [order.riderId])),
  );
  const atRiskOrderIds = new Set(
    conditions.flatMap((condition) =>
      condition.priority === 'P1' &&
      condition.orderId !== null &&
      openOrderIds.has(condition.orderId)
        ? [condition.orderId]
        : [],
    ),
  );

  let ridersOnline = 0;
  let available = 0;
  const occupied = activeRiderIds.size;
  let noSignal = [...activeRiderIds].filter((riderId) => !riderIds.has(riderId)).length;

  for (const rider of deduplicatedRiders) {
    const hasActiveOrder = activeRiderIds.has(rider.id);
    const stale = isLocationStale(rider, thresholds.gpsStaleCriticalMinutes, now);
    const online = !stale && (rider.activeForOrders || hasActiveOrder);

    if (online) ridersOnline += 1;
    if (online && rider.activeForOrders && !hasActiveOrder) available += 1;
    if ((rider.activeForOrders || hasActiveOrder) && stale) noSignal += 1;
  }

  return {
    openOrders: openOrders.length,
    unassigned: openOrders.filter(
      (order) => order.status === 'pending_acceptance' && order.riderId === null,
    ).length,
    onTheWay: openOrders.filter((order) => isInTransitStatus(order.status)).length,
    atRisk: atRiskOrderIds.size,
    ridersOnline,
    available,
    occupied,
    noSignal,
  };
}
