"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsPage() {
  const { data: products, isLoading: isLoadingProducts } = api.products.useGetAll();
  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
  const { data: categories, isLoading: isLoadingCategories } = api.product_categories.useGetAll();

  const isLoading = isLoadingProducts || isLoadingBusinesses || isLoadingCategories;

  const columns = React.useMemo(() => getColumns(businesses || [], categories || []), [businesses, categories]);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Productos" description="Gestiona los productos de todos los negocios.">
                <Skeleton className="h-9 w-[120px]" />
            </PageHeader>
            <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-8 w-[80px]" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Productos" description="Gestiona los productos de todos los negocios.">
        <Button asChild>
          <Link href="/products/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Nuevo
          </Link>
        </Button>
      </PageHeader>
      <DataTable 
        columns={columns} 
        data={products || []} 
        isLoading={isLoading} 
        searchKey="name"
      />
    </div>
  );
}
