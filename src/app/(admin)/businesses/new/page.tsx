"use client";

import { BusinessFormWrapper } from "../business-form";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewBusinessPage() {
  const { data: categories, isLoading: isLoadingCategories } = api.business_categories.useGetAll();
  const { data: zones, isLoading: isLoadingZones } = api.zones.useGetAll();

  const isLoading = isLoadingCategories || isLoadingZones;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Nuevo Negocio" />
        <div className="space-y-8 rounded-md border p-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Negocio" />
      <BusinessFormWrapper categories={categories || []} zones={zones || []} />
    </div>
  );
}
