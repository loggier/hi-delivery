
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { LiveMap } from './live-map';
import { OrderStatus } from '@/types';

function KPICard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/4" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/4" />
      </CardContent>
    </Card>
  );
}

const activeOrderStatuses: OrderStatus[] = ['pending_acceptance', 'accepted', 'cooking', 'out_for_delivery'];

export default function MonitoringPage() {
  const { data: allRiders, isLoading: isLoadingRiders } = api.riders.useGetAll({}, {
    // Refetch every 10 seconds
    refetchInterval: 10000,
  });

  const { data: allOrders, isLoading: isLoadingOrders } = api.orders.useGetAll({}, {
    refetchInterval: 10000,
  });

  const activeRiders = React.useMemo(() => {
    return allRiders?.filter(r => r.is_active_for_orders && r.last_latitude && r.last_longitude) || [];
  }, [allRiders]);

  const activeOrders = React.useMemo(() => {
    return allOrders?.filter(o => activeOrderStatuses.includes(o.status)) || [];
  }, [allOrders]);
  
  const isLoading = isLoadingRiders || isLoadingOrders;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Monitoreo en Vivo"
        description="Vista en tiempo real de repartidores y pedidos activos."
      />
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5 mb-4">
        {isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : (
          <>
            <KPICard title="Repartidores Activos" value={activeRiders.length} icon={Bike} />
            <KPICard title="Pedidos Activos" value={activeOrders.length} icon={ClipboardList} />
          </>
        )}
      </div>
      <div className="flex-grow rounded-lg overflow-hidden">
        <LiveMap riders={activeRiders} />
      </div>
    </div>
  );
}
