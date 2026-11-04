import { isInTransitStatus } from '@/lib/monitoring/statuses';
import type {
  MonitoringIncident,
  MonitoringOrder,
  MonitoringPriority,
  MonitoringRider,
  MonitoringThresholds,
} from '@/lib/monitoring/types';

// Pure mapping from the monitoring snapshot to what the operations desk shows.
// Nothing here invents data: when a value is not in the snapshot the helpers return null
// and the UI renders "No disponible" instead of a zero.

export type RiderOperationalState = 'en_ruta' | 'ocupado' | 'disponible' | 'sin_senal' | 'no_disponible';
export type ToneKey = 'neutral' | 'blue' | 'amber' | 'red' | 'green' | 'slate';

export const RIDER_STATE_META: Record<RiderOperationalState, { label: string; tone: ToneKey }> = {
  en_ruta: { label: 'En ruta', tone: 'blue' },
  ocupado: { label: 'Ocupado', tone: 'amber' },
  disponible: { label: 'Disponible', tone: 'green' },
  sin_senal: { label: 'Sin señal', tone: 'red' },
  no_disponible: { label: 'No disponible', tone: 'slate' },
};

const PRIORITY_RANK: Record<MonitoringPriority, number> = { P1: 1, P2: 2, P3: 3 };
const PRIORITY_LABEL: Record<MonitoringPriority, string> = { P1: 'Crítica', P2: 'Alta', P3: 'Media' };

const TRACKING_STEPS: ReadonlyArray<{ label: string; at: number }> = [
  { label: 'Aceptado por repartidor', at: 1 },
  { label: 'Pedido aceptado por el restaurante', at: 2 },
  { label: 'Listo para recoger', at: 3 },
  { label: 'Pedido recogido', at: 4 },
  { label: 'En ruta al cliente', at: 5 },
  { label: 'Llegó con el cliente', at: 6 },
  { label: 'Entregado', at: 7 },
];

const ORDER_STAGE: Record<string, number> = {
  pending_acceptance: 0,
  accepted: 1,
  at_store: 2,
  cooking: 2,
  ready_for_pickup: 3,
  picked_up: 4,
  out_for_delivery: 5,
  on_the_way: 5,
  arrived_at_destination: 6,
  delivered: 7,
  completed: 7,
};

export function isValidCoordinate(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function shortOrderCode(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

export function riderFullName(rider: Pick<MonitoringRider, 'firstName' | 'lastName'> | null | undefined): string {
  const name = `${rider?.firstName ?? ''} ${rider?.lastName ?? ''}`.trim();
  return name || 'Repartidor';
}

export function riderInitials(rider: Pick<MonitoringRider, 'firstName' | 'lastName'> | null | undefined): string {
  return `${rider?.firstName?.[0] ?? ''}${rider?.lastName?.[0] ?? ''}`.toUpperCase() || 'R';
}

function locationTimestamp(rider: MonitoringRider): number {
  return Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
}

export function riderSignalIsStale(rider: MonitoringRider, staleMinutes: number, now: number): boolean {
  const timestamp = locationTimestamp(rider);
  return !Number.isFinite(timestamp) || now - timestamp > staleMinutes * 60_000;
}

export function lastUpdateLabel(iso: string | null | undefined, now: number): string {
  const timestamp = Date.parse(iso ?? '');
  if (!Number.isFinite(timestamp)) return 'Sin ubicación';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'Hace <1 min';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1_440) return `Hace ${Math.floor(minutes / 60)} h`;
  return `Hace ${Math.floor(minutes / 1_440)} d`;
}

export function formatClock(iso: string | null | undefined): string | null {
  const timestamp = Date.parse(iso ?? '');
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function orderStatusLabel(order: MonitoringOrder): { label: string; tone: ToneKey } {
  switch (order.status) {
    case 'pending_acceptance':
      return order.riderId === null ? { label: 'Sin asignar', tone: 'red' } : { label: 'Esperando aceptación', tone: 'amber' };
    case 'accepted': return { label: 'Asignado', tone: 'blue' };
    case 'at_store': return { label: 'En negocio', tone: 'blue' };
    case 'cooking': return { label: 'Preparando', tone: 'blue' };
    case 'ready_for_pickup': return { label: 'Listo para recoger', tone: 'green' };
    case 'picked_up': return { label: 'Recogido', tone: 'blue' };
    case 'out_for_delivery':
    case 'on_the_way': return { label: 'En camino', tone: 'blue' };
    case 'arrived_at_destination': return { label: 'En destino', tone: 'green' };
    case 'delivered':
    case 'completed': return { label: 'Entregado', tone: 'green' };
    default: return { label: 'En proceso', tone: 'neutral' };
  }
}

export function orderIsInTransit(order: MonitoringOrder): boolean {
  return isInTransitStatus(order.status);
}

export function groupOpenOrdersByRider(orders: readonly MonitoringOrder[]): Map<string, MonitoringOrder[]> {
  const byRider = new Map<string, MonitoringOrder[]>();
  for (const order of orders) {
    if (!order.riderId) continue;
    const list = byRider.get(order.riderId) ?? [];
    list.push(order);
    byRider.set(order.riderId, list);
  }
  return byRider;
}

export function riderOperationalState(
  rider: MonitoringRider,
  openOrders: readonly MonitoringOrder[],
  staleMinutes: number,
  now: number,
): RiderOperationalState {
  if (riderSignalIsStale(rider, staleMinutes, now)) return 'sin_senal';
  if (openOrders.some(orderIsInTransit)) return 'en_ruta';
  if (openOrders.length > 0) return 'ocupado';
  if (rider.activeForOrders) return 'disponible';
  return 'no_disponible';
}

export function highestPriorityForOrder(orderId: string, incidents: readonly MonitoringIncident[]): MonitoringPriority | null {
  let best: MonitoringPriority | null = null;
  for (const incident of incidents) {
    if (incident.orderId !== orderId) continue;
    if (best === null || PRIORITY_RANK[incident.priority] < PRIORITY_RANK[best]) best = incident.priority;
  }
  return best;
}

export function priorityLabel(priority: MonitoringPriority): string {
  return PRIORITY_LABEL[priority];
}

export function elapsedMinutes(createdAt: string | null, now: number): number | null {
  const timestamp = Date.parse(createdAt ?? '');
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now - timestamp) / 60_000));
}

