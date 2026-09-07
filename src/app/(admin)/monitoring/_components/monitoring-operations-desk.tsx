'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Crosshair, List, Radio, Route, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { MonitoringFilter, MonitoringOrder } from '@/lib/monitoring/types';
import { useMonitoringController, type MonitoringKpi, type MonitoringSelection } from '../_hooks/use-monitoring-controller';
import { DataHealthBanner } from './data-health-banner';
import { FleetList } from './fleet-list';
import { IncidentQueue } from './incident-queue';
import { MonitoringFilters } from './monitoring-filters';
import { OperationsMap } from './operations-map';
import { OperationsSummary, type MonitoringKpiCardKey } from './operations-summary';
import { RiderHistoryPanel, type RiderHistoryPoint } from './rider-history-panel';
import { RiderMapCard } from './rider-map-card';

type Mode = 'live' | 'history';

function localDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MonitoringOperationsDesk() {
  const controller = useMonitoringController();
  const { toast } = useToast();
  const { data: zones = [] } = api.zones.useGetAll({ status: 'ACTIVE' });
  const [mode, setMode] = useState<Mode>('live');
  const [selectedKpiCard, setSelectedKpiCard] = useState<MonitoringKpiCardKey>();
  const [historyStartAt, setHistoryStartAt] = useState(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return localDateTime(date); });
  const [historyEndAt, setHistoryEndAt] = useState(() => localDateTime(new Date()));
  const [historyPoints, setHistoryPoints] = useState<RiderHistoryPoint[]>([]);
  const [playbackPoint, setPlaybackPoint] = useState<RiderHistoryPoint | null>(null);
  const [resetCameraToken, setResetCameraToken] = useState(0);
  const [focusSelectionToken, setFocusSelectionToken] = useState(0);
  const [incidentsOpen, setIncidentsOpen] = useState(false);

  const snapshot = controller.snapshot;
  const orders = useMemo(() => snapshot?.orders ?? [], [snapshot?.orders]);
  const riders = controller.riders;
  const staleMinutes = snapshot?.thresholds.gpsStaleCriticalMinutes ?? 10;
  const selection = controller.selection;
  const selectedIncident = selection?.kind === 'incident' ? snapshot?.incidents.find((incident) => String(incident.id) === selection.id) ?? null : null;
  const selectedOrder = selectedIncident?.orderId ? orders.find((order) => order.id === selectedIncident.orderId) ?? null : selection?.kind === 'order' ? orders.find((order) => order.id === selection.id) ?? null : null;
  const selectedRiderId = selectedIncident?.riderId ?? (selection?.kind === 'rider' ? selection.id : selectedOrder?.riderId ?? null);
  const selectedRider = selectedRiderId ? riders.find((rider) => rider.id === selectedRiderId) ?? null : null;
  const activeOrder = selectedRiderId ? orders.find((order) => order.riderId === selectedRiderId) ?? null : null;
  const selectedOrderId = selectedOrder?.id ?? activeOrder?.id ?? null;
  const zoneName = selectedRider?.zoneId ? zones.find((zone) => zone.id === selectedRider.zoneId)?.name : null;

  useEffect(() => {
    if (selectedRiderId && !riders.some((rider) => rider.id === selectedRiderId)) {
      controller.clearSelection();
      setMode('live');
    }
  }, [riders, selectedRiderId]);

  const updateFilter = (next: Partial<MonitoringFilter>) => {
    controller.setFilter({ ...controller.filter, ...next });
    setSelectedKpiCard(undefined);
  };

  const selectEntity = (next: MonitoringSelection | null) => {
    if (!next) { controller.clearSelection(); return; }
    if (next.kind === 'rider') controller.selectRider(next.id);
    if (next.kind === 'order') controller.selectOrder(next.id);
    if (next.kind === 'incident') controller.selectIncident(next.id);
  };

  const requestLocation = async () => {
    if (!selectedRider) return;
    try {
      const response = await fetch('/api/push/location-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ riderId: selectedRider.id }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'No se pudo solicitar la ubicación.');
      toast({ title: 'Solicitud enviada', description: `${selectedRider.firstName} recibirá la solicitud de ubicación.`, variant: 'success' });
    } catch (error) {
      toast({ title: 'Solicitud no enviada', description: error instanceof Error ? error.message : 'No se pudo solicitar la ubicación.', variant: 'destructive' });
    }
  };

  const openHistory = () => {
    if (!selectedRider) return;
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

  return <div className="flex min-h-0 flex-1 flex-col gap-2">
    <PageHeader title="Monitoreo en vivo" description="Seguimiento operativo de toda la flota y sus pedidos.">
      <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Radio className={`h-3.5 w-3.5 ${controller.health.realtime === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`} />{controller.health.realtime === 'connected' ? 'En línea' : 'Actualizando por intervalos'}</span><Button type="button" size="sm" variant="outline" onClick={() => setResetCameraToken((value) => value + 1)}><Crosshair className="mr-1.5 h-4 w-4" />Ver toda la flota</Button></div>
    </PageHeader>

    <OperationsSummary kpis={snapshot?.kpis} selectedKpi={(controller.filter.risk ?? 'all') as MonitoringKpi} selectedKpiCard={selectedKpiCard} isLoading={controller.isLoading && !snapshot} onSelectKpi={(value) => { controller.selectKpi(value); setSelectedKpiCard(value === 'all' ? 'openOrders' : value === 'onTheWay' ? 'onTheWay' : value as MonitoringKpiCardKey); }} onSelectKpiCard={setSelectedKpiCard} />
    <MonitoringFilters zone={controller.filter.zoneId ?? 'all'} fleetStatus={controller.filter.fleetStatus ?? 'all'} signal={controller.filter.signal ?? 'all'} zones={zones} onZoneChange={(value) => updateFilter({ zoneId: value === 'all' ? undefined : value })} onFleetStatusChange={(value) => updateFilter({ fleetStatus: value as MonitoringFilter['fleetStatus'] })} onSignalChange={(value) => updateFilter({ signal: value as MonitoringFilter['signal'] })} />
    {snapshot || controller.isError ? <DataHealthBanner health={controller.health} serverTimestamp={snapshot?.serverTimestamp} /> : null}
    {!snapshot && controller.isLoading ? <div className="grid min-h-[32rem] place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">Cargando flota...</div> : null}
    {controller.isError && !snapshot ? <div role="alert" className="grid min-h-[20rem] place-items-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">No se pudo cargar el monitoreo.</div> : null}

    {snapshot ? <div className="grid min-h-[36rem] flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
      <div className="flex min-h-[18rem] flex-col lg:min-h-0">
        {mode === 'live' ? <FleetList riders={riders} orders={orders} selectedRiderId={selectedRiderId} search={controller.filter.search ?? ''} staleMinutes={staleMinutes} onSearchChange={(value) => updateFilter({ search: value || undefined })} onSelectRider={(id) => controller.selectRider(id)} /> : <div className="flex min-h-0 flex-1 flex-col gap-2"><Button type="button" variant="outline" className="justify-start" onClick={returnLive}><List className="mr-2 h-4 w-4" />Volver a flota en vivo</Button><RiderHistoryPanel rider={selectedRider} startAt={historyStartAt} endAt={historyEndAt} onStartAtChange={setHistoryStartAt} onEndAtChange={setHistoryEndAt} onPointsChange={setHistoryPoints} onPlaybackPointChange={setPlaybackPoint} /></div>}
      </div>
      <div className="relative min-h-[32rem] overflow-hidden rounded-xl border bg-card shadow-sm lg:min-h-0">
        <OperationsMap riders={riders} orders={orders as MonitoringOrder[]} incidents={snapshot.incidents} selectedEntity={selection} selectedOrderId={selectedOrderId} selectedRiderId={selectedRiderId} onSelectEntity={selectEntity} resetCameraToken={resetCameraToken} focusSelectionToken={focusSelectionToken} historyMode={mode === 'history'} staleMinutes={staleMinutes} historyPath={historyPoints} playbackPoint={playbackPoint ? { latitude: playbackPoint.latitude, longitude: playbackPoint.longitude, recordedAt: playbackPoint.recorded_at, speed: playbackPoint.speed, course: playbackPoint.course } : null} />
        {mode === 'live' && selectedRider ? <RiderMapCard rider={selectedRider} activeOrder={activeOrder} zoneName={zoneName} staleMinutes={staleMinutes} onClose={() => controller.clearSelection()} onCenter={() => setFocusSelectionToken((value) => value + 1)} onRequestLocation={() => void requestLocation()} onHistory={openHistory} /> : null}
        {mode === 'live' ? <div className="absolute bottom-3 left-3 z-20"><Button type="button" size="sm" variant={incidentsOpen ? 'default' : 'secondary'} className="shadow-lg" onClick={() => setIncidentsOpen((value) => !value)}><AlertTriangle className="mr-1.5 h-4 w-4" />Alertas ({snapshot.incidents.length})</Button></div> : null}
        {mode === 'live' && incidentsOpen ? <div className="absolute bottom-14 left-3 z-30 flex h-[min(26rem,calc(100%-5rem))] w-[min(20rem,calc(100%-1.5rem))] flex-col rounded-xl bg-white shadow-2xl"><Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 z-10 h-7 w-7" aria-label="Cerrar alertas" onClick={() => setIncidentsOpen(false)}><X className="h-4 w-4" /></Button><IncidentQueue incidents={snapshot.incidents} selectedId={selectedIncident?.id ?? null} onSelect={(incident) => { controller.selectIncident(String(incident.id)); setIncidentsOpen(false); }} /></div> : null}
        {mode === 'history' ? <div className="absolute left-3 top-3 z-20 rounded-lg border bg-white/95 px-3 py-2 shadow-lg backdrop-blur"><div className="flex items-center gap-2 text-xs font-bold"><Route className="h-4 w-4 text-blue-600" />Recorrido de {selectedRider?.firstName}</div>{playbackPoint ? <div className="mt-1 text-[11px] text-muted-foreground">{new Date(playbackPoint.recorded_at).toLocaleString('es-MX')} · {Math.round(playbackPoint.speed ?? 0)} km/h</div> : null}</div> : null}
      </div>
    </div> : null}
  </div>;
}
