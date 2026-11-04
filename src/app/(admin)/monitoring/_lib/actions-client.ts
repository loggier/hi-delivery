// Client for the existing monitoring action route. It only maps to actions that already exist
// on the server: reassign_order (manual assignment or redispatch) and pause_rider.

export type MonitoringActionRequest =
  | { type: 'reassign_order'; orderId: string; expectedRiderId: string | null; riderId: string | null; reason: string }
  | { type: 'pause_rider'; riderId: string; expectedActive: boolean; reason: string };

export class MonitoringActionRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MonitoringActionRequestError';
    this.status = status;
  }
}

export async function postMonitoringAction(request: MonitoringActionRequest): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/monitoring/actions', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new MonitoringActionRequestError('No se pudo conectar con el servidor.', 0);
  }
  if (response.ok) return;
  let message = 'No se pudo completar la acción.';
  try {
    const payload = (await response.json()) as { message?: unknown };
    if (typeof payload.message === 'string' && payload.message.trim()) message = payload.message;
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  throw new MonitoringActionRequestError(message, response.status);
}
