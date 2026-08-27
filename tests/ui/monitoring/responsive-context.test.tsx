import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonitoringOperationsDesk } from '@/app/(admin)/monitoring/_components/monitoring-operations-desk';

const state = {
  snapshot: { serverTimestamp: '2026-08-26T12:00:00.000Z', dataHealth: { schema: 'healthy', disabledRules: [] }, thresholds: { unassignedCriticalMinutes: 10, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 10, meaningfulMovementMeters: 100, source: 'settings' }, kpis: { openOrders: 0, unassigned: 0, onTheWay: 0, atRisk: 0, ridersOnline: 0, available: 0, occupied: 0, noSignal: 0 }, incidents: [{ id: 1, conditionKey: 'x', type: 'gps-stale', priority: 'P1', status: 'open', orderId: null, riderId: null, firstDetectedAt: '2026-08-26T12:00:00.000Z', lastDetectedAt: '2026-08-26T12:00:00.000Z', attendingAt: null, resolvedAt: null, metadata: {} }], orders: [], riders: [] }, riders: [], selection: { kind: 'incident', id: '1' }, selectIncident: vi.fn(), selectOrder: vi.fn(), selectRider: vi.fn(), clearSelection: vi.fn(), selectKpi: vi.fn(), setFilter: vi.fn(), filter: {}, health: { realtime: 'connected', snapshot: 'fresh' }, isLoading: false, isError: false, error: null, isRefreshing: false, refetch: vi.fn(), locationPatches: new Map(), realtimeStatus: 'connected', lastRealtimeEventAt: null };
vi.mock('@/app/(admin)/monitoring/_hooks/use-monitoring-controller', () => ({ useMonitoringController: () => state }));
vi.mock('@/app/(admin)/monitoring/_components/operations-summary', () => ({ OperationsSummary: () => <div>summary</div> }));
vi.mock('@/app/(admin)/monitoring/_components/data-health-banner', () => ({ DataHealthBanner: () => <div>health</div> }));
vi.mock('@/app/(admin)/monitoring/_components/monitoring-filters', () => ({ MonitoringFilters: () => <div>filters</div> }));
vi.mock('@/app/(admin)/monitoring/_components/incident-queue', () => ({ IncidentQueue: ({ onSelect }: { onSelect: (value: { id: number }) => void }) => <button onClick={() => onSelect({ id: 1 })}>incident</button> }));
vi.mock('@/app/(admin)/monitoring/_components/operations-map', () => ({ OperationsMap: () => <div>map</div> }));
vi.mock('@/app/(admin)/monitoring/_components/active-orders-table', () => ({ ActiveOrdersTable: () => <div>orders</div> }));
vi.mock('@/app/(admin)/monitoring/_components/context-panel', () => ({ ContextPanel: () => <div data-testid="desktop-context">desktop</div> }));
vi.mock('@/app/(admin)/monitoring/_components/context-drawer', () => ({ ContextDrawer: ({ open }: { open: boolean }) => open ? <div data-testid="mobile-context">mobile</div> : null }));
vi.mock('@/app/(admin)/monitoring/_components/rider-history-panel', () => ({ RiderHistoryPanel: () => <div>history</div> }));
vi.mock('@/lib/api', () => ({ api: { zones: { useGetAll: () => ({ data: [] }) } } }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('monitoring context responsiveness', () => {
  it('opens context as a drawer on narrow screens', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<MonitoringOperationsDesk />);
    expect(screen.getByTestId('mobile-context')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-context')).not.toBeInTheDocument();
  });

  it('preserves history mode and its history panel', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<MonitoringOperationsDesk />);
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    expect(screen.getByText('history')).toBeInTheDocument();
  });
});
