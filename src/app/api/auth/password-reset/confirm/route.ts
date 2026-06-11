import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashPassword } from '@/lib/auth-utils';
import { hashResetSecret, sendPasswordChangedNotice } from '@/lib/password-reset';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const confirmSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Las contraseñas no coinciden.',
});

export async function POST(request: Request) {
  try {
    const parsed = confirmSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const tokenHash = hashResetSecret(parsed.data.token);

    const { data: resetRequest, error } = await supabase
      .from('password_reset_requests')
      .select('id, user_id, recipient')
      .eq('token_hash', tokenHash)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !resetRequest) {
      return NextResponse.json({ message: 'El enlace o token ya expiró.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(parsed.data.password);
    const { error: userError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', resetRequest.user_id);

    if (userError) throw userError;

    const { error: consumeError } = await supabase
      .from('password_reset_requests')
      .update({ consumed_at: new Date().toISOString(), token_hash: null, code_hash: null })
      .eq('user_id', resetRequest.user_id)
      .is('consumed_at', null);

    if (consumeError) throw consumeError;

    const { data: user } = await supabase
      .from('users')
      .select('name')
      .eq('id', resetRequest.user_id)
      .maybeSingle();

    try {
      await sendPasswordChangedNotice({
        recipient: resetRequest.recipient,
        userName: user?.name || 'usuario',
      });
    } catch (notificationError) {
      console.error('Password changed notification failed:', notificationError);
    }

    return NextResponse.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Password reset confirmation failed:', error);
    return NextResponse.json({ message: 'No se pudo actualizar la contraseña.' }, { status: 500 });
  }
}
