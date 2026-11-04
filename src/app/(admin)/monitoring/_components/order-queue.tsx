import { Bike, ChevronRight, Store, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MonitoringIncident, MonitoringOrder, MonitoringRider, MonitoringThresholds } from '@/lib/monitoring/types';
import {
  delayMinutes,
  elapsedMinutes,
  highestPriorityForOrder,
  orderStatusLabel,
  priorityLabel,
  riderFullName,
  shortOrderCode,
  type ToneKey,
} from '../_lib/view-model';
import { StatusPill } from './status-pill';

export interface OrderQueueProps {
  orders: readonly MonitoringOrder[];
  riderById: ReadonlyMap<string, MonitoringRider>;
  incidents: readonly MonitoringIncident[];
  thresholds: MonitoringThresholds;
  now: number;
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
}

const rowTone: Record<ToneKey, string> = {
  neutral: 'border-l-slate-300',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  green: 'border-l-emerald-500',
  slate: 'border-l-slate-300',
};

// Missing business or customer names are omitted, never replaced with placeholder text.
export function OrderQueue({ orders, riderById, incidents, thresholds, now, selectedOrderId, onSelectOrder }: OrderQueueProps) {
  return (
    <ul aria-label="Pedidos en monitoreo" className="divide-y divide-slate-100">
      {orders.map((order) => {
        const status = orderStatusLabel(order);
        const priority = highestPriorityForOrder(order.id, incidents);
        const rider = order.riderId ? riderById.get(order.riderId) : undefined;
        const elapsed = elapsedMinutes(order.createdAt, now);
        const delay = delayMinutes(order, thresholds, now);
        const selected = selectedOrderId === order.id;
        const tone: ToneKey = priority === 'P1' ? 'red' : priority === 'P2' ? 'amber' : status.tone;
        return (
          <li key={order.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectOrder(order.id)}
              className={cn(
                'flex w-full items-start gap-2 border-l-4 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                rowTone[tone],
                selected && 'bg-blue-50/70',
              )}
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">{shortOrderCode(order.id)}</span>
                  {priority ? <StatusPill tone={priority === 'P3' ? 'amber' : 'red'}>{priorityLabel(priority)}</StatusPill> : null}
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </span>
                {order.businessName ? (
                  <span className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-900">
                    <Store className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate">{order.businessName}</span>
                  </span>
                ) : null}
                {order.customerName ? (
                  <span className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                    <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{order.customerName}</span>
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5 truncate text-xs text-slate-500">
                  <Bike className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{rider ? riderFullName(rider) : order.riderId ? 'Repartidor asignado' : 'Sin asignar'}</span>
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5 text-right">
                {elapsed !== null ? <span className="text-sm font-bold tabular-nums text-slate-900">{elapsed} min</span> : null}
                {delay !== null ? <span className="text-xs font-semibold text-red-600">+{delay} min</span> : null}
                <ChevronRight className="mt-1 h-4 w-4 text-slate-500" aria-hidden="true" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
