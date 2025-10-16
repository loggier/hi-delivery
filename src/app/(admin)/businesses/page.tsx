"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from 'react';

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { useBusinessFilters } from "./use-business-filters";

export default function BusinessesPage() {
  const { filters, setFilters, debouncedSearch, search, setSearch } = useBusinessFilters();
  const { data: businessData, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({ ...filters, name: debouncedSearch });
  const { data: categoriesData, isLoading: isLoadingCategories } = api.business_categories.useGetAll();

  const columns = React.useMemo(() => getColumns(categoriesData || []), [categoriesData]);
  const isLoading = isLoadingBusinesses || isLoadingCategories;
  
  return (
    <div className="space-y-4">
      <PageHeader title="Negocios" description="Gestiona los negocios de la plataforma.">
        <Button asChild>
          <Link href="/businesses/new">
            <PlusCircle />
            Nuevo Negocio
          </Link>
        </Button>
      </PageHeader>
       <DataTable
        columns={columns}
        data={businessData || []}
        isLoading={isLoading}
        toolbar={
            <DataTableToolbar
                search={search}
                setSearch={setSearch}
                filters={filters}
                setFilters={setFilters}
             />
        }
      />
    </div>
  );
}
