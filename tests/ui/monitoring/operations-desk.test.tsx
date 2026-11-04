import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonitoringOperationsDesk } from '@/app/(admin)/monitoring/_components/monitoring-operations-desk';
import { MonitoringSnapshotError } from '@/app/(admin)/monitoring/_hooks/use-monitoring-snapshot';
import type { MonitoringOrder, MonitoringRider, MonitoringSnapshot } from '@/lib/monitoring/types';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

type ControllerState = {
  snapshot: MonitoringSnapshot | undefined;
  riders: MonitoringRider[];
  error: unknown;
  isLoading: boolean;
  isError: boolean;
  filter: Record<string, unknown>;
  selection: { kind: 'order' | 'rider'; id: string } | null;
  health: { realtime: 'connected' | 'degraded'; snapshot: 'fresh' | 'stale'; disabledRules: string[] };
  selectOrder: ReturnType<typeof vi.fn>;
  selectRider: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
  setFilter: ReturnType<typeof vi.fn>;
  refetch: ReturnType<typeof vi.fn>;
};

const controller = {} as ControllerState;

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/app/(admin)/monitoring/_hooks/use-monitoring-controller', () => ({
  useMonitoringController: () => controller,
}));
vi.mock('@/app/(admin)/monitoring/_components/operations-map', () => ({
  OperationsMap: () => <div data-testid="map" />,
}));
vi.mock('@/app/(admin)/monitoring/_components/sensitive-action-dialog', () => ({
  SensitiveActionDialog: ({ actionLabel }: { actionLabel: string }) => <div role="dialog">{actionLabel}</div>,
}));
vi.mock('@/lib/api', () => ({ api: { zones: { useGetAll: () => ({ data: [] }) } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// Synthetic fixtures only: no production data.
const thresholds = { unassignedCriticalMinutes: 7, gpsStaleCriticalMinutes: 10, stoppedInTransitMinutes: 15, meaningfulMovementMeters: 50, source: 'settings' as const };
const freshRider: MonitoringRider = {
  id: 'r1', firstName: 'Jesús', lastName: 'Bernal', activeForOrders: true, latitude: 25.68, longitude: -100.31,
  lastLocationReceivedAt: new Date().toISOString(), lastLocationUpdate: new Date().toISOString(), phone: '+5215555555555',
};
const order: MonitoringOrder = {
  id: '884921ab-0000-4000-8000-000000000000', status: 'pending_acceptance', riderId: null, businessName: 'Negocio de prueba', customerName: 'Cliente de prueba',
  createdAt: new Date(Date.now() - 20 * 60_000).toISOString(), expectedDeliveryAt: null, assignmentExhaustedAt: null,
};
const snapshot: MonitoringSnapshot = {
  serverTimestamp: new Date().toISOString(),
  dataHealth: { schema: 'healthy', disabledRules: [] },
  thresholds,
  kpis: { openOrders: 1, unassigned: 1, onTheWay: 0, atRisk: 0, ridersOnline: 1, available: 1, occupied: 0, noSignal: 0 },
  incidents: [],
  orders: [order],
  riders: [freshRider],
};

function resetController(overrides: Partial<ControllerState> = {}) {
  Object.assign(controller, {
    snapshot,
    riders: [freshRider],
    error: null,
    isLoading: false,
    isError: false,
    filter: {},
    selection: null,
    health: { realtime: 'connected', snapshot: 'fresh', disabledRules: [] },
    selectOrder: vi.fn(),
    selectRider: vi.fn(),
    clearSelection: vi.fn(),
    setFilter: vi.fn(),
    refetch: vi.fn(),
  }, overrides);
}

beforeEach(() => {
  replace.mockClear();
  window.localStorage.setItem('hid-session', JSON.stringify({ user: { id: 'u1' } }));
  resetController();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('MonitoringOperationsDesk', () => {
  it('shows real orders and no placeholder text for data the snapshot does not carry', () => {
    render(<MonitoringOperationsDesk />);
    expect(screen.getByText('Negocio de prueba')).toBeInTheDocument();
    expect(screen.getByText('Cliente de prueba')).toBeInTheDocument();
    expect(screen.queryByText('Entregados hoy')).not.toBeInTheDocument();
    expect(screen.queryByText(/No disponible/)).not.toBeInTheDocument();
  });

  it('shows a loading state instead of zero KPIs before the first snapshot', () => {
    resetController({ snapshot: undefined, riders: [], isLoading: true });
    render(<MonitoringOperationsDesk />);
    expect(screen.getByLabelText('Cargando resumen')).toBeInTheDocument();
    expect(screen.getByText('Cargando…')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows an error with retry when there is no snapshot', () => {
    const refetch = vi.fn();
    resetController({ snapshot: undefined, riders: [], isError: true, error: new MonitoringSnapshotError('fail', 500), isLoading: false });
    controller.refetch = refetch;
    render(<MonitoringOperationsDesk />);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('on 401 closes the local session and redirects to sign-in without a banner', () => {
    resetController({ snapshot: undefined, riders: [], isError: true, error: new MonitoringSnapshotError('expired', 401) });
    render(<MonitoringOperationsDesk />);
    expect(replace).toHaveBeenCalledWith('/sign-in?reauthenticate=1');
    expect(window.localStorage.getItem('hid-session')).toBeNull();
    expect(screen.queryByText('Renovar sesión')).not.toBeInTheDocument();
  });

  it('shows rider detail and selects the rider from the list', () => {
    render(<MonitoringOperationsDesk />);
    fireEvent.click(screen.getByRole('tab', { name: /Repartidores/ }));
    fireEvent.click(screen.getByRole('button', { name: /Jesús Bernal/ }));
    expect(controller.selectRider).toHaveBeenCalledWith('r1');
  });

  it('hides the candidate block when the snapshot has no real candidates', () => {
    resetController({ selection: { kind: 'order', id: order.id } });
    render(<MonitoringOperationsDesk />);
    expect(screen.queryByLabelText('Candidatos cercanos')).not.toBeInTheDocument();
  });
});
