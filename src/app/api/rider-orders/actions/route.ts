import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';
import { isEligibleUnassignedOrder } from '@/lib/rider-orders';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), orderId: z.string().trim().min(1).max(255) }),
  z.object({ action: z.literal('reject'), orderId: z.string().trim().min(1).max(255) }),
  z.object({
    action: z.literal('advance'),
    orderId: z.string().trim().min(1).max(255),
    status: z.enum(['at_store', 'picked_up', 'arrived_at_destination', 'completed', 'failed']),
    deliveryProofUrl: z.string().url().optional(),
    reason: z.string().trim().min(1).max(500).optional(),
  }),
]);

const allowedFromStatuses: Record<string, readonly string[]> = {
  at_store: ['accepted', 'cooking', 'ready_for_pickup'],
  picked_up: ['accepted', 'at_store', 'cooking', 'ready_for_pickup'],
  arrived_at_destination: ['picked_up', 'out_for_delivery', 'on_the_way'],
  completed: ['picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination'],
  failed: ['arrived_at_destination'],
};

async function addOrderEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  orderId: string,
  riderId: string,
  eventType: string,
) {
  try {
    await supabase.from('order_events').insert({
      order_id: orderId,
      rider_id: riderId,
      event_type: eventType,
    });
  } catch {
    // Order state changes are primary; timeline events remain best-effort.
  }
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value as Record<string, unknown>[] : [];
}

