import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword, verifyPassword } from '@/lib/auth-utils';
import { passwordRegex } from '@/lib/schemas';
import { isRiderOrdersAuthFailure, requireRiderOrdersAccess } from '@/lib/rider-orders-auth';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .max(128)
    .regex(passwordRegex, 'La contraseña debe tener al menos 8 caracteres y una mayúscula, un número o un símbolo.'),
});

/**
 * Cambia la contraseña del propio repartidor. Verifica la actual con bcrypt en el servidor
 * y guarda el hash nuevo en `users.password`, que es el que usa el login.
 */
export async function POST(request: Request) {
  const access = await requireRiderOrdersAccess(request);
  if (isRiderOrdersAuthFailure(access)) return access.response;

  const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Datos inválidos.';
    return NextResponse.json({ message }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json({ message: 'La nueva contraseña debe ser diferente a la actual.' }, { status: 400 });
  }

  const { data: rider, error: riderError } = await access.supabase
    .from('riders')
    .select('user_id')
    .eq('id', access.riderId)
    .maybeSingle();
  if (riderError || !rider?.user_id) {
    return NextResponse.json({ message: 'No se encontró la cuenta del repartidor.' }, { status: 404 });
  }

  const { data: user, error: userError } = await access.supabase
    .from('users')
    .select('id, password')
    .eq('id', rider.user_id)
    .maybeSingle();
  if (userError || !user?.password) {
    return NextResponse.json({ message: 'No se encontró la cuenta del repartidor.' }, { status: 404 });
  }

  const currentIsValid = await verifyPassword(currentPassword, String(user.password));
  if (!currentIsValid) {
    return NextResponse.json({ message: 'La contraseña actual no coincide.' }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  const { data: updated, error: updateError } = await access.supabase
    .from('users')
    .update({ password: hashed })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ message: 'No se pudo actualizar la contraseña.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
