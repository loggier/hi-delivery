import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyRiderLocationToken } from '@/lib/rider-location-token';

const pointSchema = z.object({
  event_id: z.string().uuid(),
  recorded_at: z.string().datetime({ offset: true }),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  speed_mps: z.number().finite().min(0).optional(),
  heading_deg: z.number().finite().min(0).lt(360).optional(),
  accuracy_m: z.number().finite().min(0).optional(),
  altitude_m: z.number().finite().optional(),
  sequence: z.number().int().nonnegative().optional(),
  is_mock: z.boolean().optional(),
});

const ingestRequestSchema = z.object({
  batch_id: z.string().uuid(),
  device_id: z.string().uuid(),
  app_version: z.string().trim().max(50).optional(),
  points: z.array(pointSchema).min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';
    const tokenPayload = verifyRiderLocationToken(token);

    if (!tokenPayload) {
      return NextResponse.json({ message: 'Token de ubicación inválido o expirado.' }, { status: 401 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 128 * 1024) {
      return NextResponse.json({ message: 'El lote de ubicaciones es demasiado grande.' }, { status: 413 });
    }

    const rawBody = await request.text();
    if (rawBody.length > 128 * 1024) {
      return NextResponse.json({ message: 'El lote de ubicaciones es demasiado grande.' }, { status: 413 });
    }

    const parsed = ingestRequestSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success || parsed.data.device_id !== tokenPayload.deviceId) {
      return NextResponse.json({ message: 'Lote de ubicaciones inválido.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.rpc('ingest_rider_location_batch', {
      p_rider_id: tokenPayload.riderId,
      p_batch_id: parsed.data.batch_id,
      p_device_id: parsed.data.device_id,
      p_points: parsed.data.points,
      p_app_version: parsed.data.app_version ?? null,
    });

    if (error) {
      console.error('Rider location ingestion failed:', error.message);
      return NextResponse.json({ message: 'No se pudo registrar la ubicación.' }, { status: 502 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'JSON inválido.' }, { status: 400 });
    }

    console.error('Rider location ingestion error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ message: 'No se pudo registrar la ubicación.' }, { status: 500 });
  }
}
