import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushToRiders } from '@/lib/push-notifications';
import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';

const locationRequestSchema = z.object({
  riderId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    await requireAdminOperationSession();
    const parsed = locationRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'riderId es requerido.' },
        { status: 400 },
      );
    }

    const result = await sendPushToRiders({
      riderIds: [parsed.data.riderId],
      title: 'Reporta tu ubicación',
      body:
        'Tu ubicación no se ha actualizado. Abre la app para enviarla ahora.',
      data: { kind: 'location_request' },
    });

    return NextResponse.json({ ok: true, notification: { sent: result.sentCount > 0, sentCount: result.sentCount, warning: result.sentCount === 0 ? 'El rider no tiene un token disponible.' : undefined } }, { status: 200 });
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    return NextResponse.json({ message: 'No se pudo enviar la solicitud de ubicación.' }, { status: 500 });
  }
}
