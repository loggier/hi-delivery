import { Clock3, MapPinOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { MonitoringOrder, MonitoringRider } from '@/lib/monitoring/types';
import {
  RIDER_STATE_META,
  lastUpdateLabel,
  riderFullName,
  riderInitials,
  riderOperationalState,
  type RiderOperationalState,
} from '../_lib/view-model';
import { StatusPill } from './status-pill';

export interface RiderQueueProps {
  riders: readonly MonitoringRider[];
  ordersByRider: ReadonlyMap<string, readonly MonitoringOrder[]>;
  staleMinutes: number;
  now: number;
  selectedRiderId: string | null;
  onSelectRider: (riderId: string) => void;
}

const railTone: Record<RiderOperationalState, string> = {
  en_ruta: 'border-l-blue-500',
  ocupado: 'border-l-amber-500',
  disponible: 'border-l-emerald-500',
  sin_senal: 'border-l-red-500',
  no_disponible: 'border-l-slate-300',
};

export function RiderQueue({ riders, ordersByRider, staleMinutes, now, selectedRiderId, onSelectRider }: RiderQueueProps) {
  return (
    <ul aria-label="Repartidores en monitoreo" className="divide-y divide-slate-100">
      {riders.map((rider) => {
        const open = ordersByRider.get(rider.id) ?? [];
        const state = riderOperationalState(rider, open, staleMinutes, now);
        const meta = RIDER_STATE_META[state];
        const selected = selectedRiderId === rider.id;
        const ordersLabel = open.length > 0 ? `${open.length} ${open.length === 1 ? 'pedido' : 'pedidos'}` : null;
        return (
          <li key={rider.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectRider(rider.id)}
              className={cn('flex w-full items-center gap-3 border-l-4 px-3 py-2.5 text-left transition-colors hover:bg-slate-50', railTone[state], selected && 'bg-blue-50/70')}
            >
              <Avatar className="h-10 w-10 shrink-0 border">
                <AvatarImage src={rider.avatarUrl ?? undefined} alt={riderFullName(rider)} />
                <AvatarFallback className="text-xs font-bold">{riderInitials(rider)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block truncate text-sm font-bold text-slate-900">{riderFullName(rider)}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  {ordersLabel ? <span className="text-[11px] text-slate-500">{ordersLabel}</span> : null}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {lastUpdateLabel(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate, now)}
                </span>
                {state === 'sin_senal' ? <span className="flex items-center gap-1 text-red-600"><MapPinOff className="h-3 w-3" aria-hidden="true" />Sin GPS</span> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
