import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminSessionError, requireAdminOperationSession } from '@/lib/auth/admin-session';
import { getMonitoringIncidentForOperation, isConditionActive, transitionMonitoringIncident } from '@/lib/monitoring/incident-repository';

const bodySchema = z.discriminatedUnion('action', [z.object({ action: z.literal('attend') }).strict(), z.object({ action: z.literal('request_close'), reason: z.string().trim().min(3).max(300) }).strict()]);
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminOperationSession();
    const id = Number((await context.params).id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
    const body = bodySchema.parse(await request.json());
    const incident = await getMonitoringIncidentForOperation(id);
    if (!incident) return NextResponse.json({ message: 'Incidente no encontrado.' }, { status: 404 });
    const conditionActive = body.action === 'request_close' ? await isConditionActive(incident.conditionKey, { orderId: incident.orderId, riderId: incident.riderId }) : undefined;
    const result = await transitionMonitoringIncident({ incident, action: body.action, reason: body.action === 'request_close' ? body.reason : undefined, actorId: actor.id, conditionActive });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminSessionError) return NextResponse.json({ message: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ message: 'Solicitud inválida.' }, { status: 400 });
    if (error instanceof Error && error.message === 'stale incident') return NextResponse.json({ message: 'El incidente cambió. Actualiza la cola.' }, { status: 409 });
    return NextResponse.json({ message: 'No se pudo actualizar el incidente.' }, { status: 500 });
  }
}
