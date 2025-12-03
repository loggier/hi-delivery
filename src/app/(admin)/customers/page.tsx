
"use client";

import React from "react";
import { useDebounce } from 'use-debounce';

import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { useAuthStore } from "@/store/auth-store";

export default function CustomersPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const { user } = useAuthStore();

  const isBusinessOwner = user?.role?.name === 'Dueño de Negocio';

  const { data, isLoading } = api.customers.useGetAll({
    name_search: debouncedSearch,
    // If the user is a business owner, this special filter will be used by the RPC
    business_id: isBusinessOwner ? user.business_id : undefined,
  });
  
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
