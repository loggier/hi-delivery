import { NextResponse } from 'next/server';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { getRegistrationLinkBaseUrl, resendRiderRegistrationLink } from '@/lib/notifications/rider-registration-resend';
import {
  createRegistrationToken,
  getRegistrationTokenExpiry,
  hashRegistrationToken,
} from '@/lib/rider-registration-token';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Máximo de reenvíos por repartidor dentro de una ventana fija de 24 horas que empieza en el primer reenvío. */
const RIDER_REGISTRATION_RESEND_LIMIT = 3;
const RIDER_REGISTRATION_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Reenvía el enlace de registro a un repartidor con registro incompleto. Sólo administradores.
 * Genera un token nuevo: el hash cambia y el enlace anterior deja de servir.
 * Nunca devuelve el token.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin: { id: string };
  try {
    admin = await requireAdminOperationSession();
  } catch (error) {
    if (error instanceof AdminSessionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'No se pudo verificar la sesión.' }, { status: 500 });
  }

  const { id: riderId } = await params;
  if (!riderId) {
    return NextResponse.json({ message: 'Rider ID es requerido.' }, { status: 400 });
  }

  const baseUrl = getRegistrationLinkBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: 'No se puede reenviar: APP_PUBLIC_URL no está configurada.' }, { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('id, status, email, phone_e164, first_name, last_name, registration_resend_count, registration_resend_window_started_at')
    .eq('id', riderId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ message: 'No se pudo consultar el repartidor.' }, { status: 500 });
  }
  if (!rider) {
    return NextResponse.json({ message: 'No se pudo encontrar el repartidor.' }, { status: 404 });
  }
  if (rider.status !== 'incomplete') {
    return NextResponse.json(
      { message: 'Solo se puede reenviar el enlace a repartidores con registro incompleto.' },
      { status: 409 },
    );
  }

  const nowMs = Date.now();
  const storedCount = Number(rider.registration_resend_count ?? 0);
  const windowStartMs = rider.registration_resend_window_started_at
    ? Date.parse(rider.registration_resend_window_started_at)
    : Number.NaN;
  const windowOpen = Number.isFinite(windowStartMs) && nowMs - windowStartMs < RIDER_REGISTRATION_RESEND_WINDOW_MS;
  const usedInWindow = windowOpen ? storedCount : 0;

  if (usedInWindow >= RIDER_REGISTRATION_RESEND_LIMIT) {
    return NextResponse.json(
      { message: `Ya se reenviaron ${RIDER_REGISTRATION_RESEND_LIMIT} enlaces en las últimas 24 horas. Intenta más tarde.` },
      { status: 429 },
    );
  }

  const now = new Date(nowMs);
  const windowStartedAt = windowOpen ? new Date(windowStartMs) : now;
  const token = createRegistrationToken();
  const expiresAt = getRegistrationTokenExpiry(now);

  // Control de concurrencia: sólo escribe si el estado y el contador siguen como se leyeron.
  const { data: updated, error: updateError } = await supabase
    .from('riders')
    .update({
      registration_token_hash: hashRegistrationToken(token),
      registration_token_expires_at: expiresAt.toISOString(),
      registration_resend_count: usedInWindow + 1,
      registration_resend_window_started_at: windowStartedAt.toISOString(),
      registration_last_resent_at: now.toISOString(),
      registration_last_resent_by: admin.id,
      updated_at: now.toISOString(),
    })
    .eq('id', riderId)
    .eq('status', 'incomplete')
    .eq('registration_resend_count', storedCount)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('Error registering rider registration resend.');
    return NextResponse.json({ message: 'No se pudo reenviar el enlace.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { message: 'El registro cambió mientras reenviabas. Recarga e intenta de nuevo.' },
      { status: 409 },
    );
  }

  const fullName = [rider.first_name, rider.last_name].filter(Boolean).join(' ').trim();
  const delivery = await resendRiderRegistrationLink({
    baseUrl,
    registrationToken: token,
    expiresAt,
    userName: fullName || 'repartidor',
    email: rider.email,
    phone: rider.phone_e164,
  });

  const summary = `Correo: ${delivery.email ? 'enviado' : 'no enviado'}. WhatsApp: ${delivery.whatsapp ? 'enviado' : 'no enviado'}.`;
  if (!delivery.email && !delivery.whatsapp) {
    return NextResponse.json(
      { message: `No se pudo enviar el enlace por ningún canal. ${summary} Intenta de nuevo más tarde.` },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: `Enlace reenviado. ${summary}`, delivery }, { status: 200 });
}
