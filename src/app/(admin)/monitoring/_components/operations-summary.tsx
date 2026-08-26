import { Bike, CircleAlert, CircleDot, ClipboardList, Navigation, Radio, UserCheck, Users } from 'lucide-react';
import type { MonitoringKpis } from '@/lib/monitoring/types';
import type { MonitoringKpi } from '../_hooks/use-monitoring-controller';
import { MonitoringKpiCard, MonitoringKpiCardSkeleton, type MonitoringKpiTone } from './monitoring-kpi-card';

type OperationsSummaryProps = {
  kpis?: MonitoringKpis;
  selectedKpi: MonitoringKpi;
  onSelectKpi: (kpi: MonitoringKpi) => void;
  isLoading?: boolean;
};

const cards: Array<{ key: keyof MonitoringKpis; label: string; selection: MonitoringKpi; icon: typeof ClipboardList; tone: MonitoringKpiTone }> = [
  { key: 'openOrders', label: 'Pedidos abiertos', selection: 'all', icon: ClipboardList, tone: 'neutral' },
  { key: 'unassigned', label: 'Sin asignar', selection: 'unassigned', icon: CircleAlert, tone: 'critical' },
  { key: 'onTheWay', label: 'En camino', selection: 'onTheWay', icon: Navigation, tone: 'neutral' },
  { key: 'atRisk', label: 'En riesgo', selection: 'atRisk', icon: CircleDot, tone: 'critical' },
  { key: 'ridersOnline', label: 'Riders en línea', selection: 'all', icon: Radio, tone: 'neutral' },
  { key: 'available', label: 'Disponibles', selection: 'available', icon: UserCheck, tone: 'neutral' },
  { key: 'occupied', label: 'Ocupados', selection: 'occupied', icon: Bike, tone: 'neutral' },
  { key: 'noSignal', label: 'Sin señal', selection: 'noSignal', icon: Users, tone: 'warning' },
];

export function OperationsSummary({ kpis, selectedKpi, onSelectKpi, isLoading = false }: OperationsSummaryProps) {
  return (
    <section aria-label="Resumen operativo">
      <div data-testid="monitoring-kpi-grid" className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {isLoading || !kpis
          ? cards.map((card) => <MonitoringKpiCardSkeleton key={card.key} />)
          : cards.map((card) => (
            <MonitoringKpiCard
              key={card.key}
              label={card.label}
              value={kpis[card.key]}
              icon={card.icon}
              tone={card.tone}
              selected={selectedKpi === card.selection}
              onSelect={() => onSelectKpi(card.selection)}
            />
          ))}
      </div>
    </section>
  );
}
