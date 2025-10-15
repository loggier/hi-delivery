"use client";

import { api } from "@/lib/api";
import { ZoneForm } from "../../zone-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound, useParams } from "next/navigation";
import React from 'react';

export default function EditZonePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: zone, isLoading, isError } = api.zones.useGetOne(id);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Zona" />
            <div className="space-y-8 rounded-md border p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="lg:col-span-2">
                        <Skeleton className="h-96 w-full" />
                    </div>
                 </div>
                 <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                 </div>
            </div>
        </div>
    );
  }

  if(isError) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar Zona" />
      <ZoneForm initialData={zone} />
    </div>
  );
}