async function tryAcceptRpc(supabase: ReturnType<typeof createSupabaseAdminClient>, orderId: string, riderId: string) {
  const variants = [
    { order_id_in: orderId, rider_id_in: riderId },
    { p_order_id: orderId, p_rider_id: riderId },
    { order_id: orderId, rider_id: riderId },
  ];
  for (const params of variants) {
    const { error } = await supabase.rpc('accept_order_assignment', params);
    if (!error) return true;
    const message = error.message.toLowerCase();
    if (error.code !== 'PGRST202' && !(message.includes('function') && (message.includes('not found') || message.includes('does not exist') || message.includes('could not find')))) {
      return false;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Acción de pedido inválida.' }, { status: 400 });
  const { supabase, riderId } = access;
  const { action, orderId } = parsed.data;

  try {
    const { data, error } = await supabase.from('orders')
      .select('id,rider_id,status,notified_riders,active_notified_riders,rejected_riders,notification_expires_at,assignment_exhausted_at')
      .eq('id', orderId)
      .maybeSingle();
    if (error) return NextResponse.json({ message: 'No se pudo consultar el pedido.' }, { status: 502 });
    if (!data) return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    const order = data as Record<string, unknown>;

    if (action === 'accept' || action === 'reject') {
      if (!isEligibleUnassignedOrder(order, riderId, Date.now())) {
        return NextResponse.json({ message: 'El pedido ya no está disponible para este repartidor.' }, { status: 409 });
      }

      if (action === 'accept') {
        const rpcResult = await tryAcceptRpc(supabase, orderId, riderId);
        if (rpcResult === true) {
          const { data: assigned, error: verifyError } = await supabase.from('orders')
            .select('id').eq('id', orderId).eq('rider_id', riderId).eq('status', 'accepted').maybeSingle();
          if (!verifyError && assigned) {
            await addOrderEvent(supabase, orderId, riderId, 'accepted');
            return NextResponse.json({ ok: true, status: 'accepted' });
          }
          return NextResponse.json({ message: 'El pedido ya no está disponible.' }, { status: 409 });
        }
        if (rpcResult === false) return NextResponse.json({ message: 'No se pudo aceptar el pedido.' }, { status: 409 });
        const now = new Date().toISOString();
        const waveColumn = Array.isArray(order.active_notified_riders) && order.active_notified_riders.length > 0
          ? 'active_notified_riders'
          : 'notified_riders';
        let fallbackQuery = supabase.from('orders')
          .update({ rider_id: riderId, status: 'accepted', accepted_at: now })
          .eq('id', orderId).eq('status', 'pending_acceptance').is('rider_id', null)
          .contains(waveColumn, [riderId]);
        let { data: updated, error: updateError } = await fallbackQuery.select('id');
        if (updateError && (updateError.code === '42703' || updateError.code === 'PGRST204') && updateError.message.includes('accepted_at')) {
          fallbackQuery = supabase.from('orders')
            .update({ rider_id: riderId, status: 'accepted' })
            .eq('id', orderId).eq('status', 'pending_acceptance').is('rider_id', null)
            .contains(waveColumn, [riderId]);
          const fallback = await fallbackQuery.select('id');
          updated = fallback.data;
          updateError = fallback.error;
        }
        if (updateError || rowsOf(updated).length === 0) return NextResponse.json({ message: 'El pedido ya no está disponible.' }, { status: 409 });
        await addOrderEvent(supabase, orderId, riderId, 'accepted');
        return NextResponse.json({ ok: true, status: 'accepted' });
      }

      const rejected = Array.isArray(order.rejected_riders) ? order.rejected_riders.map(String) : [];
      if (!rejected.includes(riderId)) rejected.push(riderId);
      const waveColumn = Array.isArray(order.active_notified_riders) && order.active_notified_riders.length > 0
        ? 'active_notified_riders'
        : 'notified_riders';
      const { data: updated, error: updateError } = await supabase.from('orders')
        .update({ rejected_riders: rejected })
        .eq('id', orderId).eq('status', 'pending_acceptance').is('rider_id', null)
        .contains(waveColumn, [riderId])
        .select('id');
      if (updateError || rowsOf(updated).length === 0) return NextResponse.json({ message: 'El pedido ya no está disponible.' }, { status: 409 });
      await addOrderEvent(supabase, orderId, riderId, 'rejected');
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    if (order.rider_id !== riderId) return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    const currentStatus = String(order.status ?? '').toLowerCase();
    const allowedFrom = allowedFromStatuses[parsed.data.status];
    if (!allowedFrom.includes(currentStatus)) return NextResponse.json({ message: 'El estado del pedido cambió.' }, { status: 409 });
    if (parsed.data.status === 'completed' && !parsed.data.deliveryProofUrl) {
      return NextResponse.json({ message: 'La evidencia de entrega es obligatoria.' }, { status: 400 });
    }
    if (parsed.data.status === 'completed') {
      const proof = new URL(parsed.data.deliveryProofUrl!);
      const expectedPath = `/orders/${encodeURIComponent(orderId)}/`;
      const expectedOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
      const bucket = process.env.DELIVERY_PROOF_BUCKET || 'hidelivery';
      if (
        proof.origin !== expectedOrigin ||
        !proof.pathname.includes(`/storage/v1/object/public/${bucket}${expectedPath}`) ||
        !proof.pathname.includes(encodeURIComponent(riderId))
      ) {
        return NextResponse.json({ message: 'La evidencia de entrega no corresponde al repartidor y pedido.' }, { status: 400 });
      }
    }
    const now = new Date().toISOString();
    const extraFields: Record<string, unknown> = {};
    if (parsed.data.status === 'at_store') extraFields.at_store_at = now;
    if (parsed.data.status === 'picked_up') extraFields.picked_up_at = now;
    if (parsed.data.status === 'arrived_at_destination') extraFields.arrived_at_destination_at = now;
    if (parsed.data.status === 'completed') {
      extraFields.completed_at = now;
      extraFields.delivered_at = now;
      extraFields.delivery_proof_url = parsed.data.deliveryProofUrl;
    }
    if (parsed.data.status === 'failed') {
      extraFields.failed_at = now;
      extraFields.delivery_failure_reason = parsed.data.reason ?? '';
      extraFields.delivery_failure_reported_at = now;
    }

    const { data: updated, error: updateError } = await supabase.from('orders')
      .update({ status: parsed.data.status, ...extraFields })
      .eq('id', orderId).eq('rider_id', riderId).eq('status', currentStatus)
      .select('id');
    if (updateError || rowsOf(updated).length === 0) return NextResponse.json({ message: 'El pedido cambió y no se pudo actualizar.' }, { status: 409 });
    await addOrderEvent(supabase, orderId, riderId, parsed.data.status);
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch {
    return NextResponse.json({ message: 'No se pudo procesar la acción del pedido.' }, { status: 500 });
  }
}
