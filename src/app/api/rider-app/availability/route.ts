import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';

const availabilitySchema = z.object({
  active: z.boolean(),
});

/** La app del repartidor activa o desactiva su disponibilidad. Sólo cambia su propio registro. */
export async function POST(request: Request) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const parsed = availabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Disponibilidad inválida.' }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from('riders')
    .update({ is_active_for_orders: parsed.data.active, updated_at: new Date().toISOString() })
    .eq('id', access.riderId)
    .select('is_active_for_orders')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ message: 'No se pudo actualizar la disponibilidad.' }, { status: 502 });
  }

  return NextResponse.json({ active: Boolean(data.is_active_for_orders) }, { headers: { 'Cache-Control': 'no-store' } });
}
