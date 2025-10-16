"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
import { type Plan, type PlanValidity } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const validityTranslations: Record<PlanValidity, string> = {
    mensual: "Mensual",
    quincenal: "Quincenal",
    semanal: "Semanal",
    anual: "Anual",
};

export const columns: ColumnDef<Plan & { businessCount?: number }>[] = [
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
      <DataTableColumnHeader column={column} title="Nombre del Plan" />
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" />
    ),
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    accessorKey: "validity",
    header: "Validez",
    cell: ({ row }) => validityTranslations[row.original.validity],
  },
   {
    accessorKey: "businessCount",
    header: "Negocios",
    cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500"/> {row.original.businessCount}
        </div>
     )
  },
  {
    accessorKey: "rider_fee",
    header: "Cuota Repartidor",
    cell: ({ row }) => formatCurrency(row.original.rider_fee),
  },
  {
    accessorKey: "fee_per_km",
    header: "Cuota / KM",
    cell: ({ row }) => formatCurrency(row.original.fee_per_km),
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actualizado" />
    ),
     cell: ({ row }) => {
      const date = new Date(row.getValue("updated_at"));
      return <span>{format(date, "d MMM, yyyy", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const plan = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api.plans.useDelete();

      const handleDelete = async () => {
        const ok = await confirm({
          title: "¿Estás seguro?",
          description: `Esto eliminará permanentemente el plan "${plan.name}".`,
          confirmText: "Eliminar",
          confirmVariant: "destructive",
        });

        if (ok) {
          deleteMutation.mutate(plan.id);
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
                <Link href={`/plans/${plan.id}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
