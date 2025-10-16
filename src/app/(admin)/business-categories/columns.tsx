"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";

import { type BusinessCategory, type BusinessType } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";

const typeTranslations: Record<BusinessType, string> = {
    restaurant: "Restaurante",
    store: "Tienda",
    service: "Servicio",
}

export const columns: ColumnDef<BusinessCategory>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => typeTranslations[row.original.type]
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.getValue("active");
      return <Badge variant={isActive ? "success" : "outline"}>{isActive ? "Activo" : "Inactivo"}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado en" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <span>{format(date, "d 'de' MMMM, yyyy", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const category = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api["business_categories"].useDelete();

      const handleDelete = async () => {
        const ok = await confirm({
          title: "¿Estás seguro?",
          description: `Esto eliminará permanentemente la categoría "${category.name}".`,
          confirmText: "Eliminar",
        });

        if (ok) {
          deleteMutation.mutate(category.id);
        }
      };

      return (
        <>
        <ConfirmationDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href={`/business-categories/${category.id}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </>
      );
    },
  },
];
