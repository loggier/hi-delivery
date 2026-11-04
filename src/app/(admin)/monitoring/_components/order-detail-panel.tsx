import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Circle, ExternalLink, MapPin, Phone, RefreshCw, Store, UserCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MonitoringIncident, MonitoringOrder, MonitoringRider, MonitoringThresholds } from '@/lib/monitoring/types';
import {
  assignmentSlaMinutes,
  delayMinutes,
  elapsedMinutes,
  formatClock,
  formatKm,
  highestPriorityForOrder,
  lastUpdateLabel,
  orderStatusLabel,
  priorityLabel,
  riderFullName,
  shortOrderCode,
  straightLineKm,
  trackingSteps,
  type DispatchCandidate,
} from '../_lib/view-model';
import { StatusPill } from './status-pill';

export interface OrderDetailPanelProps {
  order: MonitoringOrder;
  rider: MonitoringRider | null;
  incidents: readonly MonitoringIncident[];
  thresholds: MonitoringThresholds;
  candidates: readonly DispatchCandidate[];
  now: number;
  onClose: () => void;
  onReassign: () => void;
  onAssignCandidate: (candidate: DispatchCandidate) => void;
  onContactRider: () => void;
  onSelectRider: (riderId: string) => void;
}

interface MetricItem { label: string; value: string; tone?: 'neutral' | 'red' }

// Only real values are rendered. A missing value omits its cell instead of showing a placeholder.
function MetricRow({ items }: { items: MetricItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex divide-x rounded-xl border bg-white">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 flex-1 px-3 py-2">
          <p className="text-[11px] text-slate-500">{item.label}</p>
          <p className={item.tone === 'red' ? 'truncate text-sm font-bold text-red-600' : 'truncate text-sm font-bold text-slate-900'}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailPanel({ order, rider, incidents, thresholds, candidates, now, onClose, onReassign, onAssignCandidate, onContactRider, onSelectRider }: OrderDetailPanelProps) {
  const status = orderStatusLabel(order);
  const priority = highestPriorityForOrder(order.id, incidents);
  const elapsed = elapsedMinutes(order.createdAt, now);
  const sla = assignmentSlaMinutes(order, thresholds);
  const delay = delayMinutes(order, thresholds, now);
  const steps = trackingSteps(order);
  const riskIncident = incidents.find((incident) => incident.orderId === order.id && incident.priority === 'P1') ?? null;
  const distance = rider ? straightLineKm(rider, order.delivery) : null;
  const created = formatClock(order.createdAt);

  const timeItems: MetricItem[] = [];
  if (sla !== null) timeItems.push({ label: 'SLA de asignación', value: `${sla} min` });
  if (elapsed !== null) timeItems.push({ label: 'Tiempo transcurrido', value: `${elapsed} min` });
  if (delay !== null) timeItems.push({ label: 'Atraso', value: `+${delay} min`, tone: 'red' });

  const routeItems: MetricItem[] = [];
  if (order.routeDurationSeconds && order.routeDurationSeconds > 0) {
    routeItems.push({ label: 'ETA de ruta registrada', value: `${Math.round(order.routeDurationSeconds / 60)} min` });
  }
  if (distance !== null) routeItems.push({ label: 'Distancia al rider (línea recta)', value: formatKm(distance) });

  const hasParties = Boolean(order.businessName || order.customerName || order.deliveryAddressText);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Pedido {shortOrderCode(order.id)}</h2>
            <StatusPill tone={priority === 'P1' ? 'red' : priority === 'P2' ? 'amber' : status.tone}>
              {priority ? priorityLabel(priority) : status.label}
            </StatusPill>
          </div>
          {created ? <p className="mt-0.5 text-xs text-slate-500">Creado a las {created}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar detalle">Cerrar</Button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <MetricRow items={timeItems} />

        {riskIncident ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Pedido en riesgo</p>
            <p className="mt-1 text-xs">Hay una alerta crítica abierta para este pedido. Revisa el repartidor o reasígnalo.</p>
          </div>
        ) : null}

        {hasParties ? (
          <section aria-label="Negocio y cliente" className="space-y-2 rounded-xl border bg-white p-3">
            {order.businessName ? (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700"><Store className="h-4 w-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{order.businessName}</p>
                  <p className="text-xs text-slate-500">Negocio</p>
                </div>
              </div>
            ) : null}
            {order.customerName ? (
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><Users className="h-4 w-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{order.customerName}</p>
                  <p className="text-xs text-slate-500">Cliente</p>
                </div>
              </div>
            ) : null}
            {order.deliveryAddressText ? (
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{order.deliveryAddressText}</p>
                  <p className="text-xs text-slate-500">Dirección de entrega</p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-label="Repartidor asignado" className="space-y-2 rounded-xl border bg-white p-3">
          <p className="text-xs font-bold text-slate-700">Repartidor asignado</p>
          {rider ? (
            <button type="button" className="block w-full min-w-0 text-left" onClick={() => onSelectRider(rider.id)}>
              <span className="block truncate text-sm font-bold text-slate-900">{riderFullName(rider)}</span>
              <span className="block text-xs text-slate-500">Ubicación {lastUpdateLabel(rider.lastLocationReceivedAt ?? rider.lastLocationUpdate, now).toLowerCase()}</span>
            </button>
          ) : (
            <p className="text-sm text-slate-500">{order.riderId ? 'Repartidor asignado fuera de la vista actual.' : 'Sin repartidor asignado.'}</p>
          )}
          <MetricRow items={routeItems} />
        </section>

        {candidates.length > 0 ? (
          <section aria-label="Candidatos cercanos" className="space-y-2 rounded-xl border bg-white p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-700"><UserCheck className="h-4 w-4" aria-hidden="true" />Candidatos cercanos al negocio</p>
            <ul className="space-y-2">
              {candidates.map((candidate) => (
                <li key={candidate.rider.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{riderFullName(candidate.rider)}</p>
                    <p className="text-xs text-slate-500">Disponible · {formatKm(candidate.distanceKm)} del negocio</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => onAssignCandidate(candidate)}>Asignar</Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Seguimiento del pedido" className="space-y-2 rounded-xl border bg-white p-3">
          <p className="text-xs font-bold text-slate-700">Seguimiento del pedido</p>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-2 text-xs">
                {step.state === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Circle className={step.state === 'current' ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-slate-300'} aria-hidden="true" />}
                <span className={step.state === 'pending' ? 'text-slate-400' : 'font-semibold text-slate-800'}>{step.label}</span>
                {index === 0 && created ? <span className="ml-auto text-slate-500">{created}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="grid grid-cols-2 gap-2 border-t p-3">
        {rider?.phone ? (
          <Button type="button" variant="outline" size="sm" onClick={onContactRider}>
            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" />Contactar
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={onReassign} className={rider?.phone ? undefined : 'col-span-2'}>
          <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />Reasignar
        </Button>
        <Button asChild size="sm" className="col-span-2">
          <Link href={`/orders/${order.id}`}>Ver detalle <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" /></Link>
        </Button>
      </footer>
    </div>
  );
}
