import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonitoringOperationsDesk } from '@/app/(admin)/monitoring/_components/monitoring-operations-desk';
import type { MonitoringUiHealth } from '@/lib/monitoring/types';

const childProps: { map?: Record<string, unknown>; orders?: Record<string, unknown>; context?: Record<string, unknown>; filters?: Record<string, unknown> } = {};

const controller = {
  filter: {},
  setFilter: vi.fn(),
  selectKpi: vi.fn(),
  selection: null as { kind: 'incident' | 'order' | 'rider'; id: string } | null,
  selectIncident: vi.fn(),
  selectOrder: vi.fn(),
  selectRider: vi.fn(),
  clearSelection: vi.fn(),
  snapshot: {
    serverTimestamp: '2026-08-26T12:00:00.000Z',
    dataHealth: { schema: 'healthy', disabledRules: [] },
    thresholds: { unassignedCriticalMinutes: 10, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 10, meaningfulMovementMeters: 100, source: 'settings' },
    kpis: { openOrders: 1, unassigned: 2, onTheWay: 3, atRisk: 4, ridersOnline: 5, available: 6, occupied: 7, noSignal: 8 },
    incidents: [{ id: 9, conditionKey: 'gps', type: 'gps-stale', priority: 'P1', status: 'open', orderId: 'o1', riderId: 'r1', firstDetectedAt: '2026-08-26T11:00:00.000Z', lastDetectedAt: '2026-08-26T11:00:00.000Z', attendingAt: null, resolvedAt: null, metadata: {} }],
    orders: [{ id: 'o1', status: 'accepted', riderId: 'r1', zoneId: null, createdAt: null, expectedDeliveryAt: null, assignmentExhaustedAt: null }],
    riders: [{ id: 'r1', zoneId: null, activeForOrders: true, lastLocationReceivedAt: '2026-08-26T11:59:00.000Z', lastLocationUpdate: '2026-08-26T11:59:00.000Z', latitude: 19, longitude: -99 }],
  },
  riders: [{ id: 'r1', zoneId: null, activeForOrders: true, lastLocationReceivedAt: '2026-08-26T11:59:00.000Z', lastLocationUpdate: '2026-08-26T11:59:00.000Z', latitude: 19, longitude: -99 }],
  locationPatches: new Map(),
  realtimeStatus: 'connected' as const,
  lastRealtimeEventAt: null,
  health: { realtime: 'connected', snapshot: 'fresh', disabledRules: [] } as MonitoringUiHealth,
  error: null,
  isLoading: false,
  isRefreshing: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock('@/app/(admin)/monitoring/_hooks/use-monitoring-controller', () => ({
  useMonitoringController: () => controller,
}));
vi.mock('@/app/(admin)/monitoring/_components/operations-map', () => ({
  OperationsMap: (props: { selectedEntity: unknown; selectedOrderId?: string | null; selectedRiderId?: string | null; onSelectEntity: (value: unknown) => void }) => { childProps.map = props as unknown as Record<string, unknown>; return <button data-testid="map" data-selection={JSON.stringify(props.selectedEntity)} onClick={() => props.onSelectEntity({ kind: 'rider', id: 'r1' })}>map</button>; },
}));
vi.mock('@/app/(admin)/monitoring/_components/incident-queue', () => ({
  IncidentQueue: ({ onSelect }: { onSelect: (incident: { id: number }) => void }) => <button onClick={() => onSelect({ id: 9 })}>incident</button>,
}));
vi.mock('@/app/(admin)/monitoring/_components/context-panel', () => ({ ContextPanel: (props: Record<string, unknown>) => { childProps.context = props; return <div data-testid="context-panel">context</div>; } }));
vi.mock('@/app/(admin)/monitoring/_components/context-drawer', () => ({ ContextDrawer: ({ open }: { open: boolean }) => open ? <div data-testid="context-drawer">drawer</div> : null }));
vi.mock('@/app/(admin)/monitoring/_components/active-orders-table', () => ({ ActiveOrdersTable: (props: { selectedOrderId?: string | null; onSelectOrder: (id: string) => void }) => { childProps.orders = props as unknown as Record<string, unknown>; return <button onClick={() => props.onSelectOrder('o1')}>orders</button>; } }));
vi.mock('@/app/(admin)/monitoring/_components/operations-summary', () => ({ OperationsSummary: ({ kpis, onSelectKpi }: { kpis?: Record<string, number>; onSelectKpi: (value: string) => void }) => <><div>{['openOrders', 'unassigned', 'onTheWay', 'atRisk', 'ridersOnline', 'available', 'occupied', 'noSignal'].map((key) => <span key={key}>{kpis?.[key]}</span>)}</div><button onClick={() => onSelectKpi('atRisk')}>kpis</button></> }));
vi.mock('@/app/(admin)/monitoring/_components/data-health-banner', () => ({ DataHealthBanner: ({ health }: { health: { snapshot: string } }) => <div>{health.snapshot}</div> }));
vi.mock('@/app/(admin)/monitoring/_components/monitoring-filters', () => ({ MonitoringFilters: (props: Record<string, unknown>) => { childProps.filters = props; return <div>filters</div>; } }));
vi.mock('@/app/(admin)/monitoring/_components/rider-history-panel', () => ({ RiderHistoryPanel: () => <div>history panel</div> }));
vi.mock('@/app/(admin)/monitoring/_components/sensitive-action-dialog', () => ({ SensitiveActionDialog: () => <div data-testid="sensitive-dialog" /> }));
vi.mock('@/lib/api', () => ({ api: { zones: { useGetAll: () => ({ data: [{ id: 'z1', name: 'Centro' }] }) } } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); controller.selection = null; });

describe('MonitoringOperationsDesk', () => {
  it('composes the live desk and routes KPI, incident, map, and order selection to one controller', () => {
    render(<MonitoringOperationsDesk />);
    expect(screen.getAllByText(/^[1-8]$/)).toHaveLength(8);
    fireEvent.click(screen.getByText('kpis'));
    fireEvent.click(screen.getByText('incident'));
    fireEvent.click(screen.getByTestId('map'));
    fireEvent.click(screen.getByText('orders'));
    expect(controller.selectKpi).toHaveBeenCalledWith('atRisk');
    expect(controller.selectIncident).toHaveBeenCalledWith('9');
    expect(controller.selectRider).toHaveBeenCalledWith('r1');
    expect(controller.selectOrder).toHaveBeenCalledWith('o1');
  });

  it('keeps the stale snapshot visible and exposes degraded health', () => {
    controller.health = { realtime: 'degraded', snapshot: 'stale', disabledRules: [] };
    render(<MonitoringOperationsDesk />);
    expect(screen.getByText('stale')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('derives incident order and rider selection for every coordinated child', () => {
    controller.health = { realtime: 'connected', snapshot: 'fresh', disabledRules: [] };
    controller.selection = { kind: 'incident', id: '9' };
    render(<MonitoringOperationsDesk />);
    expect(childProps.orders?.selectedOrderId).toBe('o1');
    expect(childProps.map?.selectedOrderId).toBe('o1');
    expect(childProps.map?.selectedRiderId).toBe('r1');
    expect(childProps.context?.selectedOrderId).toBe('o1');
    expect(childProps.context?.selectedRiderId).toBe('r1');
    expect(childProps.filters?.zones).toEqual([{ id: 'z1', name: 'Centro' }]);
  });

  it('does not mount a sensitive mutation action before Task 12', () => {
    controller.selection = { kind: 'incident', id: '9' };
    render(<MonitoringOperationsDesk />);
    expect(screen.queryByText('Cambiar estado')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sensitive-dialog')).not.toBeInTheDocument();
  });

  it('keeps direct order and rider selections coordinated and clears a removed order', () => {
    controller.selection = { kind: 'order', id: 'o1' };
    render(<MonitoringOperationsDesk />);
    expect(childProps.orders?.selectedOrderId).toBe('o1');
    expect(childProps.map?.selectedRiderId).toBe('r1');
    controller.snapshot = { ...controller.snapshot, orders: [] };
    render(<MonitoringOperationsDesk />);
    expect(controller.clearSelection).toHaveBeenCalled();
  });
});
