
"use client";

import React from "react";
import { useDebounce } from 'use-debounce';

import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table/data-table";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { columns } from "./columns";

export default function CustomersPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch] = useDebounce(search, 500);

  // We are removing the business_id filter to show all customers
  const { data, isLoading } = api.customers.useGetAll({
    name_search: debouncedSearch,
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
