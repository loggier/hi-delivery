'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Radio, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { MonitoringFilter, MonitoringIncident, MonitoringOrder, MonitoringRider, MonitoringThresholds } from '@/lib/monitoring/types';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useMonitoringController } from '../_hooks/use-monitoring-controller';
import { MonitoringSnapshotError } from '../_hooks/use-monitoring-snapshot';
import { MonitoringActionRequestError, postMonitoringAction, type MonitoringActionRequest } from '../_lib/actions-client';
import {
  delayMinutes,
  dispatchCandidates,
  formatClock,
  groupOpenOrdersByRider,
  riderFullName,
  riderOperationalState,
  shortOrderCode,
  sortOrdersByPriority,
  type RiderOperationalState,
} from '../_lib/view-model';
import { IncidentQueue } from './incident-queue';
import { MonitoringFilters } from './monitoring-filters';
import { OperationsMap } from './operations-map';
import { OperationsSummary } from './operations-summary';
import { OrderDetailPanel } from './order-detail-panel';
import { OrderQueue } from './order-queue';
import { RiderDetailPanel } from './rider-detail-panel';
import { RiderHistoryPanel, type RiderHistoryPoint } from './rider-history-panel';
import { RiderQueue } from './rider-queue';
import { SensitiveActionDialog } from './sensitive-action-dialog';

type Tab = 'orders' | 'riders';
type OrderRisk = 'unassigned' | 'atRisk';
type PendingAction =
  | { kind: 'reassign'; order: MonitoringOrder; riderId: string | null; riderName: string | null }
  | { kind: 'block'; rider: MonitoringRider };

const ORDER_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'unassigned', label: 'Sin asignar' },
  { value: 'onTheWay', label: 'En camino' },
  { value: 'atRisk', label: 'En riesgo' },
];

const RIDER_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_ruta', label: 'En ruta' },
  { value: 'ocupado', label: 'Ocupado' },
  { value: 'sin_senal', label: 'Sin señal' },
];

function toLocalInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function lastSeen(rider: MonitoringRider): number {
  const timestamp = Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function MonitoringOperationsDesk() {
  const controller = useMonitoringController();
  const router = useRouter();
  const { toast } = useToast();
  const { data: zones = [] } = api.zones.useGetAll({ status: 'ACTIVE' });
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [riderStateFilter, setRiderStateFilter] = useState<'all' | RiderOperationalState>('all');
  const [riderScope, setRiderScope] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'history'>('live');
  const [historyStartAt, setHistoryStartAt] = useState(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return toLocalInput(date); });
  const [historyEndAt, setHistoryEndAt] = useState(() => toLocalInput(new Date()));
  const [historyPoints, setHistoryPoints] = useState<RiderHistoryPoint[]>([]);
  const [playbackPoint, setPlaybackPoint] = useState<RiderHistoryPoint | null>(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [incidentsOpen, setIncidentsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const { snapshot, selection, clearSelection, selectOrder, selectRider, setFilter, refetch, filter } = controller;
  const sessionExpired = controller.error instanceof MonitoringSnapshotError && controller.error.status === 401;
  const forbidden = controller.error instanceof MonitoringSnapshotError && controller.error.status === 403;
  const loadError = controller.error instanceof Error ? controller.error.message : null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // On 401 the server no longer recognises the session: close the local session (store + hid-session)
  // and send the user to sign in again.
  useEffect(() => {
    if (!sessionExpired) return;
    useAuthStore.getState().logout();
    router.replace('/sign-in?reauthenticate=1');
  }, [sessionExpired, router]);

  const orders = useMemo(() => snapshot?.orders ?? [], [snapshot?.orders]);
  const riders = controller.riders;
  const incidents = useMemo<readonly MonitoringIncident[]>(() => snapshot?.incidents ?? [], [snapshot?.incidents]);
  const thresholds: MonitoringThresholds | undefined = snapshot?.thresholds;
  const staleMinutes = thresholds?.gpsStaleCriticalMinutes ?? 10;
  const alertsDegraded = snapshot?.dataHealth.disabledRules.includes('incidents') ?? false;
  const riderById = useMemo(() => new Map(riders.map((rider) => [rider.id, rider])), [riders]);
  const ordersByRider = useMemo(() => groupOpenOrdersByRider(orders), [orders]);
  const riderStates = useMemo(
    () => new Map(riders.map((rider) => [rider.id, riderOperationalState(rider, ordersByRider.get(rider.id) ?? [], staleMinutes, now)] as const)),
    [riders, ordersByRider, staleMinutes, now],
  );
  const zoneNameById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name] as const)), [zones]);

  const detailOrder = selection?.kind === 'order' ? orders.find((order) => order.id === selection.id) ?? null : null;
  const selectedRiderId = selection?.kind === 'rider' ? selection.id : detailOrder?.riderId ?? null;
  const selectedRider = selectedRiderId ? riderById.get(selectedRiderId) ?? null : null;
  const riderOpenOrders = selectedRiderId ? ordersByRider.get(selectedRiderId) ?? [] : [];
  const routeOrder = detailOrder ?? riderOpenOrders.find((order) => order.status !== 'pending_acceptance') ?? riderOpenOrders[0] ?? null;

  useEffect(() => {
    if (!snapshot || !selection) return;
    const exists = selection.kind === 'order'
      ? orders.some((order) => order.id === selection.id)
      : riders.some((rider) => rider.id === selection.id);
    if (!exists) {
      clearSelection();
      setMode('live');
    }
  }, [snapshot, selection, orders, riders, clearSelection]);

  const term = search.trim().toLowerCase();
  const orderRisk: OrderRisk | undefined = filter.risk === 'unassigned' || filter.risk === 'atRisk' ? filter.risk : undefined;

  const orderRows = useMemo(() => {
    if (!snapshot || !thresholds) return [];
    const filtered = orders.filter((order) => {
      if (riderScope && order.riderId !== riderScope) return false;
      if (!term) return true;
      const riderName = order.riderId ? riderFullName(riderById.get(order.riderId)) : '';
      return [order.id, order.businessName, order.customerName, riderName].some((value) => (value ?? '').toLowerCase().includes(term));
    });
    return sortOrdersByPriority(filtered, incidents, thresholds, now);
  }, [snapshot, thresholds, orders, incidents, now, term, riderScope, riderById]);

  const riderRows = useMemo(() => {
    if (!snapshot) return [];
    return riders
      .filter((rider) => {
        if (riderStateFilter !== 'all' && riderStates.get(rider.id) !== riderStateFilter) return false;
        if (!term) return true;
        return [riderFullName(rider), rider.phone ?? '', rider.id].some((value) => value.toLowerCase().includes(term));
      })
      .sort((left, right) => lastSeen(right) - lastSeen(left));
  }, [snapshot, riders, riderStates, riderStateFilter, term]);

  const candidates = useMemo(
    () => (detailOrder && snapshot ? dispatchCandidates(detailOrder, riders, ordersByRider, staleMinutes, now) : []),
    [detailOrder, snapshot, riders, ordersByRider, staleMinutes, now],
  );

  const delayedCount = snapshot && thresholds
    ? orders.filter((order) => delayMinutes(order, thresholds, now) !== null).length
    : null;
  const enRouteCount = [...riderStates.values()].filter((state) => state === 'en_ruta').length;

  const updateFilter = (next: Partial<MonitoringFilter>) => setFilter({ ...filter, ...next });

  const switchTab = (next: Tab) => {
    setTab(next);
    setSearch('');
    setRiderScope(null);
    setRiderStateFilter('all');
    updateFilter({ risk: undefined });
  };

  const selectOrderRow = (orderId: string) => { selectOrder(orderId); setMode('live'); };
  const selectRiderRow = (riderId: string) => { selectRider(riderId); setMode('live'); };

  const contactRider = (rider: MonitoringRider | null) => {
    if (rider?.phone) window.location.href = `tel:${rider.phone}`;
  };

  const requestLocation = async (rider: MonitoringRider) => {
    try {
      const response = await fetch('/api/push/location-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riderId: rider.id }) });
      const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
      if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : 'No se pudo solicitar la ubicación.');
      toast({ title: 'Solicitud enviada', description: `${riderFullName(rider)} recibirá la solicitud de ubicación.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Solicitud no enviada', description: error instanceof Error ? error.message : 'No se pudo solicitar la ubicación.', variant: 'destructive' });
    }
  };

  const openHistory = (rider: MonitoringRider) => {
    selectRider(rider.id);
    setMode('history');
    setHistoryPoints([]);
    setPlaybackPoint(null);
    setResetCameraToken((value) => value + 1);
  };

  const returnLive = () => {
    setMode('live');
    setHistoryPoints([]);
    setPlaybackPoint(null);
    setResetCameraToken((value) => value + 1);
  };

  const runAction = async (request: MonitoringActionRequest, title: string) => {
    setIsActing(true);
    try {
      await postMonitoringAction(request);
      toast({ title, description: 'La acción quedó registrada.', variant: 'success' });
      refetch();
    } catch (error) {
      const description = error instanceof MonitoringActionRequestError || error instanceof Error ? error.message : 'No se pudo completar la acción.';
      toast({ title: 'Acción no aplicada', description, variant: 'destructive' });
    } finally {
      setIsActing(false);
      setPending(null);
    }
  };

  const confirmPending = (reason: string) => {
    if (!pending) return;
    if (pending.kind === 'reassign') {
      void runAction(
        { type: 'reassign_order', orderId: pending.order.id, expectedRiderId: pending.order.riderId, riderId: pending.riderId, reason },
        pending.riderId ? 'Pedido asignado' : 'Pedido reasignado',
      );
      return;
    }
    void runAction({ type: 'pause_rider', riderId: pending.rider.id, expectedActive: true, reason }, 'Repartidor bloqueado');
  };

  const pendingCopy = pending === null ? null : pending.kind === 'block'
    ? { label: 'Bloquear repartidor', entity: `el repartidor ${riderFullName(pending.rider)}`, before: 'Disponible para pedidos', after: 'No recibe pedidos nuevos' }
    : pending.riderId
      ? { label: `Asignar a ${pending.riderName ?? 'repartidor'}`, entity: `el pedido ${shortOrderCode(pending.order.id)}`, before: pending.order.riderId ? 'Con otro repartidor' : 'Sin asignar', after: `Asignado a ${pending.riderName ?? 'repartidor'}` }
      : { label: 'Reasignar pedido', entity: `el pedido ${shortOrderCode(pending.order.id)}`, before: pending.order.riderId ? 'Asignado a un repartidor' : 'Sin asignar', after: 'Se reenvía a repartidores disponibles' };

  const liveTone = controller.health.snapshot === 'stale'
    ? { label: 'Datos desactualizados', className: 'border-red-200 bg-red-50 text-red-700' }
    : controller.health.realtime === 'connected'
      ? { label: 'En vivo', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
      : { label: 'Actualizando por intervalos', className: 'border-amber-200 bg-amber-50 text-amber-800' };

  const detailOrderRider = detailOrder?.riderId ? riderById.get(detailOrder.riderId) ?? null : null;

  // Without a selection there is no detail column at all, so the lists and the map take the full width.
  let detailPanel: ReactNode = null;
  if (mode === 'history' && selectedRider) {
    detailPanel = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-bold">Historial de {riderFullName(selectedRider)}</p>
          <Button type="button" size="sm" variant="outline" onClick={returnLive}>Volver a vivo</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RiderHistoryPanel rider={selectedRider} startAt={historyStartAt} endAt={historyEndAt} onStartAtChange={setHistoryStartAt} onEndAtChange={setHistoryEndAt} onPointsChange={setHistoryPoints} onPlaybackPointChange={setPlaybackPoint} />
        </div>
      </div>
    );
  } else if (detailOrder && thresholds) {
    detailPanel = (
      <OrderDetailPanel
        order={detailOrder}
        rider={detailOrderRider}
        incidents={incidents}
        thresholds={thresholds}
        candidates={candidates}
        now={now}
        onClose={() => clearSelection()}
        onReassign={() => setPending({ kind: 'reassign', order: detailOrder, riderId: null, riderName: null })}
        onAssignCandidate={(candidate) => setPending({ kind: 'reassign', order: detailOrder, riderId: candidate.rider.id, riderName: riderFullName(candidate.rider) })}
        onContactRider={() => contactRider(detailOrderRider)}
        onSelectRider={selectRiderRow}
      />
    );
  } else if (selectedRider) {
    detailPanel = (
      <RiderDetailPanel
        rider={selectedRider}
        state={riderStates.get(selectedRider.id) ?? 'no_disponible'}
        openOrders={riderOpenOrders}
        zoneName={selectedRider.zoneId ? zoneNameById.get(selectedRider.zoneId) ?? null : null}
        now={now}
        onClose={() => clearSelection()}
        onSelectOrder={selectOrderRow}
        onViewOrders={() => {
          setTab('orders');
          setRiderScope(selectedRider.id);
          setSearch('');
          updateFilter({ risk: undefined });
        }}
        onBlock={() => setPending({ kind: 'block', rider: selectedRider })}
        onRequestLocation={() => void requestLocation(selectedRider)}
        onHistory={() => openHistory(selectedRider)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:h-[calc(100dvh-108px)] lg:overflow-hidden">
      {forbidden ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">No tienes permiso para ver el monitoreo.</div> : null}

      <div className={cn('grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-rows-[minmax(0,1fr)]', detailPanel ? 'lg:grid-cols-[22rem_minmax(0,1fr)_24rem]' : 'lg:grid-cols-[22rem_minmax(0,1fr)]')}>
        <section aria-label="Monitoreo en vivo" className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-xl border bg-white p-3 shadow-sm max-h-[85vh] lg:max-h-none">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Monitoreo en vivo</h1>
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', liveTone.className)}>
                <Radio className="h-3 w-3" aria-hidden="true" />{liveTone.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Operación de pedidos y repartidores en tiempo real{snapshot ? ` · Corte ${formatClock(snapshot.serverTimestamp) ?? 'no disponible'}` : ''}
            </p>
          </header>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            <Input
              aria-label={tab === 'orders' ? 'Buscar pedido, cliente, negocio o repartidor' : 'Buscar repartidor'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === 'orders' ? 'Buscar pedido, cliente, negocio o repartidor…' : 'Buscar repartidor, teléfono o ID…'}
              className="h-9 pl-8 text-xs"
            />
          </div>

          {!snapshot && controller.isError && !sessionExpired ? (
            <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p>No se pudo cargar el monitoreo{loadError ? `: ${loadError}` : '.'}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button>
            </div>
          ) : tab === 'orders' ? (
            <OperationsSummary
              tab="orders"
              kpis={snapshot?.kpis}
              delayedCount={delayedCount}
              isLoading={!snapshot}
              selectedRisk={orderRisk}
              onSelectRisk={(risk) => updateFilter({ risk })}
            />
          ) : (
            <OperationsSummary tab="riders" kpis={snapshot?.kpis} riderCount={riders.length} enRouteCount={enRouteCount} isLoading={!snapshot} />
          )}

          {snapshot && controller.isError && !sessionExpired ? (
            <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">No se pudo actualizar. Mostrando el último corte recibido.</p>
          ) : null}

          <div role="tablist" aria-label="Vista de monitoreo" className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
            <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => switchTab('orders')} className={cn('rounded-md px-3 py-1.5', tab === 'orders' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')}>
              Pedidos{snapshot ? <span className="ml-1 tabular-nums">{snapshot.kpis.openOrders}</span> : null}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'riders'} onClick={() => switchTab('riders')} className={cn('rounded-md px-3 py-1.5', tab === 'riders' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')}>
              Repartidores{snapshot ? <span className="ml-1 tabular-nums">{riders.length}</span> : null}
            </button>
          </div>

          <MonitoringFilters
            zone={filter.zoneId ?? 'all'}
            status={tab === 'orders' ? (orderRisk ?? 'all') : riderStateFilter}
            statusOptions={tab === 'orders' ? ORDER_STATUS_OPTIONS : RIDER_STATUS_OPTIONS}
            zones={zones}
            onZoneChange={(value) => updateFilter({ zoneId: value === 'all' ? undefined : value })}
            onStatusChange={(value) => (tab === 'orders'
              ? updateFilter({ risk: value === 'all' ? undefined : (value as MonitoringFilter['risk']) })
              : setRiderStateFilter(value as 'all' | RiderOperationalState))}
          />

          {tab === 'orders' && riderScope ? (
            <button type="button" className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800" onClick={() => setRiderScope(null)}>
              <span className="truncate">Pedidos de {riderFullName(riderById.get(riderScope))}</span>
              <span aria-hidden="true">Quitar ×</span>
            </button>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border max-h-[50vh] lg:max-h-[68vh]">
            {!snapshot ? (
              controller.isError ? null : <p className="p-4 text-center text-sm text-slate-500">Cargando…</p>
            ) : tab === 'orders' ? (
              orderRows.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500">No hay pedidos activos con estos filtros.</p>
              ) : (
                thresholds ? <OrderQueue orders={orderRows} riderById={riderById} incidents={incidents} thresholds={thresholds} now={now} selectedOrderId={detailOrder?.id ?? null} onSelectOrder={selectOrderRow} /> : null
              )
            ) : riderRows.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-500">No hay repartidores con estos filtros.</p>
            ) : (
              <RiderQueue riders={riderRows} ordersByRider={ordersByRider} staleMinutes={staleMinutes} now={now} selectedRiderId={selectedRiderId} onSelectRider={selectRiderRow} />
            )}
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-2">
          <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setMapOpen((value) => !value)}>
            {mapOpen ? 'Ocultar mapa' : 'Ver mapa'}
          </Button>
          <section aria-label="Mapa de monitoreo" className={cn('relative min-h-[22rem] flex-1 overflow-hidden rounded-xl border bg-white shadow-sm lg:min-h-0', !mapOpen && 'hidden lg:block')}>
            {snapshot ? (
              <OperationsMap
                riders={riders}
                orders={orders}
                riderStates={riderStates}
                selectedOrder={routeOrder}
                selectedRiderId={selectedRiderId}
                onSelectRider={selectRiderRow}
                onSelectOrder={selectOrderRow}
                onClearSelection={() => clearSelection()}
                resetCameraToken={resetCameraToken}
                focusSelectionToken={0}
                historyMode={mode === 'history'}
                historyPath={historyPoints}
                playbackPoint={playbackPoint ? { latitude: playbackPoint.latitude, longitude: playbackPoint.longitude, recordedAt: playbackPoint.recorded_at, speed: playbackPoint.speed, course: playbackPoint.course } : null}
              />
            ) : (
              <div className="grid h-full place-items-center p-4 text-center text-sm text-slate-500">
                {controller.isError ? 'El mapa no está disponible sin datos del monitoreo.' : 'Cargando mapa…'}
              </div>
            )}
            <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
              <Button type="button" size="sm" variant={incidentsOpen ? 'default' : 'secondary'} className="bg-white shadow" disabled={!snapshot} onClick={() => setIncidentsOpen((value) => !value)}>
                <AlertTriangle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {alertsDegraded ? 'Alertas no disponibles' : `Alertas (${snapshot?.incidents.length ?? 0})`}
              </Button>
              {incidentsOpen && snapshot ? (
                <div className="flex max-h-[min(26rem,60vh)] w-[min(20rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                  <IncidentQueue
                    incidents={snapshot.incidents}
                    selectedId={null}
                    error={alertsDegraded ? 'Las alertas no están disponibles: falta la migración de incidentes.' : null}
                    onSelect={(incident) => {
                      if (incident.orderId) selectOrderRow(incident.orderId);
                      else if (incident.riderId) selectRiderRow(incident.riderId);
                      setIncidentsOpen(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {detailPanel ? (
          <aside aria-label="Detalle" className="flex min-h-[20rem] flex-col overflow-hidden rounded-xl border bg-white shadow-sm lg:min-h-0">
            {detailPanel}
          </aside>
        ) : null}
      </div>

      {pending && pendingCopy ? (
        <SensitiveActionDialog
          open
          actionLabel={pendingCopy.label}
          entity={pendingCopy.entity}
          before={pendingCopy.before}
          after={pendingCopy.after}
          isPending={isActing}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
