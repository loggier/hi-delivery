import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyRiderOrdersToken } from '@/lib/rider-location-token';

export type RiderOrdersAccess =
  | { riderId: string; supabase: ReturnType<typeof createSupabaseAdminClient> }
  | { response: NextResponse };

export async function requireRiderOrdersAccess(request: Request): Promise<RiderOrdersAccess> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  const payload = verifyRiderOrdersToken(token);
  if (!payload) {
    return { response: NextResponse.json({ message: 'Token de pedidos inválido o expirado.' }, { status: 401 }) } as const;
  }

  const supabase = createSupabaseAdminClient();
  const { data: rider, error } = await supabase
    .from('riders')
    .select('id, status')
    .eq('id', payload.riderId)
    .maybeSingle();
  if (error) {
    return { response: NextResponse.json({ message: 'No se pudo validar la cuenta.' }, { status: 503 }) } as const;
  }
  const status = String(rider?.status ?? '').trim().toLowerCase();
  if (!rider || !['approved', 'active', 'aprobado', 'activo'].includes(status)) {
    return { response: NextResponse.json({ message: 'La cuenta no está habilitada para consultar pedidos.' }, { status: 403 }) } as const;
  }
  return { riderId: String(rider.id), supabase } as const;
}

export function isRiderOrdersAuthFailure(
  result: RiderOrdersAccess,
): result is { response: NextResponse } {
  return 'response' in result;
}
