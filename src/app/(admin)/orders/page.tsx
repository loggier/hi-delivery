
"use client";

import React from 'react';
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { OrderStatusGrid } from '../dashboard/order-status-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { type Order, OrderStatus } from '@/types';
import { useAuthStore } from '@/store/auth-store';

type OrderTab = {
  value: string;
  label: string;
  statuses: OrderStatus[];
};

const orderTabs: OrderTab[] = [
  {
    value: 'pending_acceptance',
    label: 'Pendientes',
    statuses: ['pending_acceptance'],
  },
  {
    value: 'accepted',
    label: 'Aceptados',
    statuses: ['accepted'],
  },
  {
    value: 'at_store',
    label: 'En negocio',
    statuses: ['at_store'],
  },
  {
    value: 'cooking',
    label: 'Preparación',
    statuses: ['cooking'],
  },
  {
    value: 'ready_for_pickup',
    label: 'Listos',
    statuses: ['ready_for_pickup'],
  },
  {
    value: 'picked_up',
    label: 'Recogidos',
    statuses: ['picked_up'],
  },
  {
    value: 'in_route',
    label: 'En ruta',
    statuses: ['out_for_delivery', 'on_the_way'],
  },
  {
    value: 'arrived_at_destination',
    label: 'En destino',
    statuses: ['arrived_at_destination'],
  },
  {
    value: 'history',
    label: 'Historial',
    statuses: ['delivered', 'completed', 'cancelled', 'refunded', 'failed'],
  },
];

const businessOrderTabs: OrderTab[] = [
  {
    value: 'preparing',
    label: 'En preparación',
    statuses: ['pending_acceptance', 'accepted', 'at_store', 'cooking'],
  },
  {
    value: 'ready_for_pickup',
    label: 'Listo para recoger',
    statuses: ['ready_for_pickup'],
  },
  {
    value: 'in_transit',
    label: 'En camino',
    statuses: ['picked_up', 'out_for_delivery', 'on_the_way', 'arrived_at_destination'],
  },
  {
    value: 'history',
    label: 'Historial',
    statuses: ['completed', 'delivered', 'cancelled', 'failed', 'refunded'],
  },
];

function KPICard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
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

const OrderCountBadge = ({ count, isLoading }: { count: number, isLoading: boolean }) => (
    <Badge className="ml-2" variant={count > 0 ? "default" : "secondary"}>
        {isLoading ? <div className="h-4 w-4 rounded-full animate-pulse bg-white/50" /> : count}
    </Badge>
);

export default function OrdersPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';
  const businessId = isBusinessOwner ? user?.business_id : undefined;
  const canLoadScopedData = !isAuthLoading && (!isBusinessOwner || Boolean(businessId));

  const { data: dashboardStats, isLoading: isLoadingStats } = api.dashboard.useGetStats(
    { business_id: businessId },
    { enabled: canLoadScopedData }
  );
  
  const { data: orders, isLoading: isLoadingOrders } = api.orders.useGetAll({
    business_id: businessId,
  }, {
    enabled: canLoadScopedData,
  });

  const isLoading = isAuthLoading || isLoadingOrders || isLoadingStats;

  const tabs = isBusinessOwner ? businessOrderTabs : orderTabs;

  const columns = React.useMemo(() => getColumns({ isBusinessOwner }), [isBusinessOwner]);
  const ordersByTab = React.useMemo(() => {
    return tabs.reduce<Record<string, Order[]>>((acc, tab) => {
      acc[tab.value] = orders?.filter((order) => tab.statuses.includes(order.status)) || [];
      return acc;
    }, {});
  }, [orders, tabs]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Gestiona todos los pedidos de la plataforma." />
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingStats ? (
                <>
                    <KPICardSkeleton />
                    <KPICardSkeleton />
                </>
            ) : (
                <>
                    <KPICard title="Ingresos del Día" value={formatCurrency(dashboardStats?.dailyRevenue ?? 0)} icon={DollarSign} />
                     {!isBusinessOwner && (
                        <KPICard title="Ingreso Repartidores" value={formatCurrency(dashboardStats?.dailyRiderEarnings ?? 0)} icon={Wallet} />
                     )}
                </>
            )}
        </div>
        
        <OrderStatusGrid data={dashboardStats?.orderStatusSummary as any} isLoading={isLoadingStats} />
      
      <Tabs defaultValue={isBusinessOwner ? "preparing" : "pending_acceptance"} className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex h-auto min-w-max flex-nowrap gap-1 p-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="h-9 whitespace-nowrap">
                {tab.label}
                <OrderCountBadge count={(ordersByTab[tab.value] || []).length} isLoading={isLoadingOrders} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <DataTable
              columns={columns}
              data={ordersByTab[tab.value] || []}
              isLoading={isLoading}
              searchKey="cliente"
              enableRowSelection={false}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
