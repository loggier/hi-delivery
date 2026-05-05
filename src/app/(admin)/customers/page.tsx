
"use client";

import React from "react";
import { useDebounce } from 'use-debounce';
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { columns } from "./columns";

export default function CustomersPage() {
  const { user } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';
  const supabase = createClient();
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
      let query = supabase
        .from('orders')
        .select('customer_id, order_total, business_id');

      if (isBusinessOwner && user?.business_id) {
        query = query.eq('business_id', user.business_id);
      }

      const { data, error } = await query;
      if (error) throw error;

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
