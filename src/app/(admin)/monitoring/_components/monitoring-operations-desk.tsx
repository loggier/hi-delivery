'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { MonitoringFilter, MonitoringIncident, MonitoringOrder } from '@/lib/monitoring/types';
import { MonitoringSnapshotError } from '../_hooks/use-monitoring-snapshot';
import { useMonitoringController, type MonitoringKpi, type MonitoringSelection } from '../_hooks/use-monitoring-controller';
import { ActiveOrdersTable } from './active-orders-table';
import { ContextDrawer } from './context-drawer';
import { ContextPanel } from './context-panel';
import { DataHealthBanner } from './data-health-banner';
import { IncidentQueue } from './incident-queue';
import { MonitoringFilters } from './monitoring-filters';
import { OperationsMap } from './operations-map';
import { OperationsSummary, type MonitoringKpiCardKey } from './operations-summary';
import { RiderHistoryPanel, type RiderHistoryPoint } from './rider-history-panel';
import { SensitiveActionDialog } from './sensitive-action-dialog';

type Mode = 'live' | 'history';

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 1023px)')
      : { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined };
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return narrow;
}

function filterValue(filter: MonitoringFilter, key: 'risk' | 'zoneId' | 'orderStatus' | 'search') {
  return filter[key] ?? 'all';
}

