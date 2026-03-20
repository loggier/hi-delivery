import { NextResponse } from 'next/server';

import { sendOrderEventPushes } from '@/lib/push-order-events';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      orderId?: string;
      type?: 'dispatch_wave' | 'manual_assignment';
      riderIds?: string[];
    };

    if (!payload.orderId || !payload.type) {
      return NextResponse.json(
        { message: 'orderId y type son requeridos.' },
        { status: 400 },
      );
    }

    const result = await sendOrderEventPushes({
      orderId: payload.orderId,
      type: payload.type,
      riderIds: payload.riderIds,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudieron enviar pushes.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
