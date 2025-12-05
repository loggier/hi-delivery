
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
  pending_acceptance: number;
  accepted: number;
  cooking: number;
  out_for_delivery: number;
  delivered: number;
  cancelled: number;
};

interface OrderStatusGridProps {
  data: OrderStatusSummary | undefined;
  isLoading: boolean;
}

const statusConfig = {
  pending_acceptance: { label: 'Pedidos Sin Asignar', icon: ClipboardList, color: 'text-slate-500', bgColor: 'bg-slate-50' },
  accepted: { label: 'Aceptado', icon: Check, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  cooking: { label: 'En preparación', icon: CookingPot, color: 'text-orange-500', bgColor: 'bg-orange-50' },
  out_for_delivery: { label: 'En Camino Para Entrega', icon: Bike, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  delivered: { label: 'Entregado', icon: Package, color: 'text-green-500', bgColor: 'bg-green-50' },
  cancelled: { label: 'Cancelado', icon: Ban, color: 'text-red-500', bgColor: 'bg-red-50' },
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
    const displayStatuses: (keyof typeof statusConfig)[] = ['pending_acceptance', 'accepted', 'cooking', 'out_for_delivery'];
    
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {displayStatuses.map(key => <StatusCardSkeleton key={key}/>)}
            </div>
        );
    }
    
    if (!data) {
        return null;
    }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayStatuses.map((key) => {
            const config = statusConfig[key];
            return (
                 <StatusCard 
                    key={key}
                    label={config.label}
                    value={data[key as keyof OrderStatusSummary] || 0}
                    icon={config.icon}
                    color={config.color}
                    bgColor={config.bgColor}
                />
            )
        })}
    </div>
  );
}
