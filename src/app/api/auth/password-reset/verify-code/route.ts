import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  PASSWORD_RESET_MAX_CODE_ATTEMPTS,
  createResetToken,
  findPasswordResetAccount,
  hashResetSecret,
} from '@/lib/password-reset';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** `identifier` es correo o teléfono; `phone` se acepta como alias para la app existente. */
const verifyCodeSchema = z
  .object({
    identifier: z.string().trim().min(3).max(120).optional(),
    phone: z.string().trim().min(8).max(30).optional(),
    code: z.string().regex(/^\d{6}$/),
  })
  .refine((value) => Boolean(value.identifier || value.phone), { message: 'Datos inválidos.' });

export async function POST(request: Request) {
  try {
    const parsed = verifyCodeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Código inválido.' }, { status: 400 });
    }

    const identifier = (parsed.data.identifier || parsed.data.phone || '').trim();
    const account = await findPasswordResetAccount({ channel: 'app', identifier });
    if (!account || account.targetType !== 'rider') {
      return NextResponse.json({ message: 'Código inválido o expirado.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: resetRequest, error } = await supabase
      .from('password_reset_requests')
      .select('id, code_hash, attempt_count, expires_at')
      .eq('recipient', account.storedRecipient)
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
