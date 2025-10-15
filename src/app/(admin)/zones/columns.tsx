"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, ToggleLeft, ToggleRight, Users, Building2 } from "lucide-react";
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

import { type Zone } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const columns: ColumnDef<Zone>[] = [
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
    cell: ({ row }) => {
        return (
            <div className="font-medium">{row.original.name}</div>
        )
    }
  },
  {
    accessorKey: "businessCount",
    header: "Negocios",
     cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500"/> {row.original.businessCount}
        </div>
     )
  },
  {
    accessorKey: "riderCount",
    header: "Repartidores",
     cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500"/> {row.original.riderCount}
        </div>
     )
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "ACTIVE" ? "success" : "outline";
      const text = status === "ACTIVE" ? "Activo" : "Inactivo";
      return <Badge variant={variant} className={cn(
        status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
        status === "INACTIVE" && "bg-slate-100 text-slate-600",
        "capitalize"
      )}>{text}</Badge>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Actualizado" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("updatedAt"));
      return <span>{format(date, "d MMM, yyyy", { locale: es })}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const zone = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api.zones.useDelete();
      const updateMutation = api.zones.useUpdate();

      const handleDelete = async () => {
        const ok = await confirm({
          title: "¿Estás seguro?",
          description: `Esto eliminará permanentemente la zona "${zone.name}".`,
          confirmText: "Eliminar",
          confirmVariant: "destructive",
        });

        if (ok) {
          deleteMutation.mutate(zone.id);
        }
      };

      const handleToggleStatus = async () => {
        const newStatus = zone.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const ok = await confirm({
            title: `¿Quieres ${newStatus === 'ACTIVE' ? 'activar' : 'desactivar'} esta zona?`,
            description: `La zona "${zone.name}" será marcada como ${newStatus === 'ACTIVE' ? 'activa' : 'inactiva'}.`,
            confirmText: newStatus === 'ACTIVE' ? 'Activar' : 'Desactivar',
        })

        if (ok) {
            updateMutation.mutate({ id: zone.id, status: newStatus });
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
                <Link href={`/zones/${zone.id}`}>
                    <Eye /> Ver
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href={`/zones/${zone.id}/edit`}>
                    <Pencil /> Editar
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {zone.status === 'ACTIVE' ? <ToggleLeft /> : <ToggleRight />}
              {zone.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
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
