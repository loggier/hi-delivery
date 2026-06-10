import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildResetLink,
  createResetCode,
  createResetToken,
  findRiderResetRecipientByPhone,
  findWebResetRecipientByPhone,
  getPasswordResetBaseUrl,
  getRequestIp,
  getResetExpiresAt,
  hashResetSecret,
  hasRecentPasswordResetRequests,
  sendPasswordResetCode,
  sendPasswordResetLink,
} from '@/lib/password-reset';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const requestSchema = z.object({
  channel: z.enum(['web', 'app']),
  phone: z.string().min(8).max(30),
});

const GENERIC_RESPONSE = {
  message: 'Si el teléfono está registrado, enviaremos instrucciones por WhatsApp.',
};

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos inválidos.' }, { status: 400 });
    }

    const { channel, phone } = parsed.data;
    const recipient = channel === 'web'
      ? await findWebResetRecipientByPhone(phone)
      : await findRiderResetRecipientByPhone(phone);

    if (!recipient) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    if (await hasRecentPasswordResetRequests(recipient.recipient)) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const supabase = createSupabaseAdminClient();
    const expiresAt = getResetExpiresAt();
    const requestIp = getRequestIp(request);

    if (channel === 'web') {
      const token = createResetToken();
      const baseUrl = await getPasswordResetBaseUrl(new URL(request.url).origin);
      const resetLink = buildResetLink(baseUrl, token);

      const { error } = await supabase.from('password_reset_requests').insert({
        user_id: recipient.user.id,
        target_type: recipient.targetType,
        delivery_channel: 'whatsapp',
        recipient: recipient.recipient,
        token_hash: hashResetSecret(token),
        expires_at: expiresAt.toISOString(),
        request_ip: requestIp,
      });

      if (error) throw error;

      await sendPasswordResetLink({
        recipient: recipient.recipient,
        userName: recipient.user.name,
        resetLink,
        expiresAt,
      });
    } else {
      const code = createResetCode();

      const { error } = await supabase.from('password_reset_requests').insert({
        user_id: recipient.user.id,
        target_type: recipient.targetType,
        delivery_channel: 'whatsapp',
        recipient: recipient.recipient,
        code_hash: hashResetSecret(code),
        expires_at: expiresAt.toISOString(),
        request_ip: requestIp,
      });

      if (error) throw error;

      await sendPasswordResetCode({
        recipient: recipient.recipient,
        userName: recipient.user.name,
        code,
      });
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('Password reset request failed:', error);
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
