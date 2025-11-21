"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from 'react';
import { useDebounce } from 'use-debounce';

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { type Filters } from "./data-table-toolbar";


export default function BusinessesPage() {
    const [filters, setFilters] = React.useState<Filters>({
        name: '',
        status: '',
        type: '',
        category_id: '',
    });

  const [debouncedName] = useDebounce(filters.name, 500);

  const { data: businessData, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({ 
    name_search: debouncedName,
    status: filters.status,
    type: filters.type,
    category_id: filters.category_id,
  });
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
                filters={filters}
                setFilters={setFilters}
             />
        }
      />
    </div>
  );
}
