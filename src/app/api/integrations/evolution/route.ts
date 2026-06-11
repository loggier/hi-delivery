import { NextResponse } from 'next/server';
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  deleteEvolutionInstance,
  EvolutionApiError,
  getEvolutionConnectionState,
  getEvolutionInstanceSummary,
  logoutEvolutionInstance,
  sendEvolutionTextMessage,
} from '@/lib/evolution';

export const dynamic = 'force-dynamic';

function buildErrorResponse(error: unknown, status = 500) {
  if (error instanceof EvolutionApiError) {
    return NextResponse.json(
      {
        message: error.message,
        upstreamStatus: error.status,
        upstreamPath: error.path,
        upstreamHost: error.upstreamHost,
        causeCode: error.causeCode,
        causeMessage: error.causeMessage,
      },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return NextResponse.json({ message }, { status });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInstanceToClose(instanceName: string, attempts = 10, delayMs = 2500) {
  let state: Awaited<ReturnType<typeof getEvolutionConnectionState>> | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    state = await getEvolutionConnectionState(instanceName).catch(() => null);
    if (state?.state !== 'open') {
      return state;
    }
    await wait(delayMs);
  }

  return state;
}

async function deleteEvolutionInstanceWithRetry(instanceName: string, attempts = 3, delayMs = 2000) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await deleteEvolutionInstance(instanceName);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await wait(delayMs);
      }
    }
  }

  throw lastError;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const instance = url.searchParams.get('instance')?.trim();
    const mode = url.searchParams.get('mode')?.trim() || 'full';
    const number = url.searchParams.get('number')?.trim() || undefined;

    if (!instance) {
      return NextResponse.json({ message: 'El nombre de la instancia es requerido.' }, { status: 400 });
    }

    const state = await getEvolutionConnectionState(instance);
    const summary = mode === 'status'
      ? null
      : await getEvolutionInstanceSummary(instance).catch(() => null);
    let qrData: Awaited<ReturnType<typeof connectEvolutionInstance>> | null = null;

    if (mode === 'qr' || (mode === 'full' && state.state !== 'open')) {
      qrData = await connectEvolutionInstance(instance, number);
    }

    return NextResponse.json({
      instanceName: instance,
      state: state.state,
      connectionState: state,
      summary,
      qrCodeDataUrl: qrData?.qrCodeDataUrl ?? null,
      pairingCode: qrData?.pairingCode ?? null,
      raw: {
        state: state.raw,
        qr: qrData?.raw ?? null,
      },
    });
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action ?? '').trim();
    const instanceName = String(body?.instanceName ?? '').trim();
    const number = body?.number ? String(body.number).trim() : undefined;

    if (!action) {
      return NextResponse.json({ message: 'La acción es requerida.' }, { status: 400 });
    }

    if (!instanceName) {
      return NextResponse.json({ message: 'El nombre de la instancia es requerido.' }, { status: 400 });
    }

    if (action === 'create') {
      const created = await createEvolutionInstance(instanceName, number);
      const state = await getEvolutionConnectionState(instanceName).catch(() => null);
      const summary = await getEvolutionInstanceSummary(instanceName).catch(() => null);
      const qrData = created.qrCodeDataUrl
        ? created
        : await connectEvolutionInstance(instanceName, number).catch(() => null);

      return NextResponse.json({
        instanceName,
        state: state?.state ?? 'unknown',
        connectionState: state,
        summary,
        qrCodeDataUrl: created.qrCodeDataUrl ?? qrData?.qrCodeDataUrl ?? null,
        pairingCode: created.pairingCode ?? qrData?.pairingCode ?? null,
        raw: {
          create: created.raw,
          state: state?.raw ?? null,
          qr: qrData?.raw ?? null,
        },
      });
    }

    if (action === 'connect') {
      const qrData = await connectEvolutionInstance(instanceName, number);
      const state = await getEvolutionConnectionState(instanceName).catch(() => null);
      const summary = await getEvolutionInstanceSummary(instanceName).catch(() => null);

      return NextResponse.json({
        instanceName,
        state: state?.state ?? 'unknown',
        connectionState: state,
        summary,
        qrCodeDataUrl: qrData.qrCodeDataUrl,
        pairingCode: qrData.pairingCode,
        raw: {
          state: state?.raw ?? null,
          qr: qrData.raw,
        },
      });
    }

    if (action === 'sendText') {
      const messageNumber = String(body?.messageNumber ?? '').trim();
      const text = String(body?.text ?? '').trim();

      if (!messageNumber) {
        return NextResponse.json({ message: 'El número destino es requerido.' }, { status: 400 });
      }

      if (!text) {
        return NextResponse.json({ message: 'El mensaje es requerido.' }, { status: 400 });
      }

      const state = await getEvolutionConnectionState(instanceName).catch(() => null);
      if (state?.state !== 'open') {
        return NextResponse.json(
          { message: 'La instancia debe estar conectada antes de enviar mensajes.', state },
          { status: 409 },
        );
      }

      const sent = await sendEvolutionTextMessage(instanceName, {
        number: messageNumber,
        text,
      });

      return NextResponse.json({
        instanceName,
        state: state.state,
        sent: sent.raw,
      });
    }

    return NextResponse.json({ message: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return buildErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const instance = url.searchParams.get('instance')?.trim();

    if (!instance) {
      return NextResponse.json({ message: 'El nombre de la instancia es requerido.' }, { status: 400 });
    }

    const initialState = await getEvolutionConnectionState(instance).catch(() => null);
    let logout: Awaited<ReturnType<typeof logoutEvolutionInstance>> | null = null;
    let logoutError: string | null = null;

    if (initialState?.state === 'open') {
      try {
        logout = await logoutEvolutionInstance(instance);
      } catch (error) {
        logoutError = error instanceof Error ? error.message : 'No se pudo desconectar la instancia.';
      }

      await wait(1000);
    }

    const stateAfterLogout = initialState?.state === 'open'
      ? await waitForInstanceToClose(instance)
      : initialState;

    if (stateAfterLogout?.state === 'open') {
      return NextResponse.json(
        {
          message: logoutError
            ? `No se pudo desconectar la instancia: ${logoutError}`
            : 'La instancia sigue conectada. Intenta desconectar de nuevo antes de eliminar.',
          raw: {
            initialState: initialState?.raw ?? null,
            logout: logout?.raw ?? null,
            logoutError,
            stateAfterLogout: stateAfterLogout.raw,
          },
        },
        { status: 409 },
      );
    }

    const deleted = await deleteEvolutionInstanceWithRetry(instance);

    return NextResponse.json({
      instanceName: instance,
      message: initialState?.state === 'open'
        ? 'Instancia desconectada y eliminada correctamente.'
        : 'Instancia eliminada correctamente.',
      raw: {
        initialState: initialState?.raw ?? null,
        logout: logout?.raw ?? null,
        logoutError,
        stateAfterLogout: stateAfterLogout?.raw ?? null,
        delete: deleted.raw,
      },
    });
  } catch (error) {
    return buildErrorResponse(error);
  }
}
