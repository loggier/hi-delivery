"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Ban,
  Bike,
  CheckCircle2,
  CookingPot,
  Hourglass,
  MapPin,
  PackageCheck,
  RotateCcw,
  Store,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrderStatusKey } from '@/lib/dashboard/owner-stats-types';

type StatusCounts = Partial<Record<OrderStatusKey, number>>;

interface OrderStatusGridProps {
  data: StatusCounts | undefined;
  isLoading: boolean;
}

// Etiquetas canónicas del ciclo de vida (docs/order-lifecycle-homologado.md).
// "En negocio" es at_store; "En preparación" es cooking; accepted va aparte.
// Recogido agrupa picked_up y los alias de ruta (on_the_way, out_for_delivery).
type StatusBucket = {
  label: string;
  statuses: OrderStatusKey[];
  icon: React.ElementType;
  textClass: string;
  bgClass: string;
};

const STATUS_BUCKETS: StatusBucket[] = [
  { label: 'Pendiente', statuses: ['pending_acceptance'], icon: Hourglass, textClass: 'text-slate-700', bgClass: 'bg-slate-50' },
  { label: 'Aceptado', statuses: ['accepted'], icon: UserCheck, textClass: 'text-blue-700', bgClass: 'bg-blue-50' },
  { label: 'En negocio', statuses: ['at_store'], icon: Store, textClass: 'text-amber-700', bgClass: 'bg-amber-50' },
  { label: 'En preparación', statuses: ['cooking'], icon: CookingPot, textClass: 'text-orange-700', bgClass: 'bg-orange-50' },
  { label: 'Listo para recoger', statuses: ['ready_for_pickup'], icon: PackageCheck, textClass: 'text-teal-700', bgClass: 'bg-teal-50' },
  { label: 'Recogido', statuses: ['picked_up', 'on_the_way', 'out_for_delivery'], icon: Bike, textClass: 'text-indigo-700', bgClass: 'bg-indigo-50' },
  { label: 'En destino', statuses: ['arrived_at_destination'], icon: MapPin, textClass: 'text-violet-700', bgClass: 'bg-violet-50' },
  { label: 'Completado', statuses: ['completed', 'delivered'], icon: CheckCircle2, textClass: 'text-green-700', bgClass: 'bg-green-50' },
  { label: 'Cancelado', statuses: ['cancelled'], icon: Ban, textClass: 'text-red-700', bgClass: 'bg-red-50' },
  { label: 'Fallido', statuses: ['failed'], icon: AlertTriangle, textClass: 'text-rose-700', bgClass: 'bg-rose-50' },
  { label: 'Reembolsado', statuses: ['refunded'], icon: RotateCcw, textClass: 'text-gray-700', bgClass: 'bg-gray-50' },
];

const StatusCard = ({
  label,
  value,
  icon: Icon,
  textClass,
  bgClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  textClass: string;
  bgClass: string;
}) => (
  <Card className={cn("dark:bg-slate-800/50", bgClass)}>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-2 rounded-full bg-white/70")}>
        <Icon className={cn("h-6 w-6", textClass)} aria-hidden="true" />
      </div>
      <div>
        <div className={cn("text-2xl font-bold", textClass)}>{value}</div>
        <p className={cn("text-xs font-medium", textClass)}>{label}</p>
      </div>
    </CardContent>
  </Card>
);

const StatusCardSkeleton = () => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className='space-y-2'>
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-3 w-24" />
      </div>
    </CardContent>
  </Card>
);

export function OrderStatusGrid({ data, isLoading }: OrderStatusGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((key) => <StatusCardSkeleton key={key} />)}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {STATUS_BUCKETS.map((bucket) => {
        const value = bucket.statuses.reduce((total, status) => total + (data[status] || 0), 0);
        return (
          <StatusCard
            key={bucket.label}
            label={bucket.label}
            value={value}
            icon={bucket.icon}
            textClass={bucket.textClass}
            bgClass={bucket.bgClass}
          />
        );
      })}
    </div>
  );
}
