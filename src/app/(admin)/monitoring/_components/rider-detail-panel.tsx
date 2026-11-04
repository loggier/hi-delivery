import { Bike, Gauge, Lock, MapPin, Phone, Store, Target, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';
import {
  RIDER_STATE_META,
  lastUpdateLabel,
  orderIsInTransit,
  orderStatusLabel,
  riderFullName,
  riderInitials,
  shortOrderCode,
  type RiderOperationalState,
} from '../_lib/view-model';
import { StatusPill } from './status-pill';

export interface RiderDetailPanelProps {
  rider: MonitoringRider;
  state: RiderOperationalState;
  openOrders: readonly MonitoringOrder[];
  zoneName: string | null;
  now: number;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  onViewOrders: () => void;
  onBlock: () => void;
  onRequestLocation: () => void;
  onHistory: () => void;
}

const headerTone: Record<RiderOperationalState, string> = {
  en_ruta: 'text-blue-700',
  ocupado: 'text-amber-700',
  disponible: 'text-emerald-700',
  sin_senal: 'text-red-700',
  no_disponible: 'text-slate-600',
};


export function RiderDetailPanel({ rider, state, openOrders, zoneName, now, onClose, onSelectOrder, onViewOrders, onBlock, onRequestLocation, onHistory }: RiderDetailPanelProps) {
  const meta = RIDER_STATE_META[state];
  const current = openOrders.find(orderIsInTransit) ?? openOrders[0] ?? null;
  const next = current ? openOrders.find((order) => order.id !== current.id) ?? null : null;
  const speed = typeof rider.speed === 'number' && Number.isFinite(rider.speed) ? Math.max(0, Math.round(rider.speed)) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <Bike className="mt-1 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">Repartidor: {riderFullName(rider)}</h2>
          <p className={cn('text-xs font-semibold', headerTone[state])}>{meta.label} · {openOrders.length} {openOrders.length === 1 ? 'pedido activo' : 'pedidos activos'}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar detalle">Cerrar</Button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border">
            <AvatarImage src={rider.avatarUrl ?? undefined} alt={riderFullName(rider)} />
            <AvatarFallback className="font-bold">{riderInitials(rider)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{riderFullName(rider)}</p>
            <StatusPill tone={meta.tone} className="mt-1">{meta.label}</StatusPill>
            <p className="mt-1 truncate text-[11px] text-slate-400">ID {rider.id.slice(0, 8)}</p>
          </div>
        </section>

        <section aria-label="Pedido actual" className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700">Pedido actual (en curso)</h3>
          {current ? (
            <button type="button" onClick={() => onSelectOrder(current.id)} className="flex w-full items-center gap-3 rounded-xl border bg-blue-50/50 p-3 text-left hover:bg-blue-50">
              <Store className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{shortOrderCode(current.id)}</span>
                <span className="block truncate text-xs text-slate-500">{current.businessName} · {orderStatusLabel(current).label}</span>
              </span>
            </button>
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-center text-xs text-slate-500">Sin pedido en curso.</p>
          )}
          {next ? (
            <button type="button" onClick={() => onSelectOrder(next.id)} className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50">
              <Users className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-slate-500">Siguiente pedido</span>
                <span className="block truncate text-sm font-semibold">{shortOrderCode(next.id)} · {next.businessName}</span>
              </span>
            </button>
          ) : null}
        </section>

        <section aria-label="Zona y ubicación" className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-white p-3">
            <p className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" aria-hidden="true" />Zona</p>
            <p className="mt-1 truncate text-sm font-bold">{zoneName ?? 'Sin zona'}</p>
          </div>
          <div className="rounded-xl border bg-white p-3">
            <p className="flex items-center gap-1 text-[11px] text-slate-500"><Target className="h-3 w-3" aria-hidden="true" />Ubicación en vivo</p>
            <p className="mt-1 truncate text-sm font-bold text-emerald-700">{lastUpdateLabel(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate, now)}</p>
            <div className="mt-2 flex gap-3 text-[11px] font-semibold">
              <button type="button" className="text-blue-700 hover:underline" onClick={onRequestLocation}>Pedir ubicación</button>
              <button type="button" className="text-blue-700 hover:underline" onClick={onHistory}>Ver historial</button>
            </div>
          </div>
          {speed === null ? null : (
            <div className="col-span-2 flex items-center gap-2 rounded-xl border bg-white p-3 text-sm">
              <Gauge className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="text-slate-500">Velocidad</span>
              <span className="ml-auto font-bold">{speed} km/h</span>
            </div>
          )}
        </section>


        <section aria-label="Pedidos del repartidor" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700">Pedidos del repartidor ({openOrders.length})</h3>
            {openOrders.length > 0 ? <button type="button" className="text-xs font-semibold text-blue-700" onClick={onViewOrders}>Ver en pedidos</button> : null}
          </div>
          {openOrders.length === 0 ? (
            <p className="rounded-xl border border-dashed p-3 text-center text-xs text-slate-500">Sin pedidos activos.</p>
          ) : (
            <ul className="space-y-2">
              {openOrders.map((order) => {
                const status = orderStatusLabel(order);
                return (
                  <li key={order.id}>
                    <button type="button" onClick={() => onSelectOrder(order.id)} className="flex w-full items-center gap-2 rounded-xl border p-2.5 text-left hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{shortOrderCode(order.id)}</span>
                        <span className="block truncate text-xs text-slate-500">{order.businessName} → {order.customerName}</span>
                      </span>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="flex flex-wrap gap-2 border-t p-3 [&>*]:flex-1">
        {rider.phone ? (
          <Button asChild type="button" variant="outline" size="sm">
            <a href={`tel:${rider.phone}`}><Phone className="mr-1 h-4 w-4" aria-hidden="true" />Contactar</a>
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onViewOrders}>
          <Users className="mr-1 h-4 w-4" aria-hidden="true" />Ver pedidos
        </Button>
        <Button type="button" variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={onBlock} disabled={!rider.activeForOrders} title={rider.activeForOrders ? undefined : 'El repartidor ya no recibe pedidos'}>
          <Lock className="mr-1 h-4 w-4" aria-hidden="true" />{rider.activeForOrders ? 'Bloquear' : 'Bloqueado'}
        </Button>
      </footer>
    </div>
  );
}
