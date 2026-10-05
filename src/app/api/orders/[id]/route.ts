import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminSessionError, requireOrderManagementSession } from '@/lib/auth/admin-session';

const orderSelect = '*, business:businesses(name), customer:customers!inner(*), rider:riders(id,first_name,last_name), order_items:order_items(*, products:products(name)), notified_riders, active_notified_riders, rejected_riders, notification_expires_at, last_dispatch_at, assignment_exhausted_at, dispatch_attempt_count';
const orderStatus = z.enum(['pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination', 'delivered', 'completed', 'cancelled', 'refunded', 'failed']);
const updateSchema = z.object({
  status: orderStatus,
  delivery_failure_reason: z.string().trim().max(500).optional(),
  delivery_failure_reported_at: z.string().datetime({ offset: true }).optional(),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireOrderManagementSession();
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('orders').select(orderSelect).eq('id', id);
    if (actor.roleId === 'role-owner') query = query.eq('business_id', actor.businessId!);
    const { data, error } = await query.maybeSingle();
    if (error) return NextResponse.json({ message: 'No se pudo consultar el pedido.' }, { status: 502 });
    if (!data) return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    const { data: attempts } = await supabase.from('order_assignment_attempts')
      .select('*, rider:riders(id,first_name,last_name)')
      .eq('order_id', id)
      .order('dispatch_attempt_no', { ascending: true });
    return NextResponse.json({ ...data, order_assignment_attempts: attempts ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'No se pudo autorizar el pedido.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireOrderManagementSession();
    const body = updateSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return NextResponse.json({ message: 'Actualización de pedido inválida.' }, { status: 400 });
    if (actor.roleId === 'role-owner' && !['ready_for_pickup', 'cancelled'].includes(body.data.status)) {
      return NextResponse.json({ message: 'El negocio no puede aplicar ese estado.' }, { status: 403 });
    }
    if (body.data.status === 'failed' && !body.data.delivery_failure_reason) {
      return NextResponse.json({ message: 'El motivo de falla es obligatorio.' }, { status: 400 });
    }

    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    let currentQuery = supabase.from('orders').select('id,business_id,status').eq('id', id);
    if (actor.roleId === 'role-owner') currentQuery = currentQuery.eq('business_id', actor.businessId!);
    const { data: current, error: readError } = await currentQuery.maybeSingle();
    if (readError) return NextResponse.json({ message: 'No se pudo verificar el pedido.' }, { status: 502 });
    if (!current) return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });

    const update = { ...body.data, updated_at: new Date().toISOString() };
    let mutation = supabase.from('orders').update(update).eq('id', id).eq('status', current.status);
    if (actor.roleId === 'role-owner') mutation = mutation.eq('business_id', actor.businessId!);
    const { data, error } = await mutation.select(orderSelect).maybeSingle();
    if (error) return NextResponse.json({ message: 'No se pudo actualizar el pedido.' }, { status: 502 });
    if (!data) return NextResponse.json({ message: 'El pedido cambió. Actualiza la pantalla e intenta de nuevo.' }, { status: 409 });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'No se pudo autorizar la actualización del pedido.' }, { status: 500 });
  }
}
