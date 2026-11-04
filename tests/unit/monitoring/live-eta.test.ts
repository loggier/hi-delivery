import { describe, expect, it, vi } from 'vitest';
import { createLiveEtaResolver, routeDurationSeconds, type LiveEtaRequest } from '@/lib/monitoring/live-eta';

// Synthetic coordinates and ids only.
const request = (orderId: string, fromLatitude = 25.68): LiveEtaRequest => ({
  orderId,
  from: { latitude: fromLatitude, longitude: -100.31 },
  to: { latitude: 25.7, longitude: -100.3 },
});

const okResponse = (duration: number) => new Response(JSON.stringify({ code: 'Ok', routes: [{ duration, distance: 1200 }] }), { status: 200 });

function clock(start = Date.parse('2026-08-26T12:00:00.000Z')) {
  let current = start;
  return { now: () => current, advance: (ms: number) => { current += ms; } };
}

describe('routeDurationSeconds', () => {
  it('accepts only a finite, non-negative duration from an Ok route', () => {
    expect(routeDurationSeconds({ code: 'Ok', routes: [{ duration: 420 }] })).toBe(420);
    expect(routeDurationSeconds({ code: 'NoRoute', routes: [] })).toBeNull();
    expect(routeDurationSeconds({ code: 'Ok', routes: [{ duration: -1 }] })).toBeNull();
    expect(routeDurationSeconds({ code: 'Ok', routes: [{ duration: 'x' }] })).toBeNull();
    expect(routeDurationSeconds(null)).toBeNull();
  });
});

describe('createLiveEtaResolver', () => {
  it('returns the live duration with the time it was computed', async () => {
    const time = clock();
    const fetchImpl = vi.fn(async (_url: string) => okResponse(420));
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test/route/v1/driving', warn: vi.fn() });
    const result = await resolver.resolve([request('o1')], new Set(['o1']));
    expect(result.get('o1')).toEqual({ durationSeconds: 420, computedAt: '2026-08-26T12:00:00.000Z' });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('-100.31,25.68;-100.3,25.7');
  });

  it('reuses a fresh value for 60 seconds without calling OSRM again', async () => {
    const time = clock();
    const fetchImpl = vi.fn(async () => okResponse(300));
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn: vi.fn() });
    await resolver.resolve([request('o1')], new Set(['o1']));
    time.advance(59_000);
    await resolver.resolve([request('o1')], new Set(['o1']));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    time.advance(2_000);
    await resolver.resolve([request('o1')], new Set(['o1']));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('caps OSRM calls at 30 per snapshot; the rest show the last valid value or nothing', async () => {
    const time = clock();
    const fetchImpl = vi.fn(async () => okResponse(240));
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn: vi.fn(), maxCallsPerSnapshot: 30 });
    const ids = Array.from({ length: 31 }, (_, index) => `o${index}`);
    const active = new Set(ids);
    const first = await resolver.resolve(ids.map((id) => request(id)), active);
    expect(fetchImpl).toHaveBeenCalledTimes(30);
    expect(first.get('o30')).toBeNull();

    // Past the cache TTL: the first 30 are refreshed, o30 has never had a valid value so it stays null.
    time.advance(61_000);
    fetchImpl.mockImplementation(async () => okResponse(900));
    const second = await resolver.resolve(ids.map((id) => request(id)), active);
    expect(fetchImpl).toHaveBeenCalledTimes(60);
    expect(second.get('o30')).toBeNull();
    expect(second.get('o0')?.durationSeconds).toBe(900);
  });

  it('shows the last valid value for an order that does not fit in the call budget', async () => {
    const time = clock();
    const fetchImpl = vi.fn(async () => okResponse(120));
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn: vi.fn(), maxCallsPerSnapshot: 1 });
    // o2 gets a valid value in an earlier snapshot.
    await resolver.resolve([request('o2')], new Set(['o1', 'o2']));
    time.advance(61_000);
    // o1 takes the only call of this snapshot; o2 is over budget and reuses its last valid value.
    const result = await resolver.resolve([request('o1'), request('o2')], new Set(['o1', 'o2']));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.get('o1')?.durationSeconds).toBe(120);
    expect(result.get('o2')?.durationSeconds).toBe(120);
  });

  it('returns null for a failing order without blocking the others', async () => {
    const time = clock();
    const warn = vi.fn();
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls === 1 ? new Response('down', { status: 503 }) : okResponse(180);
    });
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn });
    const result = await resolver.resolve([request('o1'), request('o2', 25.9)], new Set(['o1', 'o2']));
    expect(result.get('o1')).toBeNull();
    expect(result.get('o2')?.durationSeconds).toBe(180);
    expect(warn).toHaveBeenCalledWith('monitoring live eta: osrm responded 503');
  });

  it('gives up after the timeout and logs no identifiers or coordinates', async () => {
    const time = clock();
    const warn = vi.fn();
    const hangingFetch = (_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    const resolver = createLiveEtaResolver({ fetchImpl: hangingFetch as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn, timeoutMs: 10 });
    const result = await resolver.resolve([request('order-secret-id')], new Set(['order-secret-id']));
    expect(result.get('order-secret-id')).toBeNull();
    expect(warn).toHaveBeenCalledWith('monitoring live eta: osrm timeout');
    for (const [message] of warn.mock.calls) {
      expect(String(message)).not.toContain('order-secret-id');
      expect(String(message)).not.toContain('25.68');
    }
  });

  it('treats a payload without a valid route as not available', async () => {
    const time = clock();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ code: 'NoRoute', routes: [] }), { status: 200 }));
    const resolver = createLiveEtaResolver({ fetchImpl: fetchImpl as unknown as typeof fetch, now: time.now, baseUrl: 'https://osrm.test', warn: vi.fn() });
    const result = await resolver.resolve([request('o1')], new Set(['o1']));
    expect(result.get('o1')).toBeNull();
  });
});
