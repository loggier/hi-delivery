"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { SlidersHorizontal } from "lucide-react";

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
import { type Table } from "@tanstack/react-table";
import { type Business } from "@/types";
import { type Filters, useBusinessFilters } from "./use-business-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface DataTableToolbarProps {
  table?: Table<Business>; // Make table optional
  search: string;
  setSearch: (value: string) => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}

export function DataTableToolbar({
  table,
  search,
  setSearch,
  filters,
  setFilters
}: DataTableToolbarProps) {
  const isFiltered = Object.values(filters).some(v => v !== '');
  const { data: businessCategoriesData } = api.businessCategories.useGetAll();

  const handleResetFilters = () => {
    setFilters({
        name: '',
        status: '',
        type: '',
        categoryId: '',
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center space-x-2">
            <Input
                placeholder="Filtrar por nombre..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-[150px] lg:w-[250px]"
            />
            
            <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({...prev, status: value === 'all' ? '' : value}))}
            >
                <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    <SelectItem value="PENDING_REVIEW">Pendiente</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({...prev, type: value === 'all' ? '' : value, categoryId: ''}))}
            >
                <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="restaurant">Restaurante</SelectItem>
                    <SelectItem value="store">Tienda</SelectItem>
                    <SelectItem value="service">Servicio</SelectItem>
                </SelectContent>
            </Select>

             <Select
                value={filters.categoryId}
                onValueChange={(value) => setFilters(prev => ({...prev, categoryId: value === 'all' ? '' : value}))}
                disabled={!filters.type}
            >
                <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {businessCategoriesData?.filter(c => c.type === filters.type).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                <Cross2Icon className="ml-2 h-4 w-4" />
            </Button>
            )}
        </div>
      {table && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8 flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Vista
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" && column.getCanHide()
              )
              .map((column) => {
                const translation: Record<string, string> = {
                    name: "Nombre",
                    type: "Tipo",
                    categoryId: "Categoría",
                    ownerName: "Contacto",
                    phoneWhatsApp: "WhatsApp",
                    status: "Estado",
                    updatedAt: "Actualizado",
                }
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {translation[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
