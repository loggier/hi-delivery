"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import { type Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useConfirm } from "@/hooks/use-confirm";

function CustomerActions({ customer }: { customer: Customer }) {
  const deleteMutation = api.customers.useDelete();
  const [ConfirmationDialog, confirm] = useConfirm();

  const handleDelete = async () => {
    const ok = await confirm({
      title: "¿Eliminar cliente?",
      description: "Solo se eliminará si no tiene pedidos relacionados. Si ya tiene historial, se conservará para no romper sus pedidos.",
      confirmText: "Eliminar",
      confirmVariant: "destructive",
    });

    if (!ok) return;
    deleteMutation.mutate(customer.id);
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
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customer.id}`}>
              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customer.id}?edit=1`}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
      const name = `${row.original.first_name} ${row.original.last_name}`;
      return <div className="font-medium">{name}</div>;
    },
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
  },
  {
    accessorKey: "order_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pedidos" />
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.original.order_count || 0}</div>
    ),
  },
  {
    accessorKey: "total_spent",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gasto Total" />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium">
          {formatCurrency(row.original.total_spent || 0)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original;
      return <CustomerActions customer={customer} />;
    },
  },
];
