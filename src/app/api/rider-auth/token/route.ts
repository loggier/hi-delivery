import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/auth-utils';
import { createRiderLocationToken, TOKEN_TTL_SECONDS } from '@/lib/rider-location-token';

const tokenRequestSchema = z.object({
  phone: z.string().trim().min(10).max(20),
  password: z.string().min(1).max(200),
  deviceId: z.string().trim().min(1).max(128),
});

function phoneCandidates(value: string) {
  const digits = value.replace(/\D/g, '');
  const candidates = new Set([value.trim(), digits]);

  if (digits.length === 10) {
    candidates.add(`+52${digits}`);
    candidates.add(`52${digits}`);
  } else if (digits.length === 12 && digits.startsWith('52')) {
    const local = digits.slice(2);
    candidates.add(local);
    candidates.add(`+52${local}`);
  }

  return [...candidates].filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const parsed = tokenRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Datos de acceso inválidos.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: riders, error: riderError } = await supabaseAdmin
      .from('riders')
      .select('id, user_id, status, phone_e164')
      .in('phone_e164', phoneCandidates(parsed.data.phone))
      .limit(1);

    if (riderError || !riders?.length) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    const rider = riders[0] as { id: string; user_id: string; status: string; phone_e164: string };
    const allowedStatus = ['approved', 'active', 'aprobado', 'activo'].includes(
      rider.status.trim().toLowerCase(),
    );
    if (!allowedStatus) {
      return NextResponse.json(
        { message: 'La cuenta no está habilitada para iniciar sesión.' },
        { status: 403 },
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, password, status')
      .eq('id', rider.user_id)
      .single();

    if (userError || !user?.password || user.status !== 'ACTIVE') {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    if (!(await verifyPassword(parsed.data.password, user.password))) {
      return NextResponse.json({ message: 'Credenciales inválidas.' }, { status: 401 });
    }

    const token = createRiderLocationToken({
      riderId: rider.id,
      deviceId: parsed.data.deviceId,
      tokenId: crypto.randomUUID(),
    });

    return NextResponse.json({
      accessToken: token,
      expiresIn: TOKEN_TTL_SECONDS,
      riderId: rider.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('RIDER_LOCATION_TOKEN_SECRET')) {
      console.error('Rider location token secret is not configured.');
      return NextResponse.json({ message: 'Servicio de ubicación no configurado.' }, { status: 503 });
    }

    console.error('Rider location token error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ message: 'No se pudo iniciar la sesión de ubicación.' }, { status: 500 });
  }
}
