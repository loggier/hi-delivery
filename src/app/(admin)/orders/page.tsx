"use client";

import React from 'react';
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { OrderStatusGrid } from '../dashboard/order-status-grid';

export default function OrdersPage() {
  const { data: dashboardStats, isLoading: isLoadingStats } = api.dashboard.useGetStats();
  const { data: orders, isLoading: isLoadingOrders } = api.orders.useGetAll();
  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
  const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();

  const isLoading = isLoadingStats || isLoadingOrders || isLoadingBusinesses || isLoadingCustomers;

  const columns = React.useMemo(() => getColumns(businesses || [], customers || []), [businesses, customers]);
  
  return (
    <div className="space-y-4">
      <PageHeader title="Pedidos" description="Gestiona todos los pedidos de la plataforma." />
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
