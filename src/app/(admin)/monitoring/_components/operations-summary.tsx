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

// Six compact cards per tab in a 3-column grid, so the list below starts near the top of the column.
export function OperationsSummary(props: OperationsSummaryProps) {
  if (props.isLoading || !props.kpis) {
    return (
      <div aria-label="Cargando resumen" className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => <MonitoringKpiCardSkeleton key={index} />)}
      </div>
    );
  }
  const { kpis } = props;

  if (props.tab === 'orders') {
    return (
      <div aria-label="Resumen de pedidos" className="grid grid-cols-3 gap-1.5">
        <MonitoringKpiCard label="Activos" value={kpis.openOrders} />
        <MonitoringKpiCard
          label="Sin asignar"
          value={kpis.unassigned}
          tone="red"
          selected={props.selectedRisk === 'unassigned'}
          onSelect={() => props.onSelectRisk(props.selectedRisk === 'unassigned' ? undefined : 'unassigned')}
        />
        <MonitoringKpiCard label="En camino" value={kpis.onTheWay} tone="blue" />
        <MonitoringKpiCard
          label="En riesgo"
          value={kpis.atRisk}
          tone="red"
          selected={props.selectedRisk === 'atRisk'}
          onSelect={() => props.onSelectRisk(props.selectedRisk === 'atRisk' ? undefined : 'atRisk')}
        />
        <MonitoringKpiCard label="Atrasados" value={props.delayedCount} tone="amber" />
        <MonitoringKpiCard label="Riders disponibles" value={kpis.available} tone="green" />
      </div>
    );
  }

  return (
    <div aria-label="Resumen de repartidores" className="grid grid-cols-3 gap-1.5">
      <MonitoringKpiCard label="Pedidos" value={kpis.openOrders} />
      <MonitoringKpiCard label="En reparto" value={kpis.onTheWay} tone="blue" />
      <MonitoringKpiCard label="En riesgo" value={kpis.atRisk} tone="red" />
      <MonitoringKpiCard label="Repartidores" value={props.riderCount} />
      <MonitoringKpiCard label="Disponibles" value={kpis.available} tone="green" />
      <MonitoringKpiCard label="En ruta" value={props.enRouteCount} tone="blue" />
    </div>
  );
}
