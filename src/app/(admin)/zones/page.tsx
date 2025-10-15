"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";

export default function ZonesPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch] = useDebounce(search, 500);
  const { data, isLoading } = api.zones.useGetAll({ name: debouncedSearch });
  
  return (
    <div className="space-y-4">
      <PageHeader title="Zonas" description="Gestiona las zonas de operación.">
        <Button asChild>
          <Link href="/zones/new">
            <PlusCircle />
            Nueva Zona
          </Link>
        </Button>
      </PageHeader>
       <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        toolbar={
            <Input
                placeholder="Filtrar por nombre..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 w-[150px] lg:w-[250px]"
            />
        }
      />
    </div>
  );
}
