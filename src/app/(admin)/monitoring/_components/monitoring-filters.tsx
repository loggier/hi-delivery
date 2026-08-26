import type { OrderStatus } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonitoringFilterValue = 'all' | string;
type MonitoringZone = { id: string; name: string };

type MonitoringFiltersProps = {
  priority: MonitoringFilterValue;
  zone: MonitoringFilterValue;
  orderStatus: MonitoringFilterValue;
  search: string;
  zones: MonitoringZone[];
  onPriorityChange: (value: MonitoringFilterValue) => void;
  onZoneChange: (value: MonitoringFilterValue) => void;
  onOrderStatusChange: (value: MonitoringFilterValue) => void;
  onSearchChange: (value: string) => void;
};

const priorities = ['P1', 'P2', 'P3'] as const;
const statuses: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending_acceptance', label: 'Pendiente de aceptación' },
  { value: 'accepted', label: 'Aceptado' },
  { value: 'at_store', label: 'En tienda' },
  { value: 'cooking', label: 'En preparación' },
  { value: 'ready_for_pickup', label: 'Listo para recoger' },
  { value: 'picked_up', label: 'Recogido' },
  { value: 'out_for_delivery', label: 'En reparto' },
  { value: 'on_the_way', label: 'En camino' },
  { value: 'arrived_at_destination', label: 'Llegó al destino' },
  { value: 'completed', label: 'Completado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'refunded', label: 'Reembolsado' },
  { value: 'failed', label: 'Fallido' },
];

export function MonitoringFilters({ priority, zone, orderStatus, search, zones, onPriorityChange, onZoneChange, onOrderStatusChange, onSearchChange }: MonitoringFiltersProps) {
  return (
    <div aria-label="Filtros de monitoreo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="monitoring-priority">Prioridad</Label>
        <Select value={priority} onValueChange={onPriorityChange}>
          <SelectTrigger id="monitoring-priority"><SelectValue placeholder="Todas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monitoring-zone">Zona</Label>
        <Select value={zone} onValueChange={onZoneChange}>
          <SelectTrigger id="monitoring-zone"><SelectValue placeholder="Todas las zonas" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas las zonas</SelectItem>{zones.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monitoring-status">Estado del pedido</Label>
        <Select value={orderStatus} onValueChange={onOrderStatusChange}>
          <SelectTrigger id="monitoring-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los estados</SelectItem>{statuses.map((item) => <SelectItem key={item.value} value={item.value} data-value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monitoring-search">Buscar</Label>
        <Input id="monitoring-search" aria-label="Buscar" value={search} maxLength={120} placeholder="Pedido, rider o zona" onChange={(event) => onSearchChange(event.target.value.trimStart().slice(0, 120).trimEnd())} />
      </div>
    </div>
  );
}
