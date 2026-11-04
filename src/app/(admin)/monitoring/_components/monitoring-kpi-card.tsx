import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ToneKey } from '../_lib/view-model';

export interface MonitoringKpiCardProps {
  label: string;
  /** null is rendered as a dash and announced as not available. It is never shown as zero. */
  value: number | null;
  tone?: ToneKey;
  selected?: boolean;
  onSelect?: () => void;
}

// Compact KPI: one title line and one number. Text is always visible; nothing depends on hover.
const toneClasses: Record<ToneKey, string> = {
  neutral: 'border-slate-200 bg-white text-slate-900',
  blue: 'border-blue-200 bg-blue-50 text-blue-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  red: 'border-red-200 bg-red-50 text-red-950',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  slate: 'border-slate-200 bg-slate-50 text-slate-800',
};

export function MonitoringKpiCard({ label, value, tone = 'neutral', selected = false, onSelect }: MonitoringKpiCardProps) {
  const spokenValue = value === null ? 'no disponible' : String(value);
  const body = (
    <>
      <span className="block truncate text-[11px] font-semibold leading-4 text-slate-700">{label}</span>
      <span className="block text-base font-bold leading-5 tabular-nums">{value === null ? '—' : value.toLocaleString('es-MX')}</span>
    </>
  );
  const className = cn(
    'flex min-w-0 flex-col rounded-lg border px-2 py-1.5 text-left shadow-sm transition-colors',
    toneClasses[tone],
    selected && 'ring-2 ring-blue-600 ring-offset-1',
    onSelect && 'hover:brightness-[0.98]',
  );
  if (!onSelect) {
    return <div className={className} aria-label={`${label}: ${spokenValue}`}>{body}</div>;
  }
  return (
    <button type="button" className={className} aria-pressed={selected} aria-label={`${label}: ${spokenValue}`} onClick={onSelect}>
      {body}
    </button>
  );
}

export function MonitoringKpiCardSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5" aria-label="Cargando indicador">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-10" />
    </div>
  );
}
