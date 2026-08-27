import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const activeStatuses = ['pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination'];
type Client = ReturnType<typeof createSupabaseAdminClient>;

function distanceKm(a: number, b: number, c: number, d: number) {
  const radians = Math.PI / 180;
  const x = (c - a) * radians;
  const y = (d - b) * radians;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * radians) * Math.cos(c * radians) * Math.sin(y / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function dispatchRpc(client: Client, orderId: string) {
  let lastError: unknown;
  for (const params of [{ order_id_in: orderId }, { p_order_id: orderId }, { order_id: orderId }]) {
    const { error } = await client.rpc('dispatch_order', params);
    if (!error) return;
    lastError = error;
  }
  throw new Error(lastError instanceof Error ? lastError.message : 'No se pudo ejecutar dispatch_order.');
}

export async function redispatchOrder(orderId: string, client = createSupabaseAdminClient()) {
  try {
    await dispatchRpc(client, orderId);
    return { selectedRiderCount: null as number | null, rpc: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('dispatch_order') && !message.includes('function') && !message.includes('schema cache')) throw error;
  }

  const { data: order, error: orderError } = await client.from('orders').select('id, rider_id, status, pickup_address, rejected_riders, notified_riders, dispatch_attempt_count').eq('id', orderId).maybeSingle();
  if (orderError || !order) throw new Error('No se encontró la orden.');
  const { data: settings } = await client.from('system_settings').select('dispatch_algorithm, dispatch_candidate_radius_km, dispatch_batch_size, dispatch_decision_window_seconds').eq('id', 1).single();
  const { data: riders, error: riderError } = await client.from('riders').select('id, zone_id, is_active_for_orders, last_latitude, last_longitude, status').in('status', ['ACTIVE', 'approved']).eq('is_active_for_orders', true);
  if (riderError) throw new Error('No se pudieron cargar riders elegibles.');
  const rows = riders ?? [];
  if (!rows.length) throw new Error('No hay riders activos para reenviar este pedido.');
  const { data: activeOrders, error: activeError } = await client.from('orders').select('id, rider_id, status').in('rider_id', rows.map((r) => r.id)).in('status', activeStatuses);
  if (activeError) throw new Error('No se pudo calcular la capacidad de riders.');
  const loads = new Map<string, number>();
  for (const active of activeOrders ?? []) if (active.rider_id && active.id !== orderId) loads.set(active.rider_id, (loads.get(active.rider_id) ?? 0) + 1);
  const coordinates = (order.pickup_address as { coordinates?: { lat?: number; lng?: number } } | null)?.coordinates;
  const radius = settings?.dispatch_candidate_radius_km ?? 10;
  const candidates = rows.filter((r) => !(order.rejected_riders ?? []).includes(r.id)).map((r) => ({ ...r, load: loads.get(r.id) ?? 0, distance: coordinates && typeof r.last_latitude === 'number' && typeof r.last_longitude === 'number' ? distanceKm(r.last_latitude, r.last_longitude, coordinates.lat ?? 0, coordinates.lng ?? 0) : Infinity })).filter((r) => r.load < 2).filter((r) => !coordinates || r.distance <= radius || !Number.isFinite(r.distance)).sort((a, b) => a.load - b.load || a.distance - b.distance);
  if (!candidates.length) throw new Error('No hay riders elegibles para reenviar este pedido.');
  const count = settings?.dispatch_algorithm === 'sequential' ? 1 : Math.max(1, settings?.dispatch_batch_size ?? 3);
  const selected = candidates.slice(0, count).map((r) => r.id);
  const update = client.from('orders').update({ status: 'pending_acceptance', rider_id: null, active_notified_riders: selected, notified_riders: Array.from(new Set([...(order.notified_riders ?? []), ...selected])), notification_expires_at: new Date(Date.now() + (settings?.dispatch_decision_window_seconds ?? 60) * 1000).toISOString(), assignment_exhausted_at: null, last_dispatch_at: new Date().toISOString(), dispatch_attempt_count: (order.dispatch_attempt_count ?? 0) + 1, updated_at: new Date().toISOString() }).eq('id', orderId);
  const { error: updateError } = order.rider_id === null ? update.is('rider_id', null) : update.eq('rider_id', order.rider_id);
  if (updateError) throw new Error('No se pudo actualizar el dispatch.');
  return { selectedRiderCount: selected.length, rpc: false };
}

export async function manuallyAssignOrder(orderId: string, riderId: string, expectedRiderId: string | null, client = createSupabaseAdminClient()) {
  const now = new Date().toISOString();
  const values = { rider_id: riderId, status: 'accepted', accepted_at: now, active_notified_riders: [], notification_expires_at: null, assignment_exhausted_at: null, updated_at: now };
  const cas = (payload: typeof values) => { const query = client.from('orders').update(payload).eq('id', orderId); return expectedRiderId === null ? query.is('rider_id', null).select('id, rider_id').maybeSingle() : query.eq('rider_id', expectedRiderId).select('id, rider_id').maybeSingle(); };
  let result = await cas(values);
  if (result.error) { const fallback = { ...values }; delete (fallback as { accepted_at?: string }).accepted_at; result = await cas(fallback); }
  if (result.error) throw new Error('No se pudo asignar el rider.');
  if (!result.data) throw new Error('La orden cambió antes de asignarse.');
  try { await client.from('order_events').insert({ order_id: orderId, rider_id: riderId, event_type: 'driver_assigned', notes: 'Asignación manual desde monitoreo.' }); } catch { /* best effort */ }
  return result.data;
}
