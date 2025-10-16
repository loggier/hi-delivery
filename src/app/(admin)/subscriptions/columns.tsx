
"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { format, isAfter, isBefore } from "date-fns";
import { es } from 'date-fns/locale';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Business, type Plan, SubscriptionStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

type SubscriptionRow = Business & { plan: Plan | undefined };

const getStatus = (business: SubscriptionRow) => {
    if (!business.subscription_status || !business.current_period_ends_at) {
        return { text: "Inactiva", variant: "outline" };
    }
    const expiryDate = new Date(business.current_period_ends_at);
    const now = new Date();

    if (isAfter(expiryDate, now)) {
        return { text: "Activa", variant: "success" };
    }
    return { text: "Expirada", variant: "destructive" };
};


export const getColumns = (): ColumnDef<SubscriptionRow>[] => [
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
    header: "Información De La Tienda",
    cell: ({ row }) => {
        return (
            <div className="flex items-center gap-3">
                 <Image 
                    src={row.original.logo_url || 'https://placehold.co/40x40/E33739/FFFFFF/png?text=H'}
                    alt={`Logo de ${row.original.name}`}
                    width={40}
                    height={40}
                    className="rounded-md"
                />
                <div className="font-medium">{row.original.name}</div>
            </div>
        )
    }
  },
   {
    id: "planName",
    accessorKey: "plan.name",
    header: "Nombre Del Paquete Actual",
    cell: ({ row }) => row.original.plan?.name || "N/A"
  },
  {
    id: "planPrice",
    accessorKey: "plan.price",
    header: "Precio Del Paquete",
    cell: ({ row }) => row.original.plan ? formatCurrency(row.original.plan.price) : "N/A",
  },
  {
    accessorKey: "current_period_ends_at",
    header: "Fecha De Expiración",
    cell: ({ row }) => {
      const date = row.original.current_period_ends_at;
      return date ? format(new Date(date), "dd MMM, yyyy", { locale: es }) : 'N/A';
    },
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = getStatus(row.original);
      return <Badge variant={status.variant}>{status.text}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const business = row.original;
      return (
        <Button asChild variant="ghost" size="sm">
            <Link href={`/businesses/${business.id}`}>
                Ver Negocio <ArrowRight className="ml-2 h-4 w-4"/>
            </Link>
        </Button>
      );
    },
  },
];
