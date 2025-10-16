"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, ToggleLeft, ToggleRight } from "lucide-react";
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

import { type Business, type BusinessType } from "@/types";
import { useConfirm } from "@/hooks/use-confirm";
import { api } from "@/lib/api";
import { businessCategories } from "@/mocks/data";
import { cn } from "@/lib/utils";

const typeTranslations: Record<BusinessType, string> = {
    restaurant: "Restaurante",
    store: "Tienda",
    service: "Servicio",
}

export const columns: ColumnDef<Business>[] = [
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
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => typeTranslations[row.original.type]
  },
  {
    accessorKey: "category_id",
    header: "Categoría",
    cell: ({ row }) => {
        const category = businessCategories.find(c => c.id === row.original.category_id);
        return category ? category.name : 'N/A';
    }
  },
  {
    accessorKey: "owner_name",
    header: "Contacto",
  },
  {
    accessorKey: "phone_whatsapp",
    header: "WhatsApp",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "ACTIVE" ? "success" : status === "PENDING_REVIEW" ? "warning" : "outline";
      const text = status === "ACTIVE" ? "Activo" : status === "PENDING_REVIEW" ? "Pendiente" : "Inactivo";
      return <Badge variant={variant} className={cn(
        status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
        status === "INACTIVE" && "bg-slate-100 text-slate-600",
        status === "PENDING_REVIEW" && "border-amber-500/20 bg-amber-50 text-amber-700",
        "capitalize"
      )}>{text}</Badge>;
    },
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
      const business = row.original;
      const [ConfirmationDialog, confirm] = useConfirm();
      const deleteMutation = api.businesses.useDelete();
      const updateMutation = api.businesses.useUpdate();

      const handleDelete = async () => {
        const ok = await confirm({
          title: "¿Estás seguro?",
          description: `Esto eliminará permanentemente el negocio "${business.name}".`,
          confirmText: "Eliminar",
          confirmVariant: "destructive",
        });

        if (ok) {
          deleteMutation.mutate(business.id);
        }
      };

      const handleToggleStatus = async () => {
        const newStatus = business.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const ok = await confirm({
            title: `¿Quieres ${newStatus === 'ACTIVE' ? 'activar' : 'desactivar'} este negocio?`,
            description: `El negocio "${business.name}" será marcado como ${newStatus === 'ACTIVE' ? 'activo' : 'inactivo'}.`,
            confirmText: newStatus === 'ACTIVE' ? 'Activar' : 'Desactivar',
            confirmVariant: newStatus === 'ACTIVE' ? 'default' : 'secondary',
        })

        if (ok) {
            updateMutation.mutate({ id: business.id, status: newStatus });
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
                <Link href={`/businesses/${business.id}`}>
                    <Eye /> Ver
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                <Link href={`/businesses/${business.id}/edit`}>
                    <Pencil /> Editar
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {business.status === 'ACTIVE' ? <ToggleLeft /> : <ToggleRight />}
              {business.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
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
