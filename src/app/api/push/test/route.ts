import { NextResponse } from 'next/server';

import { sendPushToRiders, sendPushToWebUsers } from '@/lib/push-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type TestPushPayload = {
  channel?: 'rider' | 'web';
  riderIds?: string[];
  userIds?: string[];
  adminBroadcast?: boolean;
  title?: string;
  body?: string;
  orderId?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TestPushPayload;
    const title = payload.title?.trim();
    const body = payload.body?.trim();

    if (!payload.channel || !title || !body) {
      return NextResponse.json(
        { message: 'channel, title y body son requeridos.' },
        { status: 400 },
      );
    }

    if (payload.channel === 'rider') {
      const riderIds = Array.from(
        new Set((payload.riderIds ?? []).map((value) => value?.trim()).filter(Boolean)),
      );

      if (!riderIds.length) {
        return NextResponse.json(
          { message: 'Debes seleccionar al menos un rider.' },
          { status: 400 },
        );
      }

      const result = await sendPushToRiders({
        riderIds,
        title,
        body,
        data: {
          kind: 'manual_test',
          orderId: payload.orderId?.trim() || undefined,
        },
      });

      return NextResponse.json(
        { ...result, targetCount: riderIds.length },
        { status: 200 },
      );
    }

    let userIds = Array.from(
      new Set((payload.userIds ?? []).map((value) => value?.trim()).filter(Boolean)),
    );

    if (payload.adminBroadcast) {
      const supabaseAdmin = createSupabaseAdminClient();
      const { data: adminUsers, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role_id', 'role-admin')
        .eq('status', 'ACTIVE')
        .not('web_push_token', 'is', null);

      if (error) {
        throw error;
      }

      userIds = (adminUsers ?? []).map((row) => row.id as string);
    }

    if (!userIds.length) {
      return NextResponse.json(
        { message: 'Debes seleccionar al menos un usuario web.' },
        { status: 400 },
      );
    }

    const result = await sendPushToWebUsers({
      userIds,
      title,
      body,
      data: {
        kind: 'manual_test',
        orderId: payload.orderId?.trim() || undefined,
      },
    });

    return NextResponse.json(
      { ...result, targetCount: userIds.length },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo enviar la notificación de prueba.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
