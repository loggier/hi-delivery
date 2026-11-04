import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';

const pushTokenSchema = z.object({
  token: z.string().trim().min(1).max(4096).nullable(),
  platform: z.enum(['android', 'ios']),
});

/** Guarda o borra el token FCM del propio repartidor. El token nunca se devuelve ni se imprime. */
export async function POST(request: Request) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const parsed = pushTokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Token de notificaciones inválido.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error } = await access.supabase
    .from('riders')
    .update({
      push_token: parsed.data.token,
      push_platform: parsed.data.platform,
      push_token_updated_at: now,
    })
    .eq('id', access.riderId)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ message: 'No se pudo guardar el token de notificaciones.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, platform: parsed.data.platform }, { headers: { 'Cache-Control': 'no-store' } });
}
