
"use client";

import React from "react";
import { useDebounce } from 'use-debounce';
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { columns } from "./columns";

export default function CustomersPage() {
  const { user } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';
  const [search, setSearch] = React.useState('');
  const [debouncedSearch] = useDebounce(search, 500);

  const customerFilters = React.useMemo(
    () => ({
      ...(isBusinessOwner ? { business_id: user?.business_id } : {}),
      name_search: debouncedSearch,
    }),
    [debouncedSearch, isBusinessOwner, user?.business_id],
  );

  const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll(customerFilters);
  const { data: orderStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['customers', 'order-stats', isBusinessOwner ? user?.business_id : 'all'],
    queryFn: async () => {
      const params = new URLSearchParams({ view: 'customer-stats' });
      if (isBusinessOwner && user?.business_id) params.set('business_id', user.business_id);
      const response = await fetch(`/api/orders?${params.toString()}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.message || 'No se pudieron consultar las estadísticas de pedidos.');
      }

      const statsByCustomer = new Map<string, { order_count: number; total_spent: number }>();
      for (const order of data ?? []) {
        const customerId = order.customer_id as string | null;
        if (!customerId) continue;

        const current = statsByCustomer.get(customerId) ?? { order_count: 0, total_spent: 0 };
        current.order_count += 1;
        current.total_spent += Number(order.order_total) || 0;
        statsByCustomer.set(customerId, current);
      }

      return statsByCustomer;
    },
    enabled: !isBusinessOwner || !!user?.business_id,
  });

  const data = React.useMemo(() => {
    return (customers || []).map((customer) => {
      const stats = orderStats?.get(customer.id);
      return {
        ...customer,
        order_count: stats?.order_count ?? 0,
        total_spent: stats?.total_spent ?? 0,
      };
    });
  }, [customers, orderStats]);
  const isLoading = isLoadingCustomers || isLoadingStats;
  
  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo de Clientes"
        description="Explora y gestiona la información de tus clientes."
      />
      <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        toolbar={
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-[250px] lg:w-[350px]"
          />
        }
      />
    </div>
  );
}
