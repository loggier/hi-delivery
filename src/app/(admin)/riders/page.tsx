"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from 'use-debounce';

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";
import { RidersToolbar } from "./riders-toolbar";

export default function RidersPage() {
  const [filters, setFilters] = useState({ search: '', status: '', zone: '' });
  const [debouncedSearch] = useDebounce(filters.search, 500);

  const { data: ridersData, isLoading: isLoadingRiders } = api.riders.useGetAll({ 
      name_search: debouncedSearch,
      status: filters.status,
      zone_id: filters.zone,
  });

  const { data: zonesData, isLoading: isLoadingZones } = api.zones.useGetAll();
  
  const columns = useMemo(() => getColumns(zonesData || []), [zonesData]);
  const isLoading = isLoadingRiders || isLoadingZones;
  
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
        data={ridersData || []}
        isLoading={isLoading}
        toolbar={
            <RidersToolbar
                filters={filters}
                setFilters={setFilters}
                zones={zonesData || []}
                isLoadingZones={isLoadingZones}
             />
        }
      />
    </div>
  );
}
