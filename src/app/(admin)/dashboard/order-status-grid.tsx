
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Check,
  ClipboardList,
  CookingPot,
  Bike,
  Ban,
  CircleDollarSign,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderStatusSummary = {
  unassigned: number;
  accepted: number;
  cooking: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  failed: number;
};

interface OrderStatusGridProps {
  data: OrderStatusSummary | undefined;
  isLoading: boolean;
}

const statusConfig = {
  unassigned: { label: 'Pedidos Sin Asignar', icon: ClipboardList, color: 'text-slate-500', bgColor: 'bg-slate-50' },
  accepted: { label: 'Aceptado Por El Repartidor', icon: Check, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  cooking: { label: 'Cocinando', icon: CookingPot, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  outForDelivery: { label: 'En Camino Para Entrega', icon: Bike, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  delivered: { label: 'Entregado', icon: Package, color: 'text-green-500', bgColor: 'bg-green-50' },
  cancelled: { label: 'Cancelado', icon: Ban, color: 'text-red-500', bgColor: 'bg-red-50' },
  refunded: { label: 'Reembolsado', icon: CircleDollarSign, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  failed: { label: 'Pago Fallido', icon: AlertCircle, color: 'text-rose-500', bgColor: 'bg-rose-50' },
};

const StatusCard = ({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) => (
  <Card className={cn("dark:bg-slate-800/50", bgColor)}>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("p-2 rounded-full", bgColor)}>
        <Icon className={cn("h-6 w-6", color)} />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
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
)

export function OrderStatusGrid({ data, isLoading }: OrderStatusGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
               {Object.keys(statusConfig).map(key => <StatusCardSkeleton key={key}/>)}
            </div>
        );
    }
    
    if (!data) {
        return null;
    }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => (
            <StatusCard 
                key={key}
                label={config.label}
                value={data[key as keyof OrderStatusSummary]}
                icon={config.icon}
                color={config.color}
                bgColor={config.bgColor}
            />
        ))}
    </div>
  );
}
