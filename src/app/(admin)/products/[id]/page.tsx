"use client";

import { api } from "@/lib/api";
import { ProductForm } from "../product-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import React from 'react';
import { useParams } from "next/navigation";

export default function EditProductPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: product, isLoading: isLoadingProduct } = api.products.useGetOne(id);
  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
  const { data: categories, isLoading: isLoadingCategories } = api.product_categories.useGetAll();

  const isLoading = isLoadingProduct || isLoadingBusinesses || isLoadingCategories;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Producto" />
            <div className="space-y-8 rounded-md border p-8">
                 <Skeleton className="h-96 w-full" />
                 <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-24" />
                 </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar Producto" />
      <ProductForm 
        initialData={product as any}
        businesses={businesses || []}
        categories={categories || []}
       />
    </div>
  );
}
