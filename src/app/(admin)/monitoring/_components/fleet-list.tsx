'use client';

import { Bike, Clock3, MapPinOff, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';

type FleetListProps = {
  riders: readonly MonitoringRider[];
  orders: readonly MonitoringOrder[];
  selectedRiderId: string | null;
  search: string;
  staleMinutes: number;
  onSearchChange: (value: string) => void;
  onSelectRider: (id: string) => void;
};

export function riderSignalIsStale(rider: MonitoringRider, staleMinutes: number, now = Date.now()) {
  const timestamp = Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
  return !Number.isFinite(timestamp) || now - timestamp > staleMinutes * 60_000;
}

export function riderVisualState(rider: MonitoringRider, hasOrder: boolean, staleMinutes: number) {
  if (riderSignalIsStale(rider, staleMinutes)) return { label: 'Sin señal', dot: 'bg-red-500', rail: 'border-l-red-500', badge: 'border-red-200 bg-red-50 text-red-700' };
  if (hasOrder) return { label: 'Con pedido', dot: 'bg-blue-500', rail: 'border-l-blue-500', badge: 'border-blue-200 bg-blue-50 text-blue-700' };
  if (rider.activeForOrders) return { label: 'Disponible', dot: 'bg-emerald-500', rail: 'border-l-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  return { label: 'No disponible', dot: 'bg-slate-400', rail: 'border-l-slate-400', badge: 'border-slate-200 bg-slate-50 text-slate-600' };
}

function initials(rider: MonitoringRider) {
  return `${rider.firstName?.[0] ?? ''}${rider.lastName?.[0] ?? ''}`.toUpperCase() || 'R';
}

function relativeTime(rider: MonitoringRider) {
  const timestamp = Date.parse(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate ?? '');
  if (!Number.isFinite(timestamp)) return 'Sin ubicación';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1_440) return `Hace ${Math.floor(minutes / 60)} h`;
  return `Hace ${Math.floor(minutes / 1_440)} d`;
}

export function FleetList({ riders, orders, selectedRiderId, search, staleMinutes, onSearchChange, onSelectRider }: FleetListProps) {
  const orderByRider = new Map(orders.flatMap((order) => order.riderId ? [[order.riderId, order] as const] : []));

  return (
    <section aria-label="Flota en vivo" className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Flota en vivo</h2>
            <p className="text-[11px] text-muted-foreground">{riders.length} unidades visibles</p>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Realtime</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar en flota" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Nombre, teléfono o ID" className="h-9 pl-8 text-xs" />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {riders.map((rider) => {
            const order = orderByRider.get(rider.id);
            const visual = riderVisualState(rider, Boolean(order), staleMinutes);
            return (
              <button
                key={rider.id}
                type="button"
                className={cn('flex w-full border-l-[6px] px-3 py-2.5 text-left transition-colors hover:bg-muted/60', visual.rail, selectedRiderId === rider.id && 'bg-primary/5 ring-1 ring-inset ring-primary/20')}
                onClick={() => onSelectRider(rider.id)}
              >
                <Avatar className="mr-2.5 h-9 w-9 shrink-0 border">
                  <AvatarImage src={rider.avatarUrl ?? undefined} alt={`${rider.firstName ?? 'Rider'} ${rider.lastName ?? ''}`} />
                  <AvatarFallback className="text-xs font-bold">{initials(rider)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{rider.firstName ?? 'Rider'} {rider.lastName ?? ''}</span>
                    <span className="shrink-0 text-[11px] font-bold">{Math.max(0, Math.round(rider.speed ?? 0))} km/h</span>
                  </span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', visual.dot)} />
                    <span className="truncate">{visual.label}</span>
                    <span>·</span>
                    <Clock3 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{relativeTime(rider)}</span>
                  </span>
                  {order ? <span className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-blue-700"><Bike className="h-3 w-3" />Pedido {order.id}</span> : !Number.isFinite(rider.latitude) ? <span className="mt-1 flex items-center gap-1 text-[11px] text-red-600"><MapPinOff className="h-3 w-3" />Sin coordenadas</span> : null}
                </span>
              </button>
            );
          })}
          {riders.length === 0 ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No hay riders para estos filtros.</div> : null}
        </div>
      </ScrollArea>
    </section>
  );
}
