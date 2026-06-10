import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notification-service';
import type { NotificationChannel } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const templateId = String(body?.templateId ?? '').trim();
    const channel = String(body?.channel ?? '').trim() as NotificationChannel;
    const recipient = String(body?.recipient ?? '').trim();
    const variables =
      body?.variables && typeof body.variables === 'object'
        ? body.variables as Record<string, unknown>
        : {};

    if (!templateId) {
      return NextResponse.json({ message: 'La plantilla es requerida.' }, { status: 400 });
    }

    if (!channel) {
      return NextResponse.json({ message: 'El canal es requerido.' }, { status: 400 });
    }

    if (!recipient) {
      return NextResponse.json({ message: 'El destinatario es requerido.' }, { status: 400 });
    }

    const result = await sendNotification({
      templateId,
      channel,
      recipient,
      variables,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo enviar la prueba.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
