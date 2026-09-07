import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonitoringZone = { id: string; name: string };
type MonitoringFiltersProps = {
  zone: string;
  fleetStatus: string;
  signal: string;
  zones: MonitoringZone[];
  onZoneChange: (value: string) => void;
  onFleetStatusChange: (value: string) => void;
  onSignalChange: (value: string) => void;
};

export function MonitoringFilters({ zone, fleetStatus, signal, zones, onZoneChange, onFleetStatusChange, onSignalChange }: MonitoringFiltersProps) {
  return <section aria-label="Filtros de monitoreo" className="flex flex-wrap items-end gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
    <div className="mb-2 hidden items-center gap-1.5 text-xs font-bold text-muted-foreground md:flex"><Filter className="h-3.5 w-3.5" />Filtros</div>
    <div className="min-w-[145px] flex-1 space-y-1"><Label htmlFor="monitoring-zone" className="text-[10px] uppercase tracking-wide text-muted-foreground">Zona</Label><Select value={zone} onValueChange={onZoneChange}><SelectTrigger id="monitoring-zone" className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las zonas</SelectItem>{zones.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="min-w-[145px] flex-1 space-y-1"><Label htmlFor="monitoring-fleet" className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponibilidad</Label><Select value={fleetStatus} onValueChange={onFleetStatusChange}><SelectTrigger id="monitoring-fleet" className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toda la flota</SelectItem><SelectItem value="available">Disponibles</SelectItem><SelectItem value="occupied">Con pedido</SelectItem><SelectItem value="unavailable">No disponibles</SelectItem></SelectContent></Select></div>
    <div className="min-w-[145px] flex-1 space-y-1"><Label htmlFor="monitoring-signal" className="text-[10px] uppercase tracking-wide text-muted-foreground">Señal</Label><Select value={signal} onValueChange={onSignalChange}><SelectTrigger id="monitoring-signal" className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquier señal</SelectItem><SelectItem value="fresh">Ubicación reciente</SelectItem><SelectItem value="stale">Sin señal</SelectItem></SelectContent></Select></div>
  </section>;
}
