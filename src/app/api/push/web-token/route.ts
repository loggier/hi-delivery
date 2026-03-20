import { NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      userId?: string;
      token?: string | null;
    };

    if (!payload.userId) {
      return NextResponse.json(
        { message: 'userId es requerido.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        web_push_token: payload.token ?? null,
        web_push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', payload.userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo registrar el token web.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
