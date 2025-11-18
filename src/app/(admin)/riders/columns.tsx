"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, XCircle, Ban, Power } from "lucide-react";
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

import { type Rider, RiderStatus, type Zone } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const statusConfig: Record<RiderStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline", icon: React.ElementType }> = {
    approved: { label: "Aprobado", variant: "success", icon: CheckCircle },
    pending_review: { label: "Pendiente", variant: "warning", icon: Pencil },
    rejected: { label: "Rechazado", variant: "destructive", icon: XCircle },
    inactive: { label: "Inactivo", variant: "outline", icon: Ban },
    incomplete: { label: "Incompleto", variant: "outline", icon: Pencil },
}

export const getColumns = (zones: Zone[]): ColumnDef<Rider>[] => [
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
    accessorKey: "first_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => {
        const name = `${row.original.first_name} ${row.original.last_name}`;
        return (
            <div className="font-medium">{name}</div>
        )
    }
  },
   {
    accessorKey: "zone_id",
    header: "Zona",
    cell: ({ row }) => {
      const zone = zones.find(z => z.id === row.original.zone_id);
      return zone?.name || 'N/A';
    }
  },
  {
    accessorKey: "phone_e164",
    header: "Teléfono",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as RiderStatus;
      const config = statusConfig[status] || statusConfig['inactive'];
      const variant = config.variant;

      return <Badge variant={variant} className={cn(
        status === "approved" && "border-green-600/20 bg-green-50 text-green-700",
        status === "inactive" && "bg-slate-100 text-slate-600",
        status === "rejected" && "border-red-600/10 bg-red-50 text-red-700",
        (status === "pending_review" || status === 'incomplete') && "border-amber-500/20 bg-amber-50 text-amber-700",
        "capitalize"
      )}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creado en" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <span>{format(date, "d MMM, yyyy", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const rider = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api.riders.useDelete();
      const updateStatusMutation = api.riders.useUpdate();

      const handleDelete = async () => {
        const ok = await confirm({
          title: "¿Estás seguro?",
          description: `Esto eliminará permanentemente al repartidor "${rider.first_name} ${rider.last_name}".`,
          confirmText: "Eliminar",
          confirmVariant: "destructive",
        });

        if (ok) {
          deleteMutation.mutate(rider.id);
        }
      };

      const handleStatusChange = async (newStatus: RiderStatus) => {
        const config = statusConfig[newStatus];
        const ok = await confirm({
            title: `¿Confirmas que quieres cambiar el estado a "${config.label}"?`,
            description: `El repartidor "${rider.first_name} ${rider.last_name}" será marcado como ${config.label.toLowerCase()}.`,
            confirmText: `Marcar como ${config.label}`,
        })

        if (ok) {
            updateStatusMutation.mutate({ id: rider.id, status: newStatus });
        }
      }

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
                <Link href={`/riders/${rider.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                </Link>
            </DropdownMenuItem>
             {rider.status === "pending_review" && (
                <>
                    <DropdownMenuItem onClick={() => handleStatusChange('approved')} className="text-green-600 focus:text-green-600">
                        <CheckCircle className="mr-2 h-4 w-4" /> Aprobar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange('rejected')} className="text-red-600 focus:text-red-600">
                        <XCircle className="mr-2 h-4 w-4" /> Rechazar
                    </DropdownMenuItem>
                </>
             )}
             {rider.status === "approved" && (
                <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                    <Ban className="mr-2 h-4 w-4" /> Inactivar
                </DropdownMenuItem>
             )}
             {(rider.status === "inactive" || rider.status === 'rejected') && (
                <DropdownMenuItem onClick={() => handleStatusChange('approved')}>
                    <Power className="mr-2 h-4 w-4" /> Reactivar/Aprobar
                </DropdownMenuItem>
             )}

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

    