import { isInTransitStatus, isOpenOrderStatus } from './statuses';
import type {
  DetectedCondition,
  MonitoringConditionMetadata,
  MonitoringConditionType,
  MonitoringOrder,
  MonitoringPriority,
  MonitoringRider,
  MonitoringRuleInput,
  MonitoringThresholds,
} from './types';

const MILLISECONDS_PER_MINUTE = 60_000;

export function detectMonitoringConditions(
  input: MonitoringRuleInput,
  thresholds: MonitoringThresholds,
  now: Date,
): DetectedCondition[] {
  const conditions: DetectedCondition[] = [];
  const ridersById = new Map(input.riders.map((rider) => [rider.id, rider]));

  for (const order of input.orders) {
    if (!isOpenOrderStatus(order.status)) continue;

    if (
      order.status === 'pending_acceptance' &&
      order.riderId === null &&
      isAtLeastMinutesOld(order.createdAt, thresholds.unassignedCriticalMinutes, now)
    ) {
      conditions.push(createCondition('unassigned', 'P1', order, null, now, {}));
    }

    if (order.riderId !== null) {
      const rider = ridersById.get(order.riderId);
      if (isLocationStale(rider, thresholds.gpsStaleCriticalMinutes, now)) {
        conditions.push(createCondition('gps-stale', 'P1', order, order.riderId, now, {}));
      }

      const movement = input.movementByRiderId[order.riderId];
      if (
        isInTransitStatus(order.status) &&
        movement !== undefined &&
        isAtLeastMinutesOld(
          movement.windowStartedAt,
          thresholds.stoppedInTransitMinutes,
          now,
        ) &&
        movement.distanceMeters !== null &&
        Number.isFinite(movement.distanceMeters) &&
        movement.distanceMeters < thresholds.meaningfulMovementMeters
      ) {
        conditions.push(
          createCondition('stopped-in-transit', 'P1', order, order.riderId, now, {
            distanceMeters: movement.distanceMeters,
          }),
        );
      }
    }

    if (hasValidDate(order.assignmentExhaustedAt) || order.assignmentAttemptsExhausted === true) {
      conditions.push(createCondition('dispatch-exhausted', 'P1', order, null, now, {}));
    }

    const expectedDeliveryTime = parseTimestamp(order.expectedDeliveryAt);
    if (expectedDeliveryTime !== null && now.getTime() > expectedDeliveryTime) {
      conditions.push(createCondition('late-delivery', 'P1', order, order.riderId, now, {}));
    }

    if (order.isOutsideZone === true) {
      conditions.push(createCondition('outside-zone', 'P2', order, order.riderId, now, {}));
    }

    if (order.hasRepeatedRejections === true) {
      conditions.push(createCondition('repeated-rejections', 'P2', order, order.riderId, now, {}));
    }
  }

  for (const rider of input.riders) {
    if (rider.hasIrregularReporting === true) {
      conditions.push({
        key: `irregular-reporting:${rider.id}`,
        type: 'irregular-reporting',
        priority: 'P2',
        orderId: null,
        riderId: rider.id,
        detectedAt: now.toISOString(),
        metadata: {},
      });
    }
  }

  return conditions;
}

export function getRiderLocationTimestamp(rider: MonitoringRider | undefined): string | null {
  if (hasValidDate(rider?.lastLocationReceivedAt)) return rider!.lastLocationReceivedAt;
  if (hasValidDate(rider?.lastLocationUpdate)) return rider!.lastLocationUpdate;
  return null;
}

export function isLocationStale(
  rider: MonitoringRider | undefined,
  staleMinutes: number,
  now: Date,
): boolean {
  const locationTimestamp = getRiderLocationTimestamp(rider);
  return locationTimestamp === null || isAtLeastMinutesOld(locationTimestamp, staleMinutes, now);
}

function createCondition(
  type: MonitoringConditionType,
  priority: MonitoringPriority,
  order: MonitoringOrder,
  riderId: string | null,
  now: Date,
  metadata: MonitoringConditionMetadata,
): DetectedCondition {
  return {
    key: conditionKey(type, order.id, riderId),
    type,
    priority,
    orderId: order.id,
    riderId,
    detectedAt: now.toISOString(),
    metadata,
  };
}

function conditionKey(type: MonitoringConditionType, orderId: string, riderId: string | null): string {
  if (type === 'gps-stale' || type === 'stopped-in-transit') {
    return `${type}:${orderId}:${riderId}`;
  }
  return `${type}:${orderId}`;
}

function isAtLeastMinutesOld(value: string | null, minutes: number, now: Date): boolean {
  const timestamp = parseTimestamp(value);
  return timestamp !== null && now.getTime() - timestamp >= minutes * MILLISECONDS_PER_MINUTE;
}

function hasValidDate(value: string | null | undefined): value is string {
  return parseTimestamp(value ?? null) !== null;
}

function parseTimestamp(value: string | null): number | null {
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
