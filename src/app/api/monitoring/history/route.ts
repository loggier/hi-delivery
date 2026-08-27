import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { createSupabaseAdminClient, resolveSupabaseSchema } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const historyBody = z.object({
  riderId: z.string().trim().min(1).max(120),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
}).strict();

const MAX_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_POINTS = 5000;

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAdminOperationSession();
    const input = historyBody.parse(await request.json());
    const start = Date.parse(input.startAt);
    const end = Date.parse(input.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end - start > MAX_RANGE_MS) {
      return NextResponse.json({ message: 'El rango debe ser válido y no superar 7 días.' }, { status: 400 });
    }

    const { data, error } = await createSupabaseAdminClient()
      .schema(resolveSupabaseSchema())
      .from('rider_location_history')
      .select('id, rider_id, latitude, longitude, speed, course, recorded_at, source')
      .eq('rider_id', input.riderId)
      .gte('recorded_at', new Date(start).toISOString())
      .lte('recorded_at', new Date(end).toISOString())
      .order('recorded_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(MAX_POINTS + 1);

    if (error) throw error;
    const points = [...(data ?? [])]
      .sort((left, right) => String(left.recorded_at).localeCompare(String(right.recorded_at)) || Number(left.id) - Number(right.id))
      .slice(0, MAX_POINTS);
    return NextResponse.json({ points, truncated: (data ?? []).length > MAX_POINTS }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError) return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
    return NextResponse.json({ message: 'No se pudo consultar el historial.' }, { status: 500 });
  }
}
