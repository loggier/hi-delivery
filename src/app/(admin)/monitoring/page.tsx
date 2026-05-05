
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ClipboardList, Package, Search, History, Play, Pause, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { LiveMap } from './live-map';
import { OrderStatus, type Rider, type Zone } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
}

function sanitizeImageUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  return undefined;
}

function KPICard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
  return (
    <div className="flex min-w-[132px] items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="text-lg font-bold leading-none">{value}</div>
      </div>
    </div>
  );
}

function KPICardSkeleton() {
  return (
    <div className="flex min-w-[132px] items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
  );
}

const activeOrderStatuses: OrderStatus[] = [
  'pending_acceptance',
  'accepted',
  'at_store',
  'cooking',
  'ready_for_pickup',
  'picked_up',
  'out_for_delivery',
  'on_the_way',
  'arrived_at_destination',
];
type HistoryPreset = 'today' | 'yesterday' | 'custom';
type MonitoringPanelMode = 'live' | 'history';

type RiderHistoryPoint = {
  id: number;
  rider_id: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  course?: number | null;
  recorded_at: string;
  source?: string | null;
};

function MonitoringSideTabs({
  mode,
  onModeChange,
}: {
  mode: MonitoringPanelMode;
  onModeChange: (mode: MonitoringPanelMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/30 p-1">
      <Button
        type="button"
        size="sm"
        variant={mode === 'live' ? 'default' : 'ghost'}
        className="h-8"
        onClick={() => onModeChange('live')}
      >
        En vivo
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'history' ? 'default' : 'ghost'}
        className="h-8"
        onClick={() => onModeChange('history')}
      >
        Historial
      </Button>
    </div>
  );
}

function formatDateTimeLocal(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getRangeForPreset(preset: HistoryPreset) {
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return {
      start: formatDateTimeLocal(start),
      end: formatDateTimeLocal(now),
    };
  }

  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 0, 0);
  return {
    start: formatDateTimeLocal(start),
    end: formatDateTimeLocal(end),
  };
}

