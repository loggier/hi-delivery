import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushToRiders } from '@/lib/push-notifications';

const locationRequestSchema = z.object({
  riderId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
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

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo enviar el push.';
    return NextResponse.json({ message }, { status: 500 });
  }
}