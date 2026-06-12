'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyPassword, hashPassword } from '@/lib/auth-utils';
import { sendPasswordChangedNotice } from '@/lib/password-reset';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

const passwordRegex = /^(?=.*[A-Z\d@$!%*?&]).{8,}$/;

export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword, newPasswordConfirmation } = await request.json();

    if (!userId || !currentPassword || !newPassword || !newPasswordConfirmation) {
      return NextResponse.json(
        { message: 'Todos los campos son requeridos.' },
        { status: 400 },
      );
    }

    if (newPassword !== newPasswordConfirmation) {
      return NextResponse.json(
        { message: 'La nueva contraseña y su confirmación no coinciden.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          message:
            'La contraseña debe tener al menos 8 caracteres y contener al menos una mayúscula, un número o un símbolo.',
        },
        { status: 400 },
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: 'La nueva contraseña debe ser diferente a la actual.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get: () => undefined, set: () => {}, remove: () => {} },
        db: { schema: process.env.SUPABASE_SCHEMA! },
      },
    );

    const { data: user, error: userError }: PostgrestSingleResponse<{
      id: string;
      password: string;
      name: string;
      role_id: string;
    }> = await supabaseAdmin
      .from('users')
      .select('id, password, name, role_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.password) {
      return NextResponse.json(
        { message: 'Usuario no encontrado.' },
        { status: 404 },
      );
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: 'La contraseña actual es incorrecta.' },
        { status: 401 },
      );
    }

    const hashed = await hashPassword(newPassword);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashed })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    try {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('phone_whatsapp')
        .eq('user_id', userId)
        .maybeSingle();

      if (business?.phone_whatsapp) {
        await sendPasswordChangedNotice({
          recipient: business.phone_whatsapp,
          userName: user.name || 'usuario',
        });
      }
    } catch (notificationError) {
      console.error('Password changed notification failed:', notificationError);
    }

    return NextResponse.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Change password error:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
