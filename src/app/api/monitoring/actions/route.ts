import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { executeMonitoringAction, MonitoringActionError } from '@/lib/monitoring/action-service';

const id = z.string().trim().min(1);
const reason = z.string().trim().min(3).max(300);
const schema = z.discriminatedUnion('type', [z.object({ type: z.literal('request_location'), riderId: id }), z.object({ type: z.literal('pause_rider'), riderId: id, expectedActive: z.boolean(), reason }), z.object({ type: z.literal('change_rider_zone'), riderId: id, expectedZoneId: z.string().nullable(), zoneId: id, reason }), z.object({ type: z.literal('reassign_order'), orderId: id, expectedRiderId: z.string().nullable(), riderId: z.string().nullable(), reason })]);
export async function POST(request: Request) { try { const actor = await requireAdminOperationSession(); const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ message: 'Solicitud de acción inválida.' }, { status: 400 }); const result = await executeMonitoringAction(parsed.data, actor.id); return NextResponse.json({ ok: true, result }); } catch (error) { if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status }); if (error instanceof MonitoringActionError) return NextResponse.json({ message: error.message }, { status: error.status }); return NextResponse.json({ message: 'No se pudo completar la acción.' }, { status: 500 }); } }
