import { z } from 'zod';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { computeMonitoringKpis } from './kpis';
import { createSupabaseIncidentStore, reconcileMonitoringIncidents, type SupabaseIncidentClient } from './incident-repository';
import { detectMonitoringConditions } from './rules';
import { isInTransitStatus, isTerminalOrderStatus } from './statuses';
import type {
  DetectedCondition,
  MonitoringConditionType,
  MonitoringFilter,
  MonitoringIncident,
  MonitoringOrder,
  MonitoringRider,
  MonitoringSnapshot,
  MonitoringThresholds,
  RiderMovementWindow,
} from './types';
import type { OrderStatus } from '@/types';

const orderStatuses = [
  'pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup',
  'picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination',
  'delivered', 'completed', 'cancelled', 'refunded', 'failed',
] as const satisfies readonly OrderStatus[];
const riskSchema = z.enum(['all', 'atRisk', 'unassigned', 'onTheWay', 'available', 'occupied', 'noSignal']);
const text = (max: number) => z.string().trim().min(1).max(max).optional();
export const monitoringFilterSchema = z.object({
  zoneId: text(100), risk: riskSchema.optional(), riderId: text(100),
  orderStatus: z.enum(orderStatuses).optional(), search: text(100),
}).strict();

export function parseMonitoringFilter(params: URLSearchParams): MonitoringFilter {
  return monitoringFilterSchema.parse(Object.fromEntries(params.entries()));
}

type DbError = { code?: string; message?: string };
type DbResponse<T> = { data: T | null; error: DbError | null };
export type MonitoringOrderRow = Record<string, unknown>;
export type MonitoringRiderRow = Record<string, unknown>;
export type MovementRow = Record<string, unknown>;
export type SettingsRow = Record<string, unknown>;

export interface MonitoringSnapshotRepositories {
  fetchSettings(): Promise<DbResponse<SettingsRow>>;
  fetchActiveOrders(): Promise<DbResponse<MonitoringOrderRow[]>>;
  fetchRelevantRiders(riderIds: readonly string[]): Promise<DbResponse<MonitoringRiderRow[]>>;
  fetchMovementHistory(riderIds: readonly string[], since: string): Promise<DbResponse<MovementRow[]>>;
  reconcileIncidents(
    conditions: readonly DetectedCondition[],
    evaluatedTypes: readonly MonitoringConditionType[],
    now: Date,
  ): Promise<MonitoringIncident[]>;
}

export type BuildMonitoringSnapshotInput = {
  filter?: MonitoringFilter;
  now?: Date;
  repositories?: MonitoringSnapshotRepositories;
};

const FALLBACKS = { unassignedCriticalMinutes: 7, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 15, meaningfulMovementMeters: 50 } as const;

