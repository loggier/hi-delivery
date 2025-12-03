"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, CheckCircle, XCircle, Ban, CookingPot, Bike, Package } from "lucide-react";
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

import { type Order, type Business, type Customer } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

type OrderStatus = 'pending_acceptance' | 'accepted' | 'cooking' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' | 'failed';

const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    cooking: { label: "Cocinando", variant: "default", icon: CookingPot },
    out_for_delivery: { label: "En Camino", variant: "default", icon: Bike },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
    refunded: { label: "Reembolsado", variant: "destructive", icon: Ban },
    failed: { label: "Fallido", variant: "destructive", icon: XCircle },
}

export const getColumns = (businesses: Business[], customers: Customer[]): ColumnDef<Order>[] => [
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
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID Pedido" />
    ),
     cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.id.split('-')[0].toUpperCase()}</Badge>
  },
  {
    accessorKey: "customer_name",
    header: "Cliente",
  },
  {
    id: 'businessName',
    accessorFn: row => row.business?.name,
    header: "Negocio",
  },
  {
    accessorKey: "order_total",
    header: "Monto",
    cell: ({ row }) => formatCurrency(row.original.order_total),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as OrderStatus;
      const config = statusConfig[status] || { label: "Desconocido", variant: "outline", icon: Eye };

      return <Badge variant={config.variant} className="capitalize">
        <config.icon className="mr-2 h-3 w-3" />
        {config.label}
      </Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <span>{format(date, "d MMM, yyyy, h:mm a", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;
      return (
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
                <Link href={`/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
