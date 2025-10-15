"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";

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

const validityTranslations: Record<PlanValidity, string> = {
    mensual: "Mensual",
    quincenal: "Quincenal",
    semanal: "Semanal",
    anual: "Anual",
};

export const columns: ColumnDef<Plan>[] = [
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
    accessorKey: "riderFee",
    header: "Cuota Repartidor",
    cell: ({ row }) => formatCurrency(row.original.riderFee),
  },
  {
    accessorKey: "feePerKm",
    header: "Cuota / KM",
    cell: ({ row }) => formatCurrency(row.original.feePerKm),
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
                    <Pencil /> Editar
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </>
      );
    },
  },
];
