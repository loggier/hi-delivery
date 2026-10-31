import { NextResponse } from 'next/server';
import { z } from 'zod';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { sendRiderAccountActivatedEmail } from '@/lib/notifications/rider-registration-emails';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Estados que un administrador puede asignar y los estados desde los que se permite.
 * `approved` es el estado de repartidor activo: así lo reconocen la base (`riders_status_check`)
 * y el resto de la app. No existe un estado `active`.
 */
const ALLOWED_TRANSITIONS: Record<'approved' | 'rejected' | 'inactive', readonly string[]> = {
  approved: ['pending_review', 'inactive'],
  rejected: ['pending_review'],
  inactive: ['approved'],
};

const statusBodySchema = z.object({
  status: z.enum(['approved', 'rejected', 'inactive']),
});

/**
 * Cambio de estado administrativo del repartidor. Sólo sesión admin (401/403).
 * Al aprobar (`approved`) envía `rider.account_activated` por correo, best-effort.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOperationSession();
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = statusBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Estado no permitido.' }, { status: 400 });
  }
  const target = parsed.data.status;

  const supabase = createSupabaseAdminClient();
  const { data: rider, error: fetchError } = await supabase
    .from('riders')
    .select('id, status, email, first_name, last_name')
    .eq('id', riderId)
    .maybeSingle();

  if (fetchError || !rider) {
    return NextResponse.json({ message: 'No se pudo encontrar el repartidor.' }, { status: 404 });
  }

  if (!ALLOWED_TRANSITIONS[target].includes(String(rider.status))) {
    return NextResponse.json({ message: 'El cambio de estado no está permitido desde el estado actual.' }, { status: 409 });
  }

  // Control de concurrencia: sólo actualiza si el estado sigue siendo el que se leyó.
  const { data: updated, error: updateError } = await supabase
    .from('riders')
    .update({ status: target, updated_at: new Date().toISOString() })
    .eq('id', riderId)
    .eq('status', rider.status)
    .select('id, status, updated_at')
    .maybeSingle();

  if (updateError) {
    console.error('Error updating rider status.');
    return NextResponse.json({ message: 'No se pudo actualizar el estado.' }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ message: 'El estado cambió mientras lo actualizabas. Recarga e intenta de nuevo.' }, { status: 409 });
  }

  if (target === 'approved') {
    // Best-effort con tiempo límite: no altera la respuesta.
    const fullName = [rider.first_name, rider.last_name].filter(Boolean).join(' ').trim();
    await sendRiderAccountActivatedEmail({
      email: rider.email,
      userName: fullName || 'repartidor',
    });
  }

  return NextResponse.json({ message: 'Estado actualizado.', rider: updated }, { status: 200 });
}