export async function buildMonitoringSnapshot(input: BuildMonitoringSnapshotInput = {}): Promise<MonitoringSnapshot> {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid monitoring snapshot timestamp');
  const repositories = input.repositories ?? createSupabaseSnapshotRepositories();
  const health = { schema: 'healthy' as 'healthy' | 'degraded', disabledRules: [] as string[] };
  const settingResult = await repositories.fetchSettings();
  let thresholds: MonitoringThresholds;
  if (settingResult.error) {
    if (!isSchemaError(settingResult.error)) throw new Error('Unable to load monitoring snapshot');
    thresholds = { ...FALLBACKS, source: 'fallback' };
    health.schema = 'degraded';
  } else {
    thresholds = readThresholds(settingResult.data);
    if (thresholds.source === 'fallback') health.schema = 'degraded';
  }

  const orderResult = await repositories.fetchActiveOrders();
  if (orderResult.error || !orderResult.data) throw new Error('Unable to load monitoring snapshot');
  const orders = orderResult.data.map(normalizeOrder).filter((order) => !isTerminalOrderStatus(order.status));
  const assignedRiderIds = [...new Set(orders.flatMap((order) => order.riderId ? [order.riderId] : []))];
  const riderResult = await repositories.fetchRelevantRiders(assignedRiderIds);
  if (riderResult.error || !riderResult.data) throw new Error('Unable to load monitoring snapshot');
  const riders = riderResult.data.map(normalizeRider);
  const inTransitRiderIds = [...new Set(orders.filter((order) => order.riderId && isInTransitStatus(order.status)).map((order) => order.riderId!))];
  let movementByRiderId: Record<string, RiderMovementWindow | undefined> = {};
  const evaluatedTypes = new Set<MonitoringConditionType>(['unassigned', 'gps-stale', 'dispatch-exhausted']);
  for (const type of ['late-delivery', 'outside-zone', 'repeated-rejections', 'irregular-reporting'] as const) {
    if (orders.some((order) => type === 'late-delivery' ? order.expectedDeliveryAt !== null : type === 'outside-zone' ? order.isOutsideZone !== undefined : type === 'repeated-rejections' ? order.hasRepeatedRejections !== undefined : riders.some((rider) => rider.hasIrregularReporting !== undefined))) evaluatedTypes.add(type);
    else health.disabledRules.push(type);
  }
  if (inTransitRiderIds.length > 0) {
    const movementResult = await repositories.fetchMovementHistory(inTransitRiderIds, new Date(now.getTime() - Math.max(thresholds.stoppedInTransitMinutes, thresholds.gpsStaleCriticalMinutes) * 60_000).toISOString());
    if (movementResult.error) {
      if (!isSchemaError(movementResult.error)) throw new Error('Unable to load monitoring snapshot');
      health.schema = 'degraded';
      health.disabledRules.push('stopped-in-transit');
    } else {
      if (movementResult.data) movementByRiderId = buildMovementWindows(movementResult.data, inTransitRiderIds);
      evaluatedTypes.add('stopped-in-transit');
    }
  } else evaluatedTypes.add('stopped-in-transit');

  const conditions = detectMonitoringConditions({ orders, riders, movementByRiderId }, thresholds, now)
    .filter((condition) => evaluatedTypes.has(condition.type));
  const incidents = await repositories.reconcileIncidents(conditions, [...evaluatedTypes], now);
  const kpis = computeMonitoringKpis(orders, riders, conditions, thresholds, now);
  const filtered = applyFilter(orders, riders, incidents, input.filter);
  return { serverTimestamp: now.toISOString(), dataHealth: health, thresholds, kpis, incidents: filtered.incidents, orders: filtered.orders, riders: filtered.riders };
}

