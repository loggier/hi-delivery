"use client";

import { api } from "@/lib/api";
import { CategoryForm } from "../category-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import React from 'react';

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: category, isLoading } = api.categories.useGetOne(id);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Categoría" />
            <div className="space-y-8 rounded-md border p-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
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
      <PageHeader title="Editar Categoría" />
      <CategoryForm initialData={category} />
    </div>
  );
}
