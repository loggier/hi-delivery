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

import { type Category } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";

export const columns: ColumnDef<Category>[] = [
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
    accessorKey: "slug",
    header: "Slug",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "ACTIVE" ? "success" : "outline";
      return <Badge variant={variant}>{status === "ACTIVE" ? "Activo" : "Inactivo"}</Badge>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado en" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return <span>{format(date, "d 'de' MMMM, yyyy", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const category = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api["product-categories"].useDelete();

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
                <Link href={`/product-categories/${category.id}`}>
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
