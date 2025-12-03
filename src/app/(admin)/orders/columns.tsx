

"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, CheckCircle, XCircle, Ban, CookingPot, Bike, Package, Send } from "lucide-react";
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
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";

import { type Order, type Business, type Customer, OrderStatus } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";


const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    cooking: { label: "En preparación", variant: "default", icon: CookingPot },
    out_for_delivery: { label: "En Camino", variant: "default", icon: Bike },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
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
     cell: ({ row }) => {
        const id = row.original.id;
        const displayId = `ORD-${id.substring(0, 8).toUpperCase()}`;
        return <Badge variant="outline" className="font-mono">{displayId}</Badge>
     }
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
      const [ConfirmationDialog, confirm] = useConfirm();
      const updateStatusMutation = api.orders.useUpdate();

      const handleStatusChange = async (newStatus: OrderStatus) => {
        const config = statusConfig[newStatus];
        const ok = await confirm({
          title: `¿Cambiar estado a "${config.label}"?`,
          description: `El pedido #${order.id.substring(0, 8).toUpperCase()} se marcará como ${config.label.toLowerCase()}.`,
          confirmText: `Marcar como ${config.label}`,
          confirmVariant: newStatus === 'cancelled' ? 'destructive' : 'default',
        });

        if (ok) {
          updateStatusMutation.mutate({ id: order.id, status: newStatus });
        }
      };

      const isFinished = order.status === 'delivered' || order.status === 'cancelled';

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
                  <Link href={`/orders/${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                  </Link>
              </DropdownMenuItem>
              {!isFinished && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                    {order.status === 'pending_acceptance' && (
                        <DropdownMenuItem onClick={() => handleStatusChange('accepted')}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Aceptar Pedido
                        </DropdownMenuItem>
                    )}
                    {['accepted', 'pending_acceptance'].includes(order.status) && (
                         <DropdownMenuItem onClick={() => handleStatusChange('cooking')}>
                            <CookingPot className="mr-2 h-4 w-4" /> Marcar como "En preparación"
                        </DropdownMenuItem>
                    )}
                    {order.status === 'cooking' && (
                         <DropdownMenuItem onClick={() => handleStatusChange('out_for_delivery')}>
                            <Bike className="mr-2 h-4 w-4" /> Marcar como "En Camino"
                        </DropdownMenuItem>
                    )}
                    {order.status === 'out_for_delivery' && (
                         <DropdownMenuItem onClick={() => handleStatusChange('delivered')}>
                            <Package className="mr-2 h-4 w-4" /> Marcar como "Entregado"
                        </DropdownMenuItem>
                    )}
                     <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="text-red-600 focus:text-red-600">
                        <XCircle className="mr-2 h-4 w-4" /> Cancelar Pedido
                    </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];

    
