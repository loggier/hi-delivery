"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiderStatus } from "@/types";

interface RidersToolbarProps {
  filters: { search: string; status: string; zone: string };
  setFilters: React.Dispatch<React.SetStateAction<{ search: string; status: string; zone: string }>>;
}

const statusOptions: { value: RiderStatus; label: string }[] = [
    { value: 'pending_review', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'inactive', label: 'Inactivo' },
];

const zoneOptions = ['Monterrey', 'Culiacan', 'Mazatlan'];

export function RidersToolbar({ filters, setFilters }: RidersToolbarProps) {
  const isFiltered = filters.status !== '' || filters.zone !== '' || filters.search !== '';

  const handleResetFilters = () => {
    setFilters({ search: '', status: '', zone: '' });
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Buscar por nombre, email, tel..."
          value={filters.search}
          onChange={(event) => setFilters(prev => ({...prev, search: event.target.value}))}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.zone}
          onValueChange={(value) => setFilters(prev => ({ ...prev, zone: value === 'all' ? '' : value }))}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            {zoneOptions.map(zone => (
                <SelectItem key={zone} value={zone}>{zone}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-8 px-2 lg:px-3"
          >
            Reiniciar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
