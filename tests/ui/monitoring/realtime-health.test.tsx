import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMonitoringSnapshot, monitoringSnapshotQueryKey, useMonitoringSnapshot } from '@/app/(admin)/monitoring/_hooks/use-monitoring-snapshot';
import { useMonitoringRealtime } from '@/app/(admin)/monitoring/_hooks/use-monitoring-realtime';
import { useMonitoringController } from '@/app/(admin)/monitoring/_hooks/use-monitoring-controller';

const channels: FakeChannel[] = [];
const supabase = vi.hoisted(() => ({ removeChannel: vi.fn() }));
type Handler = (payload: unknown) => void;
class FakeChannel {
  table: string | undefined;
  handler: Handler | undefined;
  statusHandler: ((status: string) => void) | undefined;
  on(_event: string, filter: { table: string }, handler: Handler) { this.table = filter.table; this.handler = handler; return this; }
  subscribe(handler: (status: string) => void) { this.statusHandler = handler; channels.push(this); return this; }
}
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ channel: () => new FakeChannel(), removeChannel: supabase.removeChannel }) }));

const snapshot = {
  serverTimestamp: '2025-01-01T00:00:00.000Z',
  dataHealth: { schema: 'healthy', disabledRules: [] },
  thresholds: { unassignedCriticalMinutes: 10, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 10, meaningfulMovementMeters: 20, source: 'settings' },
  kpis: { openOrders: 0, unassigned: 0, onTheWay: 0, atRisk: 0, ridersOnline: 1, available: 1, occupied: 0, noSignal: 0 },
  incidents: [], orders: [], riders: [{ id: 'r1', activeForOrders: true, lastLocationReceivedAt: null, lastLocationUpdate: null }],
};

