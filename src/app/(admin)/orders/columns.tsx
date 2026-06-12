

"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, CheckCircle, XCircle, CookingPot, Bike, Package, Building, Home, ReceiptText } from "lucide-react";
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
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";

import { type Order, OrderStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";


const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    at_store: { label: "En negocio", variant: "default", icon: Building },
    cooking: { label: "En preparación", variant: "default", icon: CookingPot },
    ready_for_pickup: { label: "Listo para recoger", variant: "default", icon: Package },
    picked_up: { label: "Recogido", variant: "default", icon: Package },
    out_for_delivery: { label: "En ruta", variant: "default", icon: Bike },
    on_the_way: { label: "En ruta", variant: "default", icon: Bike },
    arrived_at_destination: { label: "En destino", variant: "default", icon: Home },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    completed: { label: "Completado", variant: "success", icon: CheckCircle },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
    refunded: { label: "Reembolsado", variant: "outline", icon: ReceiptText },
    failed: { label: "Fallido", variant: "destructive", icon: XCircle },
}

function getBusinessStatusKey(status: OrderStatus): string {
  if (['pending_acceptance', 'accepted', 'at_store', 'cooking'].includes(status)) return 'preparing';
  if (status === 'ready_for_pickup') return 'ready_for_pickup';
  if (['picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination'].includes(status)) return 'in_transit';
  if (['completed', 'delivered'].includes(status)) return 'delivered';
  return status;
}

const businessStatusConfig: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline"; icon: React.ElementType }> = {
  preparing: { label: "En preparación", variant: "default", icon: CookingPot },
  ready_for_pickup: { label: "Listo para recoger", variant: "warning", icon: Package },
  in_transit: { label: "En camino", variant: "default", icon: Bike },
  delivered: { label: "Entregado", variant: "success", icon: CheckCircle },
  cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
  failed: { label: "Incidencia", variant: "destructive", icon: XCircle },
  refunded: { label: "Reembolsado", variant: "outline", icon: ReceiptText },
};

export const getColumns = ({ isBusinessOwner }: { isBusinessOwner?: boolean } = {}): ColumnDef<Order>[] => [
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
      const businessKey = isBusinessOwner ? getBusinessStatusKey(status) : status;
      const config = isBusinessOwner
        ? (businessStatusConfig[businessKey] || { label: "Desconocido", variant: "outline" as const, icon: Eye })
        : (statusConfig[status] || { label: "Desconocido", variant: "outline" as const, icon: Eye });

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
    header: "Opciones",
    cell: ({ row }) => {
      const order = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const queryClient = useQueryClient();
      const updateStatusMutation = api.orders.useUpdate();

      const handleStatusChange = async (newStatus: OrderStatus) => {
        const config = statusConfig[newStatus];
        let deliveryFailureReason: string | undefined;

        if (
          order.status === 'arrived_at_destination' &&
          ['failed', 'cancelled'].includes(newStatus)
        ) {
          const reason = window.prompt('Motivo de la incidencia en destino:');
          if (reason === null) return;
          deliveryFailureReason = reason.trim();
          if (!deliveryFailureReason) {
            window.alert('Debes capturar un motivo para cerrar una incidencia en destino.');
            return;
          }
        }

        const ok = await confirm({
          title: `¿Cambiar estado a "${config.label}"?`,
          description: `El pedido #${order.id.substring(0, 8).toUpperCase()} se marcará como ${config.label.toLowerCase()}.`,
          confirmText: `Marcar como ${config.label}`,
          confirmVariant: newStatus === 'cancelled' ? 'destructive' : 'default',
        });

        if (ok) {
          updateStatusMutation.mutate({
            id: order.id,
            status: newStatus,
            ...(deliveryFailureReason
              ? {
                  delivery_failure_reason: deliveryFailureReason,
                  delivery_failure_reported_at: new Date().toISOString(),
                }
              : {}),
          }, {
              onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['orders'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              }
          });
        }
      };

      const isFinished = ['delivered', 'completed', 'cancelled', 'refunded', 'failed'].includes(order.status);
      const canMarkReady = ['pending_acceptance', 'accepted', 'at_store', 'cooking'].includes(order.status);
      const canCancel = ['pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup'].includes(order.status);
      const showBusinessActions = isBusinessOwner && !isFinished && (canMarkReady || canCancel);
      const showAdminActions = !isBusinessOwner && !isFinished;

      return (
        <>
          <ConfirmationDialog />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Opciones</span>
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
              {showBusinessActions && (
                <>
                  <DropdownMenuSeparator />
                  {canMarkReady && (
                    <DropdownMenuItem onClick={() => handleStatusChange('ready_for_pickup')}>
                      <Package className="mr-2 h-4 w-4" /> Marcar como "Listo para recoger"
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <DropdownMenuItem onClick={() => handleStatusChange('cancelled')} className="text-red-600 focus:text-red-600">
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar Pedido
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {showAdminActions && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                  {['accepted', 'pending_acceptance', 'at_store'].includes(order.status) && (
                    <DropdownMenuItem onClick={() => handleStatusChange('cooking')}>
                      <CookingPot className="mr-2 h-4 w-4" /> Marcar como "En preparación"
                    </DropdownMenuItem>
                  )}
                  {['pending_acceptance', 'accepted', 'at_store', 'cooking'].includes(order.status) && (
                    <DropdownMenuItem onClick={() => handleStatusChange('ready_for_pickup')}>
                      <Package className="mr-2 h-4 w-4" /> Marcar como "Listo para recoger"
                    </DropdownMenuItem>
                  )}
                  {['accepted', 'at_store', 'cooking', 'ready_for_pickup'].includes(order.status) && (
                    <DropdownMenuItem onClick={() => handleStatusChange('picked_up')}>
                      <Package className="mr-2 h-4 w-4" /> Marcar como "Recogido"
                    </DropdownMenuItem>
                  )}
                  {['picked_up', 'out_for_delivery', 'on_the_way'].includes(order.status) && (
                    <DropdownMenuItem onClick={() => handleStatusChange('arrived_at_destination')}>
                      <Home className="mr-2 h-4 w-4" /> Marcar como "En destino"
                    </DropdownMenuItem>
                  )}
                  {order.status === 'arrived_at_destination' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Marcar como "Completado"
                    </DropdownMenuItem>
                  )}
                  {order.status === 'arrived_at_destination' && (
                    <DropdownMenuItem onClick={() => handleStatusChange('failed')}>
                      <XCircle className="mr-2 h-4 w-4" /> Reportar incidencia
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
