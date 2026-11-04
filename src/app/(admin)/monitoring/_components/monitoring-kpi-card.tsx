import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ToneKey } from '../_lib/view-model';

export interface MonitoringKpiCardProps {
  label: string;
  /** null means the value is not available in the snapshot. It is never rendered as zero. */
  value: number | null;
  icon: LucideIcon;
  tone?: ToneKey;
  hint?: string;
  selected?: boolean;
  onSelect?: () => void;
}

const toneClasses: Record<ToneKey, string> = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  blue: 'border-blue-200 bg-blue-50/60 text-blue-950',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-950',
  red: 'border-red-200 bg-red-50/70 text-red-950',
  green: 'border-emerald-200 bg-emerald-50/60 text-emerald-950',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

const iconClasses: Record<ToneKey, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  green: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-100 text-slate-500',
};

export function MonitoringKpiCard({ label, value, icon: Icon, tone = 'neutral', hint, selected = false, onSelect }: MonitoringKpiCardProps) {
  const body = (
    <>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClasses[tone])} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-slate-500">{label}</span>
        {value === null ? (
          <span className="block text-sm font-semibold text-slate-400" title={hint}>No disponible</span>
        ) : (
          <span className="block text-lg font-bold leading-6 tabular-nums">{value.toLocaleString('es-MX')}</span>
        )}
      </span>
    </>
  );
  const className = cn(
    'flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition-colors',
    toneClasses[tone],
    selected && 'ring-2 ring-blue-600 ring-offset-1',
    onSelect && 'hover:brightness-[0.98]',
  );
  if (!onSelect) {
    return <div className={className} aria-label={`${label}: ${value === null ? 'no disponible' : value}`}>{body}</div>;
  }
  return (
    <button type="button" className={className} aria-pressed={selected} aria-label={`${label}: ${value === null ? 'no disponible' : value}`} onClick={onSelect}>
      {body}
    </button>
  );
}

export function MonitoringKpiCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2" aria-label="Cargando indicador">
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
      <span className="min-w-0 space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-10" />
      </span>
    </div>
  );
}
