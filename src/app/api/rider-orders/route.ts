import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';
import { isEligibleUnassignedOrder, RIDER_ACTIVE_ORDER_STATUSES, RIDER_ORDER_SELECT, RIDER_TERMINAL_ORDER_STATUSES, safeRiderOrder } from '@/lib/rider-orders';

const querySchema = z.object({
  view: z.enum(['active', 'pending', 'history', 'earnings']),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  limit: z.coerce.number().int().min(1).max(2_000).default(100),
});

export async function GET(request: Request) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    view: params.get('view'),
    offset: params.get('offset') ?? undefined,
    limit: params.get('limit') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ message: 'Consulta de pedidos inválida.' }, { status: 400 });

  try {
    const { view, offset, limit } = parsed.data;
    const rangeStart = offset;
    const rangeEnd = offset + limit - 1;
    let query = access.supabase.from('orders').select(RIDER_ORDER_SELECT);

    if (view === 'active') {
      query = query.eq('rider_id', access.riderId).in('status', RIDER_ACTIVE_ORDER_STATUSES) as typeof query;
    } else if (view === 'history') {
      query = query.eq('rider_id', access.riderId).in('status', RIDER_TERMINAL_ORDER_STATUSES) as typeof query;
    } else if (view === 'earnings') {
      query = query.eq('rider_id', access.riderId) as typeof query;
    } else {
      query = query.is('rider_id', null).eq('status', 'pending_acceptance') as typeof query;
    }

    const { data, error } = await query.order('created_at', { ascending: false }).range(rangeStart, rangeEnd);
    if (error || !data) return NextResponse.json({ message: 'No se pudieron consultar los pedidos.' }, { status: 502 });

    const rows = data as Record<string, unknown>[];
    const scoped = view === 'pending'
      ? rows.filter((order) => isEligibleUnassignedOrder(order, access.riderId, Date.now()))
      : rows;
    return NextResponse.json({
      orders: scoped.map((order) => ({ ...safeRiderOrder(order), ...(view === 'pending' ? { rider_can_accept: true } : {}) })),
      offset,
      limit,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'No se pudieron consultar los pedidos.' }, { status: 500 });
  }
}
