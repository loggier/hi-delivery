import { NextResponse } from 'next/server';

import { sendOrderStatusWebPush } from '@/lib/push-order-events';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      orderId?: string;
      status?: string;
    };

    if (!payload.orderId || !payload.status) {
      return NextResponse.json(
        { message: 'orderId y status son requeridos.' },
        { status: 400 },
      );
    }

    const result = await sendOrderStatusWebPush({
      orderId: payload.orderId,
      status: payload.status,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudieron enviar las notificaciones de estado.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
