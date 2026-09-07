'use client';

import Link from 'next/link';
import { Bike, Crosshair, ExternalLink, History, LocateFixed, MapPin, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';
import { riderSignalIsStale, riderVisualState } from './fleet-list';

type RiderMapCardProps = {
  rider: MonitoringRider;
  activeOrder: MonitoringOrder | null;
  zoneName?: string | null;
  staleMinutes: number;
  onClose: () => void;
  onCenter: () => void;
  onRequestLocation: () => void;
  onHistory: () => void;
};

export function RiderMapCard({ rider, activeOrder, zoneName, staleMinutes, onClose, onCenter, onRequestLocation, onHistory }: RiderMapCardProps) {
  const visual = riderVisualState(rider, Boolean(activeOrder), staleMinutes);
  const stale = riderSignalIsStale(rider, staleMinutes);
  const initials = `${rider.firstName?.[0] ?? ''}${rider.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <aside aria-label={`Detalle de ${rider.firstName ?? 'Rider'} ${rider.lastName ?? ''}`} className={cn('absolute right-3 top-3 z-20 w-[min(21rem,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-l-[10px] bg-white shadow-2xl', visual.rail)}>
      <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border"><AvatarImage src={rider.avatarUrl ?? undefined} /><AvatarFallback className="font-bold">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold">{rider.firstName ?? 'Rider'} {rider.lastName ?? ''}</h3>
            <Badge variant="outline" className={cn('mt-1 text-[10px]', visual.badge)}>{visual.label}</Badge>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Cerrar detalle" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs">
          <div><span className="text-muted-foreground">Velocidad</span><strong className="block text-sm">{Math.max(0, Math.round(rider.speed ?? 0))} km/h</strong></div>
          <div><span className="text-muted-foreground">Zona</span><strong className="block truncate text-sm">{zoneName || 'Sin zona'}</strong></div>
          <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{stale ? 'Ubicación desactualizada' : 'Ubicación reciente'}</div>
        </div>

        {activeOrder ? (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-900"><Bike className="h-4 w-4" />Pedido activo</div>
            <p className="mt-1 truncate text-xs text-blue-800">{activeOrder.businessName || 'Negocio'} · {activeOrder.customerName || activeOrder.id}</p>
            <Button asChild size="sm" variant="link" className="mt-1 h-auto p-0 text-blue-700"><Link href={`/orders/${activeOrder.id}`}>Ver pedido <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCenter}><Crosshair className="mr-1.5 h-4 w-4" />Centrar</Button>
          <Button type="button" size="sm" variant="outline" onClick={onRequestLocation}><LocateFixed className="mr-1.5 h-4 w-4" />Ubicación</Button>
          <Button type="button" size="sm" variant="outline" onClick={onHistory}><History className="mr-1.5 h-4 w-4" />Historial</Button>
          <Button asChild size="sm" variant="outline"><Link href={`/riders/${rider.id}`}><ExternalLink className="mr-1.5 h-4 w-4" />Ver perfil</Link></Button>
        </div>
      </div>
    </aside>
  );
}
