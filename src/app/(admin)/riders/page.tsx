"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useDebounce } from 'use-debounce';

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { RidersToolbar } from "./riders-toolbar";

export default function RidersPage() {
  const [filters, setFilters] = useState({ search: '', status: '', zone: '' });
  const [debouncedSearch] = useDebounce(filters.search, 500);

  const { data, isLoading } = api.riders.useGetAll({ 
      search: debouncedSearch,
      status: filters.status,
      zone: filters.zone,
  });
  
  return (
    <div className="space-y-4">
      <PageHeader title="Repartidores" description="Gestiona los repartidores de la plataforma.">
        {/* The button to create new riders is commented out as creation is done via the public form */}
        {/* <Button asChild>
          <Link href="/riders/new">
            <PlusCircle />
            Nuevo Repartidor
          </Link>
        </Button> */}
      </PageHeader>
       <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        toolbar={
            <RidersToolbar
                filters={filters}
                setFilters={setFilters}
             />
        }
      />
    </div>
  );
}
