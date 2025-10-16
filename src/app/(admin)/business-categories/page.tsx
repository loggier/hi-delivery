"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";

export default function BusinessCategoriesPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch] = useDebounce(search, 500);

  const { data: categories, isLoading } = api["business-categories"].useGetAll({ name: debouncedSearch });

  return (
    <div className="space-y-4">
      <PageHeader title="Categorías de Negocios" description="Gestiona las categorías de los negocios en la plataforma.">
        <Button asChild>
          <Link href="/business-categories/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Nueva
          </Link>
        </Button>
      </PageHeader>
      <DataTable 
        columns={columns} 
        data={categories || []} 
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