function readThresholds(row: SettingsRow | null): MonitoringThresholds {
  const values = {
    unassignedCriticalMinutes: settingValue(row, ['monitoring_unassigned_critical_minutes', 'unassigned_critical_minutes'], FALLBACKS.unassignedCriticalMinutes),
    gpsStaleCriticalMinutes: settingValue(row, ['monitoring_gps_stale_critical_minutes', 'gps_stale_critical_minutes'], FALLBACKS.gpsStaleCriticalMinutes),
    stoppedInTransitMinutes: settingValue(row, ['monitoring_stopped_in_transit_minutes', 'stopped_in_transit_minutes'], FALLBACKS.stoppedInTransitMinutes),
    meaningfulMovementMeters: settingValue(row, ['monitoring_meaningful_movement_meters', 'meaningful_movement_meters'], FALLBACKS.meaningfulMovementMeters),
  };
  const source = row && Object.keys(row).some((key) => key.startsWith('monitoring_') || key.endsWith('_critical_minutes') || key === 'meaningful_movement_meters') ? 'settings' : 'fallback';
  return { ...values, source };
}
function settingValue(row: SettingsRow | null, keys: readonly string[], fallback: number): number { for (const key of keys) { const value = finitePositive(row?.[key], fallback); if (row?.[key] !== undefined) return value; } return fallback; }
function finitePositive(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback; }
function normalizeOrder(row: MonitoringOrderRow): MonitoringOrder {
  const status = row.status;
  if (typeof row.id !== 'string' || !orderStatuses.includes(status as OrderStatus)) throw new Error('Unable to load monitoring snapshot');
  return { id: row.id, zoneId: stringOrNull(row.zone_id), status: status as OrderStatus, riderId: typeof row.rider_id === 'string' ? row.rider_id : null, createdAt: stringOrNull(row.created_at), expectedDeliveryAt: stringOrNull(row.expected_delivery_at), assignmentExhaustedAt: stringOrNull(row.assignment_exhausted_at), assignmentAttemptsExhausted: boolOrUndefined(row.assignment_attempts_exhausted), isOutsideZone: boolOrUndefined(row.is_outside_zone), hasRepeatedRejections: boolOrUndefined(row.has_repeated_rejections) };
}
function normalizeRider(row: MonitoringRiderRow): MonitoringRider {
  if (typeof row.id !== 'string') throw new Error('Unable to load monitoring snapshot');
  return { id: row.id, zoneId: stringOrNull(row.zone_id), activeForOrders: row.is_active_for_orders === true, lastLocationReceivedAt: stringOrNull(row.last_location_received_at), lastLocationUpdate: stringOrNull(row.last_location_update), hasIrregularReporting: boolOrUndefined(row.has_irregular_reporting) };
}
function stringOrNull(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value : null; }
function boolOrUndefined(value: unknown): boolean | undefined { return typeof value === 'boolean' ? value : undefined; }
function isSchemaError(error: DbError): boolean {
  return error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST200' ||
    error.message === 'Could not find the table in the schema cache' ||
    error.message === 'Could not find the column in the schema cache' ||
    /^Could not find the '.+' column of '.+' in the schema cache$/.test(error.message ?? '');
}
function buildMovementWindows(rows: MovementRow[], riderIds: readonly string[]): Record<string, RiderMovementWindow | undefined> {
  const result: Record<string, RiderMovementWindow | undefined> = {};
  for (const riderId of riderIds) { const values = rows.filter((row) => row.rider_id === riderId && typeof row.recorded_at === 'string'); const first = values[0]; const last = values[values.length - 1]; result[riderId] = { riderId, windowStartedAt: stringOrNull(first?.recorded_at), windowEndedAt: stringOrNull(last?.recorded_at), distanceMeters: values.reduce((sum, row) => sum + (typeof row.distance_meters === 'number' && Number.isFinite(row.distance_meters) ? row.distance_meters : 0), 0) }; }
  return result;
}
function applyFilter(orders: MonitoringOrder[], riders: MonitoringRider[], incidents: MonitoringIncident[], filter?: MonitoringFilter) {
  if (!filter) return { orders, riders, incidents };
  const orderIds = new Set(orders.filter((order) => (!filter.zoneId || order.zoneId === filter.zoneId) && (!filter.orderStatus || order.status === filter.orderStatus) && (!filter.riderId || order.riderId === filter.riderId) && (!filter.search || order.id.includes(filter.search))).map((order) => order.id));
  const riderIds = new Set(riders.filter((rider) => (!filter.zoneId || rider.zoneId === filter.zoneId) && (!filter.riderId || rider.id === filter.riderId)).map((rider) => rider.id));
  let selectedOrders = orders.filter((order) => orderIds.has(order.id));
  if (filter.risk === 'unassigned') selectedOrders = selectedOrders.filter((order) => order.status === 'pending_acceptance' && order.riderId === null);
  if (filter.risk === 'onTheWay') selectedOrders = selectedOrders.filter((order) => isInTransitStatus(order.status));
  if (filter.risk === 'atRisk') { const ids = new Set(incidents.filter((incident) => incident.priority === 'P1').map((incident) => incident.orderId)); selectedOrders = selectedOrders.filter((order) => ids.has(order.id)); }
  if (filter.risk === 'noSignal') selectedOrders = selectedOrders.filter((order) => incidents.some((incident) => incident.type === 'gps-stale' && incident.orderId === order.id));
  const selectedOrderIds = new Set(selectedOrders.map((order) => order.id));
  return { orders: selectedOrders, riders: riders.filter((rider) => riderIds.has(rider.id) && (filter.risk !== 'available' || rider.activeForOrders) && (filter.risk !== 'occupied' || selectedOrders.some((order) => order.riderId === rider.id))), incidents: incidents.filter((incident) => (incident.orderId === null || selectedOrderIds.has(incident.orderId)) && (incident.riderId === null || riderIds.has(incident.riderId))) };
}

