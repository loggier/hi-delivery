import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  PASSWORD_RESET_MAX_CODE_ATTEMPTS,
  createResetToken,
  findRiderResetRecipientByPhone,
  hashResetSecret,
} from '@/lib/password-reset';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const verifyCodeSchema = z.object({
  phone: z.string().min(8).max(30),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    const parsed = verifyCodeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Código inválido.' }, { status: 400 });
    }

    const recipient = await findRiderResetRecipientByPhone(parsed.data.phone);
    if (!recipient) {
      return NextResponse.json({ message: 'Código inválido o expirado.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: resetRequest, error } = await supabase
      .from('password_reset_requests')
      .select('id, code_hash, attempt_count, expires_at')
      .eq('recipient', recipient.recipient)
      .eq('target_type', 'rider')
      .is('consumed_at', null)
      .not('code_hash', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !resetRequest) {
      return NextResponse.json({ message: 'Código inválido o expirado.' }, { status: 400 });
    }

    if ((resetRequest.attempt_count ?? 0) >= PASSWORD_RESET_MAX_CODE_ATTEMPTS) {
      return NextResponse.json({ message: 'Código inválido o expirado.' }, { status: 400 });
    }

    const codeHash = hashResetSecret(parsed.data.code);
    if (codeHash !== resetRequest.code_hash) {
      await supabase
        .from('password_reset_requests')
        .update({ attempt_count: (resetRequest.attempt_count ?? 0) + 1 })
        .eq('id', resetRequest.id);

      return NextResponse.json({ message: 'Código inválido o expirado.' }, { status: 400 });
    }

    const resetToken = createResetToken();
    const { error: updateError } = await supabase
      .from('password_reset_requests')
      .update({ token_hash: hashResetSecret(resetToken) })
      .eq('id', resetRequest.id);

    if (updateError) throw updateError;

    return NextResponse.json({ resetToken });
  } catch (error) {
    console.error('Password reset code verification failed:', error);
    return NextResponse.json({ message: 'No se pudo verificar el código.' }, { status: 500 });
  }
}
