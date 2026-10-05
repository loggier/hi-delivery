import { NextResponse } from 'next/server';
import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';
import { isEligibleUnassignedOrder, RIDER_ORDER_SELECT, safeRiderOrder } from '@/lib/rider-orders';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const { id } = await context.params;
  if (!id || id.length > 255) return NextResponse.json({ message: 'Pedido inválido.' }, { status: 400 });

  try {
    const { data: order, error } = await access.supabase
      .from('orders')
      .select(RIDER_ORDER_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) return NextResponse.json({ message: 'No se pudo consultar el pedido.' }, { status: 502 });
    if (!order) return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });

    const row = order as Record<string, unknown>;
    const assignedToRider = row.rider_id === access.riderId;
    const availableForRider = isEligibleUnassignedOrder(row, access.riderId, Date.now());
    if (!assignedToRider && !availableForRider) {
      return NextResponse.json({ message: 'Pedido no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({
      order: { ...safeRiderOrder(row), ...(availableForRider ? { rider_can_accept: true } : {}) },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'No se pudo consultar el pedido.' }, { status: 500 });
  }
}
