import 'server-only';

import { sendPushToRiders } from '@/lib/push-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { manuallyAssignOrder, redispatchOrder } from './dispatch-service';

export type MonitoringAction = { type: 'request_location'; riderId: string } | { type: 'pause_rider'; riderId: string; expectedActive: boolean; reason: string } | { type: 'change_rider_zone'; riderId: string; expectedZoneId: string | null; zoneId: string; reason: string } | { type: 'reassign_order'; orderId: string; expectedRiderId: string | null; riderId: string | null; reason: string };
export class MonitoringActionError extends Error { constructor(public readonly status: 404 | 409 | 500, message: string) { super(message); } }
type Audit = { action_type: string; acting_user_id: string; rider_id?: string; order_id?: string; is_sensitive: boolean; reason?: string; result: 'success' | 'failed'; safe_error_category?: string; before_values: Record<string, unknown>; after_values: Record<string, unknown> };

async function audit(entry: Audit) { try { await createSupabaseAdminClient().from('monitoring_action_log').insert(entry); } catch { /* audit failure must not hide the operation result */ } }
function category(error: unknown) { const message = error instanceof Error ? error.message.toLowerCase() : ''; if (message.includes('stale') || message.includes('cambió')) return 'stale'; if (message.includes('no se encontró')) return 'not_found'; if (message.includes('elegible') || message.includes('capacidad')) return 'dispatch_unavailable'; return 'operation_failed'; }

export async function executeMonitoringAction(action: MonitoringAction, actorId: string) {
  if (action.type === 'request_location') {
    const { data: rider } = await createSupabaseAdminClient().from('riders').select('id').eq('id', action.riderId).maybeSingle();
    if (!rider) { await audit({ action_type: action.type, acting_user_id: actorId, rider_id: action.riderId, is_sensitive: false, result: 'failed', safe_error_category: 'not_found', before_values: {}, after_values: {} }); throw new MonitoringActionError(404, 'No se encontró el rider.'); }
    try { const sent = await sendPushToRiders({ riderIds: [action.riderId], title: 'Reporta tu ubicación', body: 'Tu ubicación no se ha actualizado. Abre la app para enviarla ahora.', data: { kind: 'location_request' } }); await audit({ action_type: action.type, acting_user_id: actorId, rider_id: action.riderId, is_sensitive: false, result: 'success', before_values: {}, after_values: { notification: sent.sentCount > 0 ? 'sent' : 'not_sent' } }); return { notification: { sent: sent.sentCount > 0, sentCount: sent.sentCount, warning: sent.sentCount === 0 ? 'El rider no tiene un token disponible.' : undefined } }; } catch { await audit({ action_type: action.type, acting_user_id: actorId, rider_id: action.riderId, is_sensitive: false, result: 'failed', safe_error_category: 'communication_failed', before_values: {}, after_values: {} }); return { notification: { sent: false, warning: 'No se pudo enviar la solicitud de ubicación.' } }; }
  }
  const client = createSupabaseAdminClient();
  const sensitive = action.type !== 'request_location';
  let before: Record<string, unknown> = {}; let after: Record<string, unknown> = {};
  try {
    if (action.type === 'pause_rider' || action.type === 'change_rider_zone') {
      const { data: rider } = await client.from('riders').select('id, is_active_for_orders, zone_id').eq('id', action.riderId).maybeSingle();
      if (!rider) throw new MonitoringActionError(404, 'No se encontró el rider.');
      const expected = action.type === 'pause_rider' ? rider.is_active_for_orders === action.expectedActive : rider.zone_id === action.expectedZoneId;
      if (!expected) throw new MonitoringActionError(409, 'El rider cambió antes de aplicar la acción.');
      before = action.type === 'pause_rider' ? { active: rider.is_active_for_orders } : { zoneId: rider.zone_id };
      const values = action.type === 'pause_rider' ? { is_active_for_orders: false } : { zone_id: action.zoneId };
      const result = await client.from('riders').update(values).eq('id', action.riderId).eq(action.type === 'pause_rider' ? 'is_active_for_orders' : 'zone_id', action.type === 'pause_rider' ? action.expectedActive : action.expectedZoneId).select('id').maybeSingle();
      if (result.error) throw new Error('No se pudo actualizar el rider.'); if (!result.data) throw new MonitoringActionError(409, 'El rider cambió antes de aplicar la acción.');
      after = action.type === 'pause_rider' ? { active: false } : { zoneId: action.zoneId };
      await audit({ action_type: action.type, acting_user_id: actorId, rider_id: action.riderId, is_sensitive: sensitive, reason: action.reason, result: 'success', before_values: before, after_values: after }); return { before, after };
    }
    const { data: order } = await client.from('orders').select('id, rider_id').eq('id', action.orderId).maybeSingle();
    if (!order) throw new MonitoringActionError(404, 'No se encontró la orden.'); if (order.rider_id !== action.expectedRiderId) throw new MonitoringActionError(409, 'La orden cambió antes de aplicar la acción.');
    before = { riderId: order.rider_id }; if (action.riderId) await manuallyAssignOrder(action.orderId, action.riderId, action.expectedRiderId); else await redispatchOrder(action.orderId);
    after = { riderId: action.riderId }; await audit({ action_type: action.type, acting_user_id: actorId, order_id: action.orderId, is_sensitive: true, reason: action.reason, result: 'success', before_values: before, after_values: after }); return { before, after };
  } catch (error) { const safe = error instanceof MonitoringActionError ? error : new MonitoringActionError(500, 'No se pudo completar la acción.'); await audit({ action_type: action.type, acting_user_id: actorId, rider_id: 'riderId' in action ? action.riderId : undefined, order_id: 'orderId' in action ? action.orderId : undefined, is_sensitive: true, reason: action.reason, result: 'failed', safe_error_category: error instanceof MonitoringActionError && error.status === 409 ? 'stale' : category(error), before_values: before, after_values: {} }); throw safe; }
}
