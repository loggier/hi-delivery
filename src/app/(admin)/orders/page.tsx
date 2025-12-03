
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

export default function OrdersPage() {
  const { data: dashboardStats, isLoading: isLoadingStats } = api.dashboard.useGetStats();
  const { data: orders, isLoading: isLoadingOrders } = api.orders.useGetAll();
  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
  const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();

  const isLoading = isLoadingStats || isLoadingOrders || isLoadingBusinesses || isLoadingCustomers;

  const columns = React.useMemo(() => getColumns(businesses || [], customers || []), [businesses, customers]);
  
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
                <KPICard title="Ingreso Repartidores" value={formatCurrency(dashboardStats?.dailyRiderEarnings ?? 0)} icon={Wallet} />
            </>
        )}
      </div>

      <OrderStatusGrid data={dashboardStats?.orderStatusSummary} isLoading={isLoadingStats} />
      
      <DataTable
        columns={columns}
        data={orders || []}
        isLoading={isLoading}
        searchKey="id"
      />
    </div>
  );
}
