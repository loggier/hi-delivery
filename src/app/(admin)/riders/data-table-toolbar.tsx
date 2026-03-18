"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Rider } from "@/types";

interface RidersDataTableToolbarProps {
  table: Table<Rider>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  onResetQuickFilters: () => void;
  hasQuickFilters: boolean;
}

const columnLabels: Record<string, string> = {
  first_name: "Nombre",
  zone_id: "Zona",
  phone_e164: "Teléfono",
  status: "Estado",
  created_at: "Creado en",
};

export function RidersDataTableToolbar({
  table,
  searchTerm,
  setSearchTerm,
  onResetQuickFilters,
  hasQuickFilters,
}: RidersDataTableToolbarProps) {
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por nombre, email, teléfono o zona..."
          className="h-9 w-full max-w-sm"
        />
        {(hasSearch || hasQuickFilters) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("");
              onResetQuickFilters();
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reiniciar
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto h-8 flex">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Vista
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[170px]">
          <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== "undefined" && column.getCanHide()
            )
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {columnLabels[column.id] || column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
