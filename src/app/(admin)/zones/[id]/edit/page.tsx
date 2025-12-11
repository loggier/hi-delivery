
"use client";

import { api } from "@/lib/api";
import { ZoneForm } from "../../zone-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound, useParams } from "next/navigation";
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { AreaList } from "../../area-list";

export default function EditZonePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: zone, isLoading, isError } = api.zones.useGetOne(id);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Zona" />
            <div className="space-y-8 rounded-md border p-8">
                 <Skeleton className="h-96 w-full" />
                 <Skeleton className="h-48 w-full" />
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
    <div className="space-y-8">
      <div>
        <PageHeader title="Editar Zona" />
        <ZoneForm initialData={zone} />
      </div>
      
      <Separator />

      <div>
        <AreaList zone={zone} />
      </div>
    </div>
  );
}