const ActiveRidersTable = ({
    riders,
    zones,
    activeOrderRiderIds,
    searchTerm,
    onSearchChange,
    selectedZoneId,
    onZoneChange,
    selectedRiderId,
    onSelectRider,
}: {
    riders: Rider[],
    zones: Zone[],
    activeOrderRiderIds: Set<string>,
    searchTerm: string,
    onSearchChange: (value: string) => void,
    selectedZoneId: string,
    onZoneChange: (value: string) => void,
    selectedRiderId: string | null,
    onSelectRider: (rider: Rider) => void,
}) => {
    const filteredRiders = React.useMemo(() => {
        if (!searchTerm) return riders;
        return riders.filter(rider => 
            `${rider.first_name} ${rider.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rider.phone_e164.includes(searchTerm)
        );
    }, [riders, searchTerm]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-base">Repartidores Activos</CardTitle>
                <div className="mt-2 space-y-2">
                    <Select value={selectedZoneId} onValueChange={onZoneChange}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Filtrar por zona" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las zonas</SelectItem>
                            {zones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.id}>
                                    {zone.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto px-0 pb-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wide">Repartidor</TableHead>
                            <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wide">Teléfono</TableHead>
                            <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wide">Pedido</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRiders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-20 text-center text-sm">
                                    No se encontraron repartidores.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRiders.map(rider => (
                            <TableRow
                                key={rider.id}
                                className={cn(
                                    "cursor-pointer transition-colors",
                                    selectedRiderId === rider.id && "bg-primary/5",
                                )}
                                onClick={() => onSelectRider(rider)}
                            >
                                <TableCell className="px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={sanitizeImageUrl(rider.avatar1x1_url || rider.avatar_1x1_url)} alt={`${rider.first_name} ${rider.last_name}`} />
                                            <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                                                {getInitials(rider.first_name, rider.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5">
                                            <Link
                                                href={`/riders/${rider.id}`}
                                                className="text-sm font-medium leading-none hover:underline"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {rider.first_name} {rider.last_name}
                                            </Link>
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge className="px-1.5 py-0 text-[10px]" variant={rider.is_active_for_orders ? "success" : "outline"}>
                                                    {rider.is_active_for_orders ? "Disponible" : "No disponible"}
                                                </Badge>
                                                {typeof rider.last_speed === 'number' ? (
                                                    <Badge className="px-1.5 py-0 text-[10px] font-bold" variant="outline">
                                                        {Math.round(rider.last_speed)} KPH
                                                    </Badge>
                                                ) : null}
                                                {selectedRiderId === rider.id ? (
                                                    <Badge className="px-1.5 py-0 text-[10px]" variant="default">Seleccionado</Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-xs">{rider.phone_e164}</TableCell>
                                <TableCell className="px-3 py-2.5">
                                    {activeOrderRiderIds.has(rider.id) && (
                                        <Badge className="px-1.5 py-0 text-[10px]" variant="warning">
                                            <Package className="mr-1 h-3 w-3"/>
                                            En curso
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function RiderHistoryPanel({
  riders,
  rider,
  points,
  isLoading,
  error,
  preset,
  startAt,
  endAt,
  playbackIndex,
  isPlaying,
  playbackSpeed,
  onPresetChange,
  onStartChange,
  onEndChange,
  onLoad,
  onTogglePlayback,
  onResetPlayback,
  onPlaybackIndexChange,
  onPlaybackSpeedChange,
  onSelectRider,
  selectedRiderId,
}: {
  riders: Rider[];
  rider: Rider | null;
  points: RiderHistoryPoint[];
  isLoading: boolean;
  error: string | null;
  preset: HistoryPreset;
  startAt: string;
  endAt: string;
  playbackIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onPresetChange: (value: HistoryPreset) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onLoad: () => void;
  onTogglePlayback: () => void;
  onResetPlayback: () => void;
  onPlaybackIndexChange: (value: number) => void;
  onPlaybackSpeedChange: (value: number) => void;
  onSelectRider: (riderId: string) => void;
  selectedRiderId: string | null;
}) {
  const activePoint = points.length
    ? points[Math.min(playbackIndex, points.length - 1)]
    : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="px-4 py-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Historial de recorrido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <div className="space-y-2">
          <Label>Unidad</Label>
          <Select value={selectedRiderId ?? ''} onValueChange={onSelectRider}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecciona un repartidor" />
            </SelectTrigger>
            <SelectContent>
              {riders.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.first_name} {item.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!rider ? (
          <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Selecciona un repartidor para consultar y reproducir su ruta.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-slate-50 px-3 py-2">
              <div className="text-sm font-semibold">
                {rider.first_name} {rider.last_name}
              </div>
              <div className="text-xs text-muted-foreground">{rider.phone_e164}</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Rango</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={preset === 'today' ? 'default' : 'outline'}
                    onClick={() => onPresetChange('today')}
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preset === 'yesterday' ? 'default' : 'outline'}
                    onClick={() => onPresetChange('yesterday')}
                  >
                    Ayer
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={preset === 'custom' ? 'default' : 'outline'}
                    onClick={() => onPresetChange('custom')}
                  >
                    Personalizado
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input type="datetime-local" value={startAt} onChange={(e) => onStartChange(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input type="datetime-local" value={endAt} onChange={(e) => onEndChange(e.target.value)} />
                </div>
              </div>
              <Button type="button" onClick={onLoad} disabled={isLoading}>
                {isLoading ? 'Consultando...' : 'Consultar recorrido'}
              </Button>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {points.length > 0 ? (
              <div className="space-y-3 rounded-lg border px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{points.length} puntos capturados</div>
                  <Badge variant="outline">
                    {activePoint
                      ? format(new Date(activePoint.recorded_at), "dd MMM HH:mm:ss", { locale: es })
                      : 'Sin punto activo'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    Inicio
                    <div className="font-medium text-foreground">
                      {format(new Date(points[0].recorded_at), "dd MMM HH:mm", { locale: es })}
                    </div>
                  </div>
                  <div>
                    Fin
                    <div className="font-medium text-foreground">
                      {format(new Date(points[points.length - 1].recorded_at), "dd MMM HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Reproducción</span>
                    <span>{Math.min(playbackIndex + 1, points.length)}/{points.length}</span>
                  </div>
                  <Slider
                    value={[Math.min(playbackIndex, Math.max(points.length - 1, 0))]}
                    max={Math.max(points.length - 1, 0)}
                    step={1}
                    onValueChange={(value) => onPlaybackIndexChange(value[0] ?? 0)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" onClick={onTogglePlayback}>
                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isPlaying ? 'Pausar' : 'Reproducir'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={onResetPlayback}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reiniciar
                  </Button>
                  <Select value={String(playbackSpeed)} onValueChange={(value) => onPlaybackSpeedChange(Number(value))}>
                    <SelectTrigger className="h-9 w-[120px] text-xs">
                      <SelectValue placeholder="Velocidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                      <SelectItem value="8">8x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : rider && !isLoading ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No hay puntos guardados para ese rango.
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MonitoringPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedZoneId, setSelectedZoneId] = React.useState('all');
  const [selectedRiderId, setSelectedRiderId] = React.useState<string | null>(null);
  const [panelMode, setPanelMode] = React.useState<MonitoringPanelMode>('live');
  const [historyPreset, setHistoryPreset] = React.useState<HistoryPreset>('today');
  const initialTodayRange = React.useMemo(() => getRangeForPreset('today'), []);
  const [historyStartAt, setHistoryStartAt] = React.useState(initialTodayRange.start);
  const [historyEndAt, setHistoryEndAt] = React.useState(initialTodayRange.end);
  const [historyPoints, setHistoryPoints] = React.useState<RiderHistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [playbackIndex, setPlaybackIndex] = React.useState(0);
  const [isPlayingHistory, setIsPlayingHistory] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [realtimeRiders, setRealtimeRiders] = React.useState<Rider[]>([]);
  const [realtimeOrders, setRealtimeOrders] = React.useState<any[]>([]);
  const { data: allRiders, isLoading: isLoadingRiders } = api.riders.useGetAll();
  const { data: zones } = api.zones.useGetAll({ status: 'ACTIVE' });
  const { data: allOrders, isLoading: isLoadingOrders } = api.orders.useGetAll();

  React.useEffect(() => {
    if (allRiders) {
      setRealtimeRiders(allRiders);
    }
  }, [allRiders]);

  React.useEffect(() => {
    if (allOrders) {
      setRealtimeOrders(allOrders);
    }
  }, [allOrders]);

  React.useEffect(() => {
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    const riderChannel = supabase
      .channel('monitoring-riders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema, table: 'riders' },
        (payload) => {
          setRealtimeRiders((current) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id as string;
              return current.filter((rider) => rider.id !== deletedId);
            }

            const nextRider = payload.new as Rider;
            const existingIndex = current.findIndex((rider) => rider.id === nextRider.id);
            if (existingIndex === -1) {
              return [nextRider, ...current];
            }

            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], ...nextRider };
            return updated;
          });
        }
      )
      .subscribe();

    const orderChannel = supabase
      .channel('monitoring-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema, table: 'orders' },
        (payload) => {
          setRealtimeOrders((current) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id as string;
              return current.filter((order) => order.id !== deletedId);
            }

            const nextOrder = payload.new as any;
            const existingIndex = current.findIndex((order) => order.id === nextOrder.id);
            if (existingIndex === -1) {
              return [nextOrder, ...current];
            }

            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], ...nextOrder };
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(riderChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [supabase]);

  const { activeRidersWithLocation, activeRidersForTable, activeOrders, activeOrderRiderIds, activeOrderByRiderId } = React.useMemo(() => {
    const availableRiders = realtimeRiders.filter(
      (r) => (r.status === 'approved' || (r.status as string) === 'ACTIVE') && r.is_active_for_orders
    );
    const filteredRiders = selectedZoneId === 'all'
      ? availableRiders
      : availableRiders.filter((rider) => rider.zone_id === selectedZoneId);
    const activeRidersWithLocation = filteredRiders.filter(r => r.last_latitude && r.last_longitude);
    const activeOrders = realtimeOrders.filter(o => activeOrderStatuses.includes(o.status));
    const activeOrderRiderIds = new Set(activeOrders.map(o => o.rider_id).filter(Boolean) as string[]);
    const activeOrderByRiderId = new Map(
      activeOrders
        .filter((order) => Boolean(order.rider_id))
        .map((order) => [order.rider_id as string, { id: order.id }]),
    );
    
    return {
        activeRidersWithLocation,
        activeRidersForTable: filteredRiders,
        activeOrders,
        activeOrderRiderIds,
        activeOrderByRiderId,
    };
  }, [realtimeRiders, realtimeOrders, selectedZoneId]);

  React.useEffect(() => {
    if (!selectedRiderId) return;
    const stillExists = activeRidersForTable.some((rider) => rider.id === selectedRiderId);
    if (!stillExists) {
      setSelectedRiderId(null);
    }
  }, [activeRidersForTable, selectedRiderId]);

  const selectedRider = React.useMemo(
    () => activeRidersForTable.find((rider) => rider.id === selectedRiderId) ?? null,
    [activeRidersForTable, selectedRiderId],
  );

  const loadHistory = React.useCallback(async () => {
    if (!selectedRiderId) {
      setHistoryPoints([]);
      setHistoryError('Selecciona un repartidor para consultar historial.');
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
      const { data, error } = await supabase
        .schema(schema)
        .from('rider_location_history')
        .select('id, rider_id, latitude, longitude, speed, course, recorded_at, source')
        .eq('rider_id', selectedRiderId)
        .gte('recorded_at', new Date(historyStartAt).toISOString())
        .lte('recorded_at', new Date(historyEndAt).toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        throw error;
      }

      setHistoryPoints((data ?? []) as RiderHistoryPoint[]);
      setPlaybackIndex(0);
      setIsPlayingHistory(false);
    } catch (error) {
      setHistoryPoints([]);
      setHistoryError(error instanceof Error ? error.message : 'No se pudo consultar el historial.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyEndAt, historyStartAt, selectedRiderId, supabase]);

  React.useEffect(() => {
    if (!selectedRiderId) {
      setPanelMode('live');
      setHistoryPoints([]);
      setHistoryError(null);
      setIsPlayingHistory(false);
      setPlaybackIndex(0);
      return;
    }
    if (panelMode !== 'history') {
      setHistoryPoints([]);
      setHistoryError(null);
      setIsPlayingHistory(false);
      setPlaybackIndex(0);
      return;
    }
    void loadHistory();
  }, [panelMode, selectedRiderId, loadHistory]);

  React.useEffect(() => {
    if (!isPlayingHistory || historyPoints.length < 2) {
      return;
    }

    const frameMs = Math.max(180, Math.round(1200 / playbackSpeed));
    const timer = window.setInterval(() => {
      setPlaybackIndex((current) => {
        if (current >= historyPoints.length - 1) {
          setIsPlayingHistory(false);
          return current;
        }
        return current + 1;
      });
    }, frameMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [historyPoints.length, isPlayingHistory, playbackSpeed]);

  const playbackPoint = historyPoints.length
    ? historyPoints[Math.min(playbackIndex, historyPoints.length - 1)]
    : null;
  const clearHistoryMode = React.useCallback(() => {
    setIsPlayingHistory(false);
    setPlaybackIndex(0);
    setHistoryPoints([]);
    setHistoryError(null);
  }, []);

  const isLoading = isLoadingRiders || isLoadingOrders;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Monitoreo en Vivo"
        description="Vista en tiempo real de repartidores y pedidos activos."
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Repartidores Activos" value={activeRidersForTable.length} icon={Bike} />
              <KPICard title="Pedidos Activos" value={activeOrders.length} icon={ClipboardList} />
            </>
          )}
        </div>
      </PageHeader>
      <div className="mt-3 grid flex-grow grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex h-[calc(100vh-150px)] flex-col gap-4 lg:col-span-1">
          <MonitoringSideTabs
            mode={panelMode}
            onModeChange={(mode) => {
              setPanelMode(mode);
              if (mode === 'live') {
                clearHistoryMode();
              }
            }}
          />
          {panelMode === 'live' ? (
            <ActiveRidersTable
              riders={activeRidersForTable}
              zones={zones || []}
              activeOrderRiderIds={activeOrderRiderIds}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedZoneId={selectedZoneId}
              onZoneChange={setSelectedZoneId}
              selectedRiderId={selectedRiderId}
              onSelectRider={(rider) => {
                setSelectedRiderId(rider.id);
              }}
            />
          ) : (
            <RiderHistoryPanel
              riders={activeRidersForTable}
              rider={selectedRider}
              points={historyPoints}
              isLoading={isLoadingHistory}
              error={historyError}
              preset={historyPreset}
              startAt={historyStartAt}
              endAt={historyEndAt}
              playbackIndex={playbackIndex}
              isPlaying={isPlayingHistory}
              playbackSpeed={playbackSpeed}
              onPresetChange={(value) => {
                setHistoryPreset(value);
                if (value !== 'custom') {
                  const range = getRangeForPreset(value);
                  setHistoryStartAt(range.start);
                  setHistoryEndAt(range.end);
                }
              }}
              onStartChange={(value) => {
                setHistoryPreset('custom');
                setHistoryStartAt(value);
              }}
              onEndChange={(value) => {
                setHistoryPreset('custom');
                setHistoryEndAt(value);
              }}
              onLoad={() => {
                void loadHistory();
              }}
              onTogglePlayback={() => {
                if (historyPoints.length <= 1) return;
                setIsPlayingHistory((current) => !current);
              }}
              onResetPlayback={() => {
                setIsPlayingHistory(false);
                setPlaybackIndex(0);
              }}
              onPlaybackIndexChange={(value) => {
                setIsPlayingHistory(false);
                setPlaybackIndex(value);
              }}
              onPlaybackSpeedChange={setPlaybackSpeed}
              onSelectRider={(riderId) => {
                setSelectedRiderId(riderId);
              }}
              selectedRiderId={selectedRiderId}
            />
          )}
        </div>
        <div className="h-[60vh] overflow-hidden rounded-lg lg:col-span-2 lg:h-full">
            <LiveMap
                riders={activeRidersWithLocation}
                activeOrderRiderIds={activeOrderRiderIds}
                activeOrderByRiderId={activeOrderByRiderId}
                selectedRiderId={selectedRiderId}
                historyPath={historyPoints}
                playbackPoint={playbackPoint}
                onSelectRider={(rider) => {
                  setSelectedRiderId(rider?.id ?? null);
                  if (rider) {
                    setPanelMode('live');
                  }
                }}
            />
        </div>
      </div>
    </div>
  );
}