export function MonitoringOperationsDesk() {
  const controller = useMonitoringController();
  const { toast } = useToast();
  const narrow = useNarrowViewport();
  const [mode, setMode] = useState<Mode>('live');
  const [selectedKpiCard, setSelectedKpiCard] = useState<MonitoringKpiCardKey | undefined>();
  const [historyStartAt, setHistoryStartAt] = useState(() => new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 16));
  const [historyEndAt, setHistoryEndAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [historyPoints, setHistoryPoints] = useState<RiderHistoryPoint[]>([]);
  const [playbackPoint, setPlaybackPoint] = useState<RiderHistoryPoint | null>(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const snapshot = controller.snapshot;
  const showSnapshot = Boolean(snapshot);
  const { data: zones = [] } = api.zones.useGetAll({ status: 'ACTIVE' });
  const orders = useMemo(() => snapshot?.orders ?? [], [snapshot?.orders]);
  const riders = controller.riders;
  const incidents = useMemo(() => snapshot?.incidents ?? [], [snapshot?.incidents]);
  const snapshotFailure = controller.error instanceof MonitoringSnapshotError && controller.error.status === 500
    ? controller.error.code
    : null;
  const selection = controller.selection;
  const selectedIncident = selection?.kind === 'incident'
    ? incidents.find((incident) => String(incident.id) === selection.id) ?? null
    : null;
  const selectedOrderId = selectedIncident?.orderId ?? (selection?.kind === 'order' ? selection.id : null);
  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) ?? null : null;
  const selectedRiderId = selectedIncident?.riderId
    ?? (selection?.kind === 'rider' ? selection.id : null)
    ?? selectedOrder?.riderId
    ?? null;
  const selectedRider = selectedRiderId ? riders.find((rider) => rider.id === selectedRiderId) ?? null : null;

  useEffect(() => {
    if (!selection || !snapshot) return;
    const exists = selection.kind === 'incident'
      ? incidents.some((incident) => String(incident.id) === selection.id)
      : selection.kind === 'order'
        ? orders.some((order) => order.id === selection.id)
        : riders.some((rider) => rider.id === selection.id);
    const associationsExist = selection.kind !== 'incident' || (
      (!selectedIncident?.orderId || orders.some((order) => order.id === selectedIncident.orderId))
      && (!selectedIncident?.riderId || riders.some((rider) => rider.id === selectedIncident.riderId))
    );
    if (!exists || !associationsExist) controller.clearSelection();
  }, [controller, incidents, orders, riders, selectedIncident?.orderId, selectedIncident?.riderId, selection, snapshot]);

  const mapOrders = useMemo(() => orders as MonitoringOrder[], [orders]);
  const updateFilter = (next: Partial<MonitoringFilter>) => controller.setFilter({ ...controller.filter, ...next });
  const selectEntity = (next: MonitoringSelection | null) => {
    if (!next) return controller.clearSelection();
    if (next.kind === 'incident') controller.selectIncident(next.id);
    if (next.kind === 'order') controller.selectOrder(next.id);
    if (next.kind === 'rider') controller.selectRider(next.id);
  };
  const reportLocation = async () => {
    if (!selectedIncident?.riderId) return;
    try {
      const response = await fetch('/api/push/location-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riderId: selectedIncident.riderId }) });
      if (!response.ok) throw new Error('No se pudo solicitar la ubicación.');
      toast({ title: 'Solicitud enviada', description: 'El rider recibirá la solicitud de ubicación.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Solicitud no enviada', description: error instanceof Error ? error.message : 'No se pudo solicitar la ubicación.', variant: 'destructive' });
    }
  };
  const runSensitiveAction = async (reason: string) => {
    if (!selectedRiderId) return;
    setActionPending(true);
    try {
      const response = await fetch('/api/monitoring/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'pause_rider', riderId: selectedRiderId, expectedActive: selectedRider?.activeForOrders ?? true, reason }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'No se pudo pausar el rider.');
      setActionOpen(false);
      toast({ title: 'Rider pausado', description: 'La disponibilidad fue actualizada.', variant: 'success' });
      await controller.refetch();
    } catch (error) { toast({ title: 'Acción no aplicada', description: error instanceof Error ? error.message : 'No se pudo completar la acción.', variant: 'destructive' }); } finally { setActionPending(false); }
  };
  const contextProps = {
    incident: selectedIncident,
    onFocusMap: () => setResetCameraToken((token) => token + 1),
    onRequestLocation: selectedIncident?.riderId ? reportLocation : undefined,
    onSensitiveAction: selectedRiderId ? () => setActionOpen(true) : undefined,
    selectedOrderId,
    selectedRiderId,
    orderZoneName: selectedOrder?.zoneId ? zones.find((zone) => zone.id === selectedOrder.zoneId)?.name : null,
    riderZoneName: selectedRider?.zoneId ? zones.find((zone) => zone.id === selectedRider.zoneId)?.name : null,
  };

  return (
    <div className="flex min-h-full flex-col gap-3">
      <PageHeader title="Monitoreo en Vivo" description="Vista operativa de repartidores, pedidos e incidentes.">
        <div className="inline-flex rounded-lg border bg-muted/30 p-1" aria-label="Modo de monitoreo">
          <Button type="button" size="sm" variant={mode === 'live' ? 'default' : 'ghost'} onClick={() => setMode('live')}>En vivo</Button>
          <Button type="button" size="sm" variant={mode === 'history' ? 'default' : 'ghost'} onClick={() => setMode('history')}>Historial</Button>
        </div>
      </PageHeader>
      <OperationsSummary kpis={snapshot?.kpis} selectedKpi={(controller.filter.risk ?? 'all') as MonitoringKpi} selectedKpiCard={selectedKpiCard} isLoading={controller.isLoading && !snapshot} onSelectKpi={controller.selectKpi} onSelectKpiCard={setSelectedKpiCard} />
      {snapshot || controller.isError ? <DataHealthBanner health={controller.health} serverTimestamp={snapshot?.serverTimestamp} /> : null}
      <MonitoringFilters
        priority={filterValue(controller.filter, 'risk')}
        zone={filterValue(controller.filter, 'zoneId')}
        orderStatus={filterValue(controller.filter, 'orderStatus')}
        search={filterValue(controller.filter, 'search')}
        zones={zones}
        onPriorityChange={(value) => updateFilter(value === 'all' ? { risk: undefined } : { risk: value as MonitoringFilter['risk'] })}
        onZoneChange={(value) => updateFilter(value === 'all' ? { zoneId: undefined } : { zoneId: value })}
        onOrderStatusChange={(value) => updateFilter(value === 'all' ? { orderStatus: undefined } : { orderStatus: value as MonitoringFilter['orderStatus'] })}
        onSearchChange={(value) => updateFilter({ search: value || undefined })}
      />
      {!snapshot && controller.isLoading ? <div role="status" className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Cargando datos de monitoreo...</div> : null}
      {controller.isError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">{snapshotFailure ? `No se pudo actualizar la operación (etapa: ${snapshotFailure})` : 'No hay datos de monitoreo disponibles.'}</div> : null}
      {showSnapshot ? <>
        <div className="grid min-h-[32rem] grid-cols-1 gap-3 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(24rem,2fr)_minmax(17rem,1fr)]">
          <IncidentQueue incidents={incidents} selectedId={selectedIncident?.id ?? null} onSelect={(incident: MonitoringIncident) => controller.selectIncident(String(incident.id))} isLoading={false} />
          <div className="min-h-[24rem] overflow-hidden rounded-lg border bg-card"><OperationsMap riders={riders} orders={mapOrders} incidents={incidents} selectedEntity={selection} selectedOrderId={selectedOrderId} selectedRiderId={selectedRiderId} onSelectEntity={selectEntity} resetCameraToken={resetCameraToken} historyPath={historyPoints.map((point) => ({ latitude: point.latitude, longitude: point.longitude }))} playbackPoint={playbackPoint ? { latitude: playbackPoint.latitude, longitude: playbackPoint.longitude, recordedAt: playbackPoint.recorded_at, speed: playbackPoint.speed, course: playbackPoint.course } : null} /></div>
          {narrow ? <ContextDrawer open={Boolean(selection)} onOpenChange={(open) => { if (!open) controller.clearSelection(); }} {...contextProps} /> : <ContextPanel {...contextProps} />}
        </div>
        <ActiveOrdersTable orders={orders} selectedOrderId={selectedOrderId} onSelectOrder={(id) => controller.selectOrder(id)} />
        {mode === 'history' ? <RiderHistoryPanel rider={selectedRider} startAt={historyStartAt} endAt={historyEndAt} onStartAtChange={setHistoryStartAt} onEndAtChange={setHistoryEndAt} onPointsChange={setHistoryPoints} onPlaybackPointChange={setPlaybackPoint} /> : null}
        <SensitiveActionDialog open={actionOpen} actionLabel="Pausar rider" entity={selectedRiderId ?? 'rider'} before={selectedRider?.activeForOrders ? 'Activo' : 'Pausado'} after="Pausado" onConfirm={runSensitiveAction} onCancel={() => setActionOpen(false)} isPending={actionPending} />
      </> : null}
    </div>
  );
}
