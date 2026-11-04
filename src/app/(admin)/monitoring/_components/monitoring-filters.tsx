import { Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface MonitoringZoneOption { id: string; name: string }

export interface MonitoringFiltersProps {
  zone: string;
  status: string;
  statusOptions: ReadonlyArray<{ value: string; label: string }>;
  zones: readonly MonitoringZoneOption[];
  onZoneChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function MonitoringFilters({ zone, status, statusOptions, zones, onZoneChange, onStatusChange }: MonitoringFiltersProps) {
  return (
    <div aria-label="Filtros de monitoreo" className="flex items-end gap-2">
      <Filter className="mb-2 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="monitoring-zone" className="text-[11px] font-medium text-slate-500">Zona</Label>
        <Select value={zone} onValueChange={onZoneChange}>
          <SelectTrigger id="monitoring-zone" className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            {zones.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="monitoring-status" className="text-[11px] font-medium text-slate-500">Estado</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger id="monitoring-status" className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
