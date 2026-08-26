import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { buildMonitoringSnapshot, parseMonitoringFilter } from '@/lib/monitoring/snapshot-service';

export const dynamic = 'force-dynamic';

async function handleSnapshot(request: Request): Promise<Response> {
  try {
    await requireAdminOperationSession();
    const rawBody = await request.text();
    let filterInput: unknown;
    if (rawBody.trim()) {
      try {
        filterInput = JSON.parse(rawBody) as unknown;
      } catch {
        throw new Error('invalid filter');
      }
    } else {
      filterInput = new URL(request.url).searchParams;
    }
    const filter = parseMonitoringFilter(filterInput);
    const snapshot = await buildMonitoringSnapshot({ filter });
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    if (error instanceof ZodError || (error instanceof Error && error.message === 'invalid filter')) return NextResponse.json({ message: 'Filtros inválidos.' }, { status: 400 });
    return NextResponse.json({ message: 'No se pudo actualizar la operación.' }, { status: 500 });
  }
}

export const POST = handleSnapshot;
