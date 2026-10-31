import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyRegistrationToken } from '@/lib/rider-registration-token';

/** Columnas que el wizard necesita para precargar cada paso. Nunca incluye hashes ni contraseñas. */
const WIZARD_RIDER_COLUMNS = [
  'status',
  'mother_last_name',
  'birth_date',
  'zone_id',
  'address',
  'ownership',
  'brand',
  'year',
  'model',
  'color',
  'plate',
  'license_valid_until',
  'insurer',
  'policy_number',
  'policy_valid_until',
  'has_helmet',
  'has_uniform',
  'has_box',
].join(', ');

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Resuelve un token de registro en el riderId y el estado del repartidor,
 * para que el wizard no dependa del UUID en la URL. Responde 404 si el token es inválido,
 * ha expirado o fue invalidado al enviar la solicitud.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  const riderId = await verifyRegistrationToken(token);

  if (!riderId) {
    return NextResponse.json(
      { message: 'El enlace de registro no es válido o ya venció.' },
      { status: 404, headers: NO_STORE },
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from('riders')
    .select(WIZARD_RIDER_COLUMNS)
    .eq('id', riderId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { message: 'No se pudo cargar tu registro.' },
      { status: 500, headers: NO_STORE },
    );
  }

  const { status, ...rider } = data as unknown as Record<string, unknown> & { status: string };

  return NextResponse.json({ riderId, status, rider }, { status: 200, headers: NO_STORE });
}
