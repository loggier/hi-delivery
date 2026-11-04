import { AlertTriangle, Bike, CircleDashed, ClipboardList, Clock3, Navigation, UserCheck, Users } from 'lucide-react';
import type { MonitoringKpis } from '@/lib/monitoring/types';
import { MonitoringKpiCard, MonitoringKpiCardSkeleton } from './monitoring-kpi-card';

export interface OperationsOrdersSummaryProps {
  tab: 'orders';
  kpis: MonitoringKpis | undefined;
  /** Orders waiting past the configured assignment threshold, derived from the snapshot. null when unknown. */
  delayedCount: number | null;
  isLoading: boolean;
  selectedRisk: 'unassigned' | 'atRisk' | undefined;
  onSelectRisk: (risk: 'unassigned' | 'atRisk' | undefined) => void;
}

export interface OperationsRidersSummaryProps {
  tab: 'riders';
  kpis: MonitoringKpis | undefined;
  riderCount: number;
  enRouteCount: number;
  isLoading: boolean;
}

export type OperationsSummaryProps = OperationsOrdersSummaryProps | OperationsRidersSummaryProps;

const SKELETON_COUNT = 6;

export function OperationsSummary(props: OperationsSummaryProps) {
  if (props.isLoading || !props.kpis) {
    return (
      <div aria-label="Cargando resumen" className="grid grid-cols-2 gap-2">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => <MonitoringKpiCardSkeleton key={index} />)}
      </div>
    );
  }
  const { kpis } = props;

  if (props.tab === 'orders') {
    return (
      <div aria-label="Resumen de pedidos" className="grid grid-cols-2 gap-2">
        <MonitoringKpiCard label="Activos" value={kpis.openOrders} icon={ClipboardList} />
        <MonitoringKpiCard
          label="Sin asignar"
          value={kpis.unassigned}
          icon={CircleDashed}
          tone="red"
          hint={`En camino: ${kpis.onTheWay}`}
          selected={props.selectedRisk === 'unassigned'}
          onSelect={() => props.onSelectRisk(props.selectedRisk === 'unassigned' ? undefined : 'unassigned')}
        />
        <MonitoringKpiCard
          label="En riesgo"
          value={kpis.atRisk}
          icon={AlertTriangle}
          tone="red"
          selected={props.selectedRisk === 'atRisk'}
          onSelect={() => props.onSelectRisk(props.selectedRisk === 'atRisk' ? undefined : 'atRisk')}
        />
        <MonitoringKpiCard
          label="Atrasados"
          value={props.delayedCount}
          icon={Clock3}
          tone="amber"
          hint="Pedidos sin asignar por encima del umbral configurado"
        />
        <MonitoringKpiCard label="Riders disponibles" value={kpis.available} icon={Bike} tone="green" />
      </div>
    );
  }

  return (
    <div aria-label="Resumen de repartidores" className="grid grid-cols-2 gap-2">
      <MonitoringKpiCard label="Pedidos" value={kpis.openOrders} icon={ClipboardList} />
      <MonitoringKpiCard label="En reparto" value={kpis.onTheWay} icon={Navigation} tone="blue" />
      <MonitoringKpiCard label="En riesgo" value={kpis.atRisk} icon={AlertTriangle} tone="red" />
      <MonitoringKpiCard label="Repartidores" value={props.riderCount} icon={Users} />
      <MonitoringKpiCard label="Disponibles" value={kpis.available} icon={UserCheck} tone="green" />
      <MonitoringKpiCard label="En ruta" value={props.enRouteCount} icon={Bike} tone="blue" />
    </div>
  );
}