describe('monitoring data hooks', () => {
  beforeEach(() => { vi.restoreAllMocks(); channels.length = 0; supabase.removeChannel.mockReset(); });

  it('uses the filter as the second query key segment', () => {
    const filter = { risk: 'atRisk' as const };
    expect(monitoringSnapshotQueryKey(filter)).toEqual(['monitoring-snapshot', filter]);
  });

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

  it('keeps errors associated with their filter when responses arrive out of order', async () => {
    let resolveA: ((response: Response) => void) | undefined;
    let rejectA: ((error: Error) => void) | undefined;
    let resolveB: ((response: Response) => void) | undefined;
    const request = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const filter = JSON.parse(String(init?.body)) as { zoneId?: string };
      return new Promise<Response>((resolve, reject) => {
        if (filter.zoneId === 'a') { resolveA = resolve; rejectA = reject; }
        else { resolveB = resolve; }
      });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const result = renderHook(({ filter }: { filter: { zoneId: string } }) => useMonitoringSnapshot(filter), { initialProps: { filter: { zoneId: 'a' } }, wrapper });
    await waitFor(() => expect(resolveA).toBeDefined());
    result.rerender({ filter: { zoneId: 'b' } });
    await waitFor(() => expect(resolveB).toBeDefined());
    resolveB?.(new Response(JSON.stringify({ ...snapshot, serverTimestamp: '2026-08-26T12:01:00.000Z' }), { status: 200 }));
    await waitFor(() => expect(result.result.current.snapshot?.serverTimestamp).toBe('2026-08-26T12:01:00.000Z'));
    rejectA?.(new Error('old request failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.result.current.isError).toBe(false);
    expect(result.result.current.health.snapshot).toBe('fresh');
  });

  it('subscribes only to riders, exposes immutable patches, and degrades on channel errors', async () => {
    const result = renderHook(() => useMonitoringRealtime());
    expect(result.result.current).toBeDefined();
    expect(channels[0]?.table).toBe('riders');
    expect(channels).toHaveLength(1);
    act(() => channels[0].statusHandler?.('SUBSCRIBED'));
    expect(result.result.current.realtimeStatus).toBe('connected');
    const currentReceivedAt = new Date().toISOString();
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 19.4, last_longitude: -99.1, last_speed: 4, last_course: 180, last_location_received_at: currentReceivedAt } }));
    expect(result.result.current.locationPatches.get('r1')).toMatchObject({ riderId: 'r1', latitude: 19.4, longitude: -99.1 });
    act(() => channels[0].statusHandler?.('CHANNEL_ERROR'));
    expect(result.result.current.realtimeStatus).toBe('degraded');
    act(() => channels[0].handler?.({ eventType: 'INSERT', new: { id: 'r2', last_latitude: 19.4, last_longitude: -99.1 } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: ' ', last_latitude: 19.4, last_longitude: -99.1 } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r3', last_latitude: 91, last_longitude: -99.1 } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r4', last_latitude: 19.4, last_longitude: -99.1, last_location_received_at: new Date(Date.now() + 4 * 60_000).toISOString() } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r5', last_latitude: 19.4, last_longitude: -99.1, last_location_received_at: new Date(Date.now() + 6 * 60_000).toISOString() } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r6', last_latitude: 19.4, last_longitude: -99.1, last_location_received_at: 'invalid' } }));
    expect(result.result.current.locationPatches.has('r2')).toBe(false);
    expect(result.result.current.locationPatches.has('r3')).toBe(false);
    expect(result.result.current.locationPatches.has('r4')).toBe(true);
    expect(result.result.current.locationPatches.has('r5')).toBe(false);
    expect(result.result.current.locationPatches.has('r6')).toBe(false);
  });

  it('does not refetch or invalidate the snapshot when a rider update arrives', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const result = renderHook(() => ({ snapshot: useMonitoringSnapshot({}), realtime: useMonitoringRealtime() }), { wrapper });
    await waitFor(() => expect(result.result.current.snapshot.snapshot).toEqual(snapshot));
    const refetch = vi.spyOn(result.result.current.snapshot, 'refetch');

    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 19, last_longitude: -99, last_location_received_at: new Date().toISOString() } }));
    await waitFor(() => expect(result.result.current.realtime.locationPatches.has('r1')).toBe(true));
    expect(request).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    result.unmount();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(supabase.removeChannel).toHaveBeenCalledWith(channels[0]);
  });

  it('ignores missing timestamps and out-of-order patches while accepting equal timestamps', async () => {
    const result = renderHook(() => useMonitoringRealtime());
    const newer = '2026-08-26T12:00:00.000Z';
    const older = '2026-08-26T11:59:00.000Z';
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 19, last_longitude: -99 } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 20, last_longitude: -98, last_location_received_at: newer } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 21, last_longitude: -97, last_location_received_at: older } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r1', last_latitude: 22, last_longitude: -96, last_location_received_at: newer } }));
    await waitFor(() => expect(result.result.current.locationPatches.get('r1')).toMatchObject({ latitude: 22, longitude: -96, receivedAt: newer }));
    expect(result.result.current.lastRealtimeEventAt).toBe(newer);
  });

  it('keeps the global realtime timestamp at the maximum accepted event', async () => {
    const result = renderHook(() => useMonitoringRealtime());
    const recent = new Date(Date.now() - 60_000).toISOString();
    const older = new Date(Date.now() - 120_000).toISOString();
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r-a', last_latitude: 19, last_longitude: -99, last_location_received_at: recent } }));
    act(() => channels[0].handler?.({ eventType: 'UPDATE', new: { id: 'r-b', last_latitude: 20, last_longitude: -98, last_location_received_at: older } }));
    await waitFor(() => expect(result.result.current.lastRealtimeEventAt).toBe(recent));
  });

  it('selects entities and replaces the filter through the public controller contract', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const result = renderHook(() => useMonitoringController({ zoneId: 'z1', search: 'x' }), { wrapper });
    act(() => result.result.current.selectKpi('occupied'));
    expect(result.result.current.filter).toEqual({ risk: 'occupied' });
    act(() => result.result.current.selectIncident('i1'));
    expect(result.result.current.selection).toEqual({ kind: 'incident', id: 'i1' });
    act(() => result.result.current.selectOrder('o1'));
    expect(result.result.current.selection).toEqual({ kind: 'order', id: 'o1' });
    act(() => result.result.current.selectRider('r1'));
    expect(result.result.current.selection).toEqual({ kind: 'rider', id: 'r1' });
    act(() => result.result.current.clearSelection());
    expect(result.result.current.selection).toBeNull();
  });
});
