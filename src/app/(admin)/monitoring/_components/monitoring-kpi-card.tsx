import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type MonitoringKpiTone = 'neutral' | 'warning' | 'critical';

type MonitoringKpiCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: MonitoringKpiTone;
  selected: boolean;
  onSelect: () => void;
};

const toneClasses: Record<MonitoringKpiTone, string> = {
  neutral: 'border-border bg-card text-foreground',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-950',
  critical: 'border-red-200 bg-red-50/70 text-red-950',
};

export function MonitoringKpiCard({ label, value, icon: Icon, tone, selected, onSelect }: MonitoringKpiCardProps) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`${label}: ${value}`}
      aria-pressed={selected}
      title={`Filtrar por ${label}`}
      data-tone={tone}
      onClick={onSelect}
      className={cn('h-auto min-w-0 justify-start gap-2 overflow-hidden px-3 py-2 text-left', toneClasses[tone], selected && 'ring-2 ring-primary ring-offset-1')}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/80" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span data-kpi-label className="block truncate text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</span>
        <span className="block truncate text-lg font-bold leading-5 tabular-nums">{value}</span>
      </span>
    </Button>
  );
}

export function MonitoringKpiCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border px-3 py-2" aria-label="Cargando indicador">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <span className="min-w-0 space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-10" />
      </span>
    </div>
  );
}
