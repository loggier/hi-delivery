import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  createRiderLocationToken,
  TOKEN_TTL_SECONDS,
  verifyRiderLocationRefreshToken,
} from '@/lib/rider-location-token';

const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().trim().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const parsed = refreshRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: 'Solicitud de renovación inválida.' }, { status: 400 });
    }

    const payload = verifyRiderLocationRefreshToken(parsed.data.refreshToken);
    if (!payload || payload.deviceId !== parsed.data.deviceId) {
      return NextResponse.json({ message: 'Refresh token inválido o expirado.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: rider, error } = await supabaseAdmin
      .from('riders')
      .select('id, status')
      .eq('id', payload.riderId)
      .maybeSingle();

    const allowedStatus = ['approved', 'active', 'aprobado', 'activo'].includes(
      rider?.status?.trim().toLowerCase() ?? '',
    );
    if (error || !rider || !allowedStatus) {
      return NextResponse.json({ message: 'La cuenta no está habilitada.' }, { status: 403 });
    }

    const accessToken = createRiderLocationToken({
      riderId: payload.riderId,
      deviceId: payload.deviceId,
      tokenId: crypto.randomUUID(),
    });

    return NextResponse.json({
      accessToken,
      expiresIn: TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('RIDER_LOCATION_TOKEN_SECRET')) {
      return NextResponse.json({ message: 'Servicio de ubicación no configurado.' }, { status: 503 });
    }
    return NextResponse.json({ message: 'No se pudo renovar la sesión de ubicación.' }, { status: 500 });
  }
}