type Query = { select(value: string): Query; maybeSingle(): Query; eq(column: string, value: unknown): Query; in(column: string, values: readonly string[]): Query; gte(column: string, value: string): Query; not(column: string, operator: string, value: string): Query; or(filters: string): Query; then<TResult1 = DbResponse<unknown>, TResult2 = never>(onfulfilled?: ((value: DbResponse<unknown>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> };
export function createSupabaseSnapshotRepositories(): MonitoringSnapshotRepositories {
  const client = createSupabaseAdminClient() as unknown as { from(table: string): Query; rpc(functionName: string, params: Record<string, unknown>): unknown };
  const query = async <T>(table: string, select: string, configure?: (query: Query) => Query): Promise<DbResponse<T>> => { let current = client.from(table).select(select); if (configure) current = configure(current); return await current as unknown as DbResponse<T>; };
  const incidentStore = createSupabaseIncidentStore(client as SupabaseIncidentClient);
  const optional = async <T>(table: string, select: string, base: T, configure?: (q: Query) => Query): Promise<T> => {
    const result = await query<T>(table, select, configure);
    if (result.error) {
      if (isSchemaError(result.error)) return base;
      throw new Error('Unable to load monitoring snapshot');
    }
    return result.data ?? base;
  };
  const fetchSettings = (): Promise<DbResponse<SettingsRow>> => query<SettingsRow>('system_settings', 'monitoring_unassigned_critical_minutes,monitoring_gps_stale_critical_minutes,monitoring_stopped_in_transit_minutes,monitoring_meaningful_movement_meters', (q) => q.maybeSingle());
  const fetchActiveOrders = async (): Promise<DbResponse<MonitoringOrderRow[]>> => {
    const base = await query<MonitoringOrderRow[]>('orders', 'id,status,rider_id,created_at', (q) => q.not('status', 'in', '(completed,delivered,cancelled,refunded,failed)'));
    if (base.error || !base.data) return base;
    const enrichment = await optional<MonitoringOrderRow[]>('orders', 'id,zone_id,expected_delivery_at,assignment_exhausted_at,assignment_attempts_exhausted,is_outside_zone,has_repeated_rejections', [], (q) => q.not('status', 'in', '(completed,delivered,cancelled,refunded,failed)'));
    const byId = new Map(enrichment.filter((row) => typeof row.id === 'string').map((row) => [row.id as string, row]));
    return { data: base.data.map((row) => ({ ...row, ...(byId.get(row.id as string) ?? {}) })), error: null };
  };
  const fetchRelevantRiders = async (ids: readonly string[]): Promise<DbResponse<MonitoringRiderRow[]>> => {
    const base = await query<MonitoringRiderRow[]>('riders', 'id,is_active_for_orders,last_location_update', (q) => ids.length ? q.or(`is_active_for_orders.eq.true,id.in.(${ids.join(',')})`) : q.eq('is_active_for_orders', true));
    if (base.error || !base.data) return base;
    const enrichment = await optional<MonitoringRiderRow[]>('riders', 'id,last_location_received_at,has_irregular_reporting,zone_id', [], (q) => ids.length ? q.or(`is_active_for_orders.eq.true,id.in.(${ids.join(',')})`) : q.eq('is_active_for_orders', true));
    const byId = new Map(enrichment.filter((row) => typeof row.id === 'string').map((row) => [row.id as string, row]));
    return { data: base.data.map((row) => ({ ...row, ...(byId.get(row.id as string) ?? {}) })), error: null };
  };
  return { fetchSettings, fetchActiveOrders, fetchRelevantRiders, fetchMovementHistory: (ids, since) => query<MovementRow[]>('rider_location_history', 'rider_id,recorded_at,distance_meters', (q) => q.in('rider_id', ids).gte('recorded_at', since)), reconcileIncidents: (conditions, evaluated, snapshotNow) => reconcileMonitoringIncidents(incidentStore, conditions, evaluated, snapshotNow) };
}
