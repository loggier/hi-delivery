import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MonitoringUiHealth } from '@/lib/monitoring/types';

type DataHealthBannerProps = {
  health: MonitoringUiHealth;
  serverTimestamp?: string | null;
};

function snapshotAge(timestamp: string | null | undefined): string {
  if (!timestamp) return 'Actualización no disponible';
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return 'Actualización no disponible';
  const minutes = Math.floor(Math.max(0, Date.now() - parsed) / 60_000);
  return minutes < 1 ? 'Actualizado hace <1 min' : `Actualizado hace ${minutes} min`;
}

export function DataHealthBanner({ health, serverTimestamp }: DataHealthBannerProps) {
  const state = health.realtime === 'degraded' ? 'degraded' : health.snapshot === 'stale' ? 'stale' : 'fresh';
  const content = {
    fresh: { label: 'Datos al día', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    degraded: { label: 'Datos degradados', icon: Activity, className: 'border-amber-200 bg-amber-50 text-amber-900' },
    stale: { label: 'Datos desactualizados', icon: AlertTriangle, className: 'border-red-200 bg-red-50 text-red-900' },
  }[state];
  const Icon = content.icon;

  return (
    <div role="status" className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${content.className}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <Badge variant="outline" className="border-current bg-transparent">{content.label}</Badge>
      {state === 'degraded' && health.snapshot === 'stale' ? <Badge variant="outline" className="border-current bg-transparent">Datos desactualizados</Badge> : null}
      <span>{snapshotAge(serverTimestamp)}</span>
    </div>
  );
}
