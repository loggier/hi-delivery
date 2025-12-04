
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
import { OrderStatus } from '@/types';
import { useAuthStore } from '@/store/auth-store';

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
  const { user } = useAuthStore();
  const isBusinessOwner = user?.role?.name === 'Dueño de Negocio';
  const businessId = isBusinessOwner ? user?.business_id : undefined;

  const { data: dashboardStats, isLoading: isLoadingStats } = api.dashboard.useGetStats({ business_id: businessId });
  
  const { data: orders, isLoading: isLoadingOrders } = api.orders.useGetAll({
    business_id: businessId,
  });

  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
  const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();

  const isLoading = isLoadingOrders || isLoadingBusinesses || isLoadingCustomers || isLoadingStats;

  const columns = React.useMemo(() => getColumns(businesses || [], customers || []), [businesses, customers]);
  
  const filterOrdersByStatus = (statuses: OrderStatus[]): any[] => {
    return orders?.filter(o => statuses.includes(o.status)) || [];
  };

  const pendingOrders = React.useMemo(() => filterOrdersByStatus(['pending_acceptance']), [orders]);
  const preparingOrders = React.useMemo(() => filterOrdersByStatus(['accepted', 'cooking']), [orders]);
  const inTransitOrders = React.useMemo(() => filterOrdersByStatus(['out_for_delivery']), [orders]);
  const historyOrders = React.useMemo(() => filterOrdersByStatus(['delivered', 'cancelled']), [orders]);

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
        
        <OrderStatusGrid data={dashboardStats?.orderStatusSummary} isLoading={isLoadingStats} />
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes
            <OrderCountBadge count={pendingOrders.length} isLoading={isLoadingOrders} />
          </TabsTrigger>
          <TabsTrigger value="preparing">
            En Preparación
            <OrderCountBadge count={preparingOrders.length} isLoading={isLoadingOrders} />
          </TabsTrigger>
          <TabsTrigger value="in_transit">
            En Camino
            <OrderCountBadge count={inTransitOrders.length} isLoading={isLoadingOrders} />
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
           <DataTable
            columns={columns}
            data={pendingOrders}
            isLoading={isLoading}
            searchKey="customer_name"
          />
        </TabsContent>
        <TabsContent value="preparing">
           <DataTable
            columns={columns}
            data={preparingOrders}
            isLoading={isLoading}
            searchKey="customer_name"
          />
        </TabsContent>
        <TabsContent value="in_transit">
           <DataTable
            columns={columns}
            data={inTransitOrders}
            isLoading={isLoading}
            searchKey="customer_name"
          />
        </TabsContent>
        <TabsContent value="history">
           <DataTable
            columns={columns}
            data={historyOrders}
            isLoading={isLoading}
            searchKey="customer_name"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