// The snapshot does not carry a per-order SLA. The only real time commitment available is the
// configured unassigned threshold, so it is exposed for orders still waiting for a rider.
export function assignmentSlaMinutes(order: MonitoringOrder, thresholds: MonitoringThresholds): number | null {
  return order.riderId === null && order.status === 'pending_acceptance' ? thresholds.unassignedCriticalMinutes : null;
}

export function delayMinutes(order: MonitoringOrder, thresholds: MonitoringThresholds, now: number): number | null {
  const sla = assignmentSlaMinutes(order, thresholds);
  const elapsed = elapsedMinutes(order.createdAt, now);
  if (sla === null || elapsed === null || elapsed <= sla) return null;
  return elapsed - sla;
}

export function sortOrdersByPriority(
  orders: readonly MonitoringOrder[],
  incidents: readonly MonitoringIncident[],
  thresholds: MonitoringThresholds,
  now: number,
): MonitoringOrder[] {
  const rank = (order: MonitoringOrder) => {
    const priority = highestPriorityForOrder(order.id, incidents);
    return priority ? PRIORITY_RANK[priority] : 4;
  };
  return [...orders].sort((left, right) =>
    rank(left) - rank(right)
    || (delayMinutes(right, thresholds, now) ?? -1) - (delayMinutes(left, thresholds, now) ?? -1)
    || (elapsedMinutes(right.createdAt, now) ?? -1) - (elapsedMinutes(left.createdAt, now) ?? -1)
    || left.id.localeCompare(right.id));
}

export function haversineKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const radians = Math.PI / 180;
  const dLat = (to.latitude - from.latitude) * radians;
  const dLng = (to.longitude - from.longitude) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function straightLineKm(rider: MonitoringRider, point: { latitude: number; longitude: number } | null | undefined): number | null {
  const riderLat = rider.latitude;
  const riderLng = rider.longitude;
  if (!point || riderLat === undefined || riderLng === undefined) return null;
  if (!isValidCoordinate(riderLat, riderLng) || !isValidCoordinate(point.latitude, point.longitude)) return null;
  return haversineKm({ latitude: riderLat, longitude: riderLng }, point);
}

export type DispatchCandidate = { rider: MonitoringRider; distanceKm: number };

// Candidates are only real riders from the snapshot: active for orders, no open order,
// fresh location and coordinates. Returns an empty list when nothing qualifies.
export function dispatchCandidates(
  order: MonitoringOrder,
  riders: readonly MonitoringRider[],
  ordersByRider: ReadonlyMap<string, readonly MonitoringOrder[]>,
  staleMinutes: number,
  now: number,
  limit = 4,
): DispatchCandidate[] {
  if (!order.pickup || !isValidCoordinate(order.pickup.latitude, order.pickup.longitude)) return [];
  const pickup = order.pickup;
  return riders
    .filter((rider) => rider.id !== order.riderId
      && rider.activeForOrders
      && isValidCoordinate(rider.latitude, rider.longitude)
      && !riderSignalIsStale(rider, staleMinutes, now)
      && (ordersByRider.get(rider.id)?.length ?? 0) === 0)
    .map((rider) => ({ rider, distanceKm: haversineKm({ latitude: rider.latitude as number, longitude: rider.longitude as number }, pickup) }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, limit);
}

export type TrackingStep = { label: string; state: 'done' | 'current' | 'pending' };

export function trackingSteps(order: MonitoringOrder): TrackingStep[] {
  const stage = ORDER_STAGE[order.status] ?? 0;
  const created: TrackingStep = { label: 'Pedido creado', state: 'done' };
  const steps = TRACKING_STEPS.map<TrackingStep>((step) => ({
    label: step.label,
    state: step.at < stage ? 'done' : step.at === stage ? 'current' : 'pending',
  }));
  return [created, ...steps];
}

export function formatKm(value: number | null): string {
  if (value === null) return 'No disponible';
  return value < 10 ? `${value.toFixed(1)} km` : `${Math.round(value)} km`;
}
