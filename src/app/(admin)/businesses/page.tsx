"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { useBusinessFilters } from "./use-business-filters";

export default function BusinessesPage() {
  const { filters, setFilters, debouncedSearch, search, setSearch } = useBusinessFilters();
  const { data, isLoading } = api.businesses.useGetAll({ ...filters, name: debouncedSearch });
  
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
        data={data || []}
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
