import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMonitoringSnapshot, useMonitoringSnapshot } from '@/app/(admin)/monitoring/_hooks/use-monitoring-snapshot';
import { useMonitoringRealtime } from '@/app/(admin)/monitoring/_hooks/use-monitoring-realtime';

const channels: FakeChannel[] = [];
type Handler = (payload: unknown) => void;
class FakeChannel {
  table: string | undefined;
  handler: Handler | undefined;
  statusHandler: ((status: string) => void) | undefined;
  on(_event: string, filter: { table: string }, handler: Handler) { this.table = filter.table; this.handler = handler; return this; }
  subscribe(handler: (status: string) => void) { this.statusHandler = handler; channels.push(this); return this; }
}
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ channel: () => new FakeChannel(), removeChannel: vi.fn() }) }));

const snapshot = {
  serverTimestamp: '2025-01-01T00:00:00.000Z',
  dataHealth: { schema: 'healthy', disabledRules: [] },
  thresholds: { unassignedCriticalMinutes: 10, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 10, meaningfulMovementMeters: 20, source: 'settings' },
  kpis: { openOrders: 0, unassigned: 0, onTheWay: 0, atRisk: 0, ridersOnline: 1, available: 1, occupied: 0, noSignal: 0 },
  incidents: [], orders: [], riders: [{ id: 'r1', activeForOrders: true, lastLocationReceivedAt: null, lastLocationUpdate: null }],
};

describe('monitoring data hooks', () => {
  beforeEach(() => { vi.restoreAllMocks(); channels.length = 0; });

  it('POSTs the exact filter with same-origin credentials and no-store cache', async () => {
    const response = new Response(JSON.stringify(snapshot), { status: 200 });
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    await fetchMonitoringSnapshot({ zoneId: 'z1', search: ' rider ' });
    expect(request).toHaveBeenCalledWith('/api/monitoring/snapshot', expect.objectContaining({ method: 'POST', credentials: 'same-origin', cache: 'no-store', body: JSON.stringify({ zoneId: 'z1', search: ' rider ' }) }));
  });

  it('retains the previous snapshot and reports stale health after a refresh failure', async () => {
    const request = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify(snapshot), { status: 200 }))
      .mockRejectedValue(new Error('offline'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const result = renderHook(() => useMonitoringSnapshot({}), { wrapper });
    await waitFor(() => expect(result.result.current.snapshot).toEqual(snapshot));
    await act(async () => { await result.result.current.refetch(); });
    expect(result.result.current.snapshot).toEqual(snapshot);
    expect(result.result.current.error).toBeInstanceOf(Error);
    expect(result.result.current.isError).toBe(true);
    expect(result.result.current.health.snapshot).toBe('stale');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('subscribes only to riders, exposes immutable patches, and degrades on channel errors', async () => {
    const result = renderHook(() => useMonitoringRealtime());
    expect(result.result.current).toBeDefined();
    expect(channels[0]?.table).toBe('riders');
    expect(channels).toHaveLength(1);
    act(() => channels[0].statusHandler?.('SUBSCRIBED'));
    expect(result.result.current.realtimeStatus).toBe('connected');
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 19.4, last_longitude: -99.1, last_speed: 4, last_course: 180 } }));
    expect(result.result.current.locationPatches.get('r1')).toMatchObject({ riderId: 'r1', latitude: 19.4, longitude: -99.1 });
    act(() => channels[0].statusHandler?.('CHANNEL_ERROR'));
    expect(result.result.current.realtimeStatus).toBe('degraded');
  });
});
