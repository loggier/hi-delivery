import type { LiveEta } from './types';

// Live ETA for active orders with an assigned rider: rider's last reported position -> delivery address,
// using the same OSRM route service the POS and shipping flows already use.
// Limits keep OSRM load bounded: a short per-order cache, a cap of calls per snapshot, and a hard timeout.

export const LIVE_ETA_CACHE_TTL_MS = 60_000;
export const LIVE_ETA_MAX_CALLS_PER_SNAPSHOT = 30;
export const LIVE_ETA_TIMEOUT_MS = 3_000;
const DEFAULT_OSRM_ROUTE_URL = 'https://nominatim.vemontech.com/route/v1/driving';

export type LiveEtaPoint = { latitude: number; longitude: number };
export type LiveEtaRequest = { orderId: string; from: LiveEtaPoint; to: LiveEtaPoint };

export interface LiveEtaResolver {
  resolve(requests: readonly LiveEtaRequest[], activeOrderIds: ReadonlySet<string>): Promise<Map<string, LiveEta | null>>;
}

export type LiveEtaOptions = {
  baseUrl: string;
  fetchImpl: typeof fetch;
  now: () => number;
  timeoutMs: number;
  ttlMs: number;
  maxCallsPerSnapshot: number;
  warn: (message: string) => void;
};

export function resolveOsrmBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const configured = env.OSRM_ROUTE_URL || env.NEXT_PUBLIC_OSRM_ROUTE_URL || DEFAULT_OSRM_ROUTE_URL;
  return configured.replace(/\/+$/, '');
}

// Accepts only a well-formed OSRM payload with a finite, non-negative route duration.
export function routeDurationSeconds(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as { code?: unknown; routes?: unknown };
  if (root.code !== 'Ok' || !Array.isArray(root.routes)) return null;
  const first = root.routes[0] as { duration?: unknown } | undefined;
  const duration = first?.duration;
  return typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? duration : null;
}

// One resolver per server process, so the per-order cache is shared across snapshot requests.
let sharedResolver: LiveEtaResolver | null = null;
export function getSharedLiveEtaResolver(): LiveEtaResolver {
  sharedResolver ??= createLiveEtaResolver();
  return sharedResolver;
}

export function createLiveEtaResolver(overrides: Partial<LiveEtaOptions> = {}): LiveEtaResolver {
  const options: LiveEtaOptions = {
    baseUrl: resolveOsrmBaseUrl(),
    fetchImpl: (input, init) => fetch(input, init),
    now: () => Date.now(),
    timeoutMs: LIVE_ETA_TIMEOUT_MS,
    ttlMs: LIVE_ETA_CACHE_TTL_MS,
    maxCallsPerSnapshot: LIVE_ETA_MAX_CALLS_PER_SNAPSHOT,
    warn: (message) => console.warn(message),
    ...overrides,
  };
  // Fresh values are reused for ttlMs. The last valid value per order is kept so that an order that
  // does not fit in this snapshot's call budget can still show the most recent real ETA.
  const fresh = new Map<string, { eta: LiveEta; expiresAt: number }>();
  const lastValid = new Map<string, LiveEta>();

  async function fetchOne(request: LiveEtaRequest): Promise<LiveEta | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const url = `${options.baseUrl}/${request.from.longitude},${request.from.latitude};${request.to.longitude},${request.to.latitude}?overview=false`;
      const response = await options.fetchImpl(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        options.warn(`monitoring live eta: osrm responded ${response.status}`);
        return null;
      }
      const duration = routeDurationSeconds((await response.json()) as unknown);
      if (duration === null) {
        options.warn('monitoring live eta: osrm payload without a valid route');
        return null;
      }
      return { durationSeconds: duration, computedAt: new Date(options.now()).toISOString() };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      options.warn(timedOut ? 'monitoring live eta: osrm timeout' : 'monitoring live eta: osrm request failed');
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async resolve(requests, activeOrderIds) {
      for (const orderId of [...fresh.keys()]) if (!activeOrderIds.has(orderId)) fresh.delete(orderId);
      for (const orderId of [...lastValid.keys()]) if (!activeOrderIds.has(orderId)) lastValid.delete(orderId);

      const results = new Map<string, LiveEta | null>();
      const pending: LiveEtaRequest[] = [];
      const nowMs = options.now();
      for (const request of requests) {
        const cached = fresh.get(request.orderId);
        if (cached && cached.expiresAt > nowMs) {
          results.set(request.orderId, cached.eta);
        } else if (pending.length < options.maxCallsPerSnapshot) {
          pending.push(request);
        } else {
          results.set(request.orderId, lastValid.get(request.orderId) ?? null);
        }
      }

      const outcomes = await Promise.all(pending.map((request) => fetchOne(request)));
      pending.forEach((request, index) => {
        const eta = outcomes[index];
        results.set(request.orderId, eta);
        if (eta) {
          fresh.set(request.orderId, { eta, expiresAt: options.now() + options.ttlMs });
          lastValid.set(request.orderId, eta);
        }
      });
      return results;
    },
  };
}
