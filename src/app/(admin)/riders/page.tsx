"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";

export default function RidersPage() {
  const { data: ridersData, isLoading: isLoadingRiders } = api.riders.useGetAll();

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
      />
    </div>
  );
}
