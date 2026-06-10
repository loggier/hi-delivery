type EvolutionJson = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export type EvolutionConnectionState = {
  instanceName: string;
  state: string;
  raw: EvolutionJson;
};

export type EvolutionQrPayload = {
  pairingCode: string | null;
  qrCodeDataUrl: string | null;
  raw: EvolutionJson;
};

export type EvolutionSendTextPayload = {
  number: string;
  text: string;
};

export type EvolutionInstanceSummary = {
  ownerJid: string | null;
  profileName: string | null;
  connectionStatus: string | null;
  counts: {
    messages: number | null;
    contacts: number | null;
    chats: number | null;
  };
  raw: EvolutionJson;
};

function getEvolutionBaseUrl() {
  const baseUrl = process.env.EVOLUTION_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error('Falta configurar EVOLUTION_API_BASE_URL.');
  }
  return baseUrl.replace(/\/+$/, '');
}

function getEvolutionApiKey() {
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Falta configurar EVOLUTION_API_KEY.');
  }
  return apiKey;
}

async function evolutionRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${getEvolutionBaseUrl()}${path}`, {
    ...init,
    headers: {
      apikey: getEvolutionApiKey(),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string; error?: string } | null)?.message ||
          (payload as { message?: string; error?: string } | null)?.error ||
          `Evolution API respondió con estado ${response.status}.`;
    throw new Error(message);
  }

  return payload as EvolutionJson;
}

function normalizeQrDataUrl(raw: EvolutionJson): string | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate =
    (raw as Record<string, unknown>).base64 ??
    (raw as Record<string, unknown>).qrOrCode ??
    (raw as Record<string, unknown>).code ??
    null;

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return null;
  }

  const trimmed = candidate.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  if (trimmed.includes('base64,')) {
    return trimmed.startsWith('data:image/') ? trimmed : `data:image/png;base64,${trimmed.split('base64,').pop()}`;
  }

  const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 80;
  return looksLikeBase64 ? `data:image/png;base64,${trimmed}` : null;
}

export async function createEvolutionInstance(instanceName: string, number?: string) {
  const payload: Record<string, unknown> = {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    token: '',
  };

  if (number?.trim()) {
    payload.number = number.trim();
  }

  const raw = await evolutionRequest('/instance/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return {
    raw,
    pairingCode: typeof raw === 'object' && raw && 'pairingCode' in raw ? String((raw as Record<string, unknown>).pairingCode ?? '') || null : null,
    qrCodeDataUrl: normalizeQrDataUrl(raw),
  };
}

export async function getEvolutionConnectionState(instanceName: string): Promise<EvolutionConnectionState> {
  const raw = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(instanceName)}`, {
    method: 'GET',
  });

  const state =
    typeof raw === 'object' && raw && 'instance' in raw && raw.instance && typeof raw.instance === 'object'
      ? String((raw.instance as Record<string, unknown>).state ?? 'unknown')
      : typeof raw === 'object' && raw && 'state' in raw
        ? String((raw as Record<string, unknown>).state ?? 'unknown')
        : 'unknown';

  return {
    instanceName,
    state,
    raw,
  };
}

export async function getEvolutionInstanceSummary(instanceName: string): Promise<EvolutionInstanceSummary | null> {
  const raw = await evolutionRequest('/instance/fetchInstances', {
    method: 'GET',
  });

  if (!Array.isArray(raw)) {
    return null;
  }

  const instance = raw.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const itemRecord = item as Record<string, unknown>;
    const nestedInstance = itemRecord.instance;
    const nestedName =
      nestedInstance && typeof nestedInstance === 'object'
        ? (nestedInstance as Record<string, unknown>).instanceName
        : null;

    return (
      itemRecord.name === instanceName ||
      itemRecord.instanceName === instanceName ||
      nestedName === instanceName
    );
  });

  if (!instance || typeof instance !== 'object') {
    return null;
  }

  const record = instance as Record<string, unknown>;
  const counts = record._count && typeof record._count === 'object'
    ? (record._count as Record<string, unknown>)
    : {};

  return {
    ownerJid: typeof record.ownerJid === 'string' ? record.ownerJid : null,
    profileName: typeof record.profileName === 'string' ? record.profileName : null,
    connectionStatus: typeof record.connectionStatus === 'string' ? record.connectionStatus : null,
    counts: {
      messages: typeof counts.Message === 'number' ? counts.Message : null,
      contacts: typeof counts.Contact === 'number' ? counts.Contact : null,
      chats: typeof counts.Chat === 'number' ? counts.Chat : null,
    },
    raw: instance as EvolutionJson,
  };
}

export async function connectEvolutionInstance(instanceName: string, number?: string): Promise<EvolutionQrPayload> {
  const searchParams = new URLSearchParams();
  if (number?.trim()) {
    searchParams.set('number', number.trim());
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const raw = await evolutionRequest(`/instance/connect/${encodeURIComponent(instanceName)}${suffix}`, {
    method: 'GET',
  });

  return {
    pairingCode:
      typeof raw === 'object' && raw && 'pairingCode' in raw
        ? String((raw as Record<string, unknown>).pairingCode ?? '') || null
        : null,
    qrCodeDataUrl: normalizeQrDataUrl(raw),
    raw,
  };
}

export async function deleteEvolutionInstance(instanceName: string) {
  const raw = await evolutionRequest(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });

  return { raw };
}

export async function logoutEvolutionInstance(instanceName: string) {
  const raw = await evolutionRequest(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: 'DELETE',
  });

  return { raw };
}

export async function sendEvolutionTextMessage(
  instanceName: string,
  payload: EvolutionSendTextPayload,
) {
  const raw = await evolutionRequest(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: payload.number,
      text: payload.text,
    }),
  });

  return { raw };
}
