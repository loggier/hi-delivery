import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildResetLink,
  createResetCode,
  createResetToken,
  findPasswordResetAccount,
  getPasswordResetBaseUrl,
  getRequestIp,
  getResetExpiresAt,
  hashResetSecret,
  hasTooManyRecentResetRequestsForUser,
  hasTooManyRecentResetRequestsFromIp,
  sendPasswordResetCode,
  sendPasswordResetLink,
} from '@/lib/password-reset';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * `identifier` es el correo o el teléfono registrado. `phone` se acepta como alias para clientes existentes
 * (la app de repartidores). Basta uno de los dos.
 */
const requestSchema = z
  .object({
    channel: z.enum(['web', 'app']),
    identifier: z.string().trim().min(3).max(120).optional(),
    phone: z.string().trim().min(8).max(30).optional(),
  })
  .refine((value) => Boolean(value.identifier || value.phone), {
    message: 'Escribe tu correo o tu WhatsApp.',
  });

// Misma respuesta siempre: no revela si la cuenta existe ni si hubo límite.
const GENERIC_RESPONSE = {
  message: 'Si la cuenta existe, enviaremos instrucciones por WhatsApp y correo.',
};

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
    }

    const { channel } = parsed.data;
    const identifier = (parsed.data.identifier || parsed.data.phone || '').trim();
    const requestIp = getRequestIp(request);

    if (await hasTooManyRecentResetRequestsFromIp(requestIp)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const account = await findPasswordResetAccount({ channel, identifier });
    if (!account) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    if (await hasTooManyRecentResetRequestsForUser(account.user.id, account.targetType)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const supabase = createSupabaseAdminClient();
    const expiresAt = getResetExpiresAt();

    // delivery_channel sólo admite 'whatsapp' en la base (constraint). El correo se envía en paralelo.
    if (channel === 'web') {
      const token = createResetToken();
      const baseUrl = await getPasswordResetBaseUrl(new URL(request.url).origin);
      const resetLink = buildResetLink(baseUrl, token);

      const { error } = await supabase.from('password_reset_requests').insert({
        user_id: account.user.id,
        target_type: account.targetType,
        delivery_channel: 'whatsapp',
        recipient: account.storedRecipient,
        token_hash: hashResetSecret(token),
        expires_at: expiresAt.toISOString(),
        request_ip: requestIp,
      });

      if (error) throw error;

      await sendPasswordResetLink({
        recipient: account.whatsappRecipient,
        userName: account.user.name,
        userEmail: account.email,
        resetLink,
        expiresAt,
      });
    } else {
      const code = createResetCode();

      const { error } = await supabase.from('password_reset_requests').insert({
        user_id: account.user.id,
        target_type: account.targetType,
        delivery_channel: 'whatsapp',
        recipient: account.storedRecipient,
        code_hash: hashResetSecret(code),
        expires_at: expiresAt.toISOString(),
        request_ip: requestIp,
      });

      if (error) throw error;

      await sendPasswordResetCode({
        recipient: account.whatsappRecipient,
        userName: account.user.name,
        userEmail: account.email,
        code,
      });
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Password reset request failed:', error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
