"use client";

import { api } from "@/lib/api";
import { RiderForm } from "../../rider-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound, useParams } from "next/navigation";
import React from 'react';

export default function EditRiderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: rider, isLoading, isError } = api.riders.useGetOne(id);
  const { data: zones, isLoading: isLoadingZones } = api.zones.useGetAll({ status: 'ACTIVE' });

  const isLoadingData = isLoading || isLoadingZones;

  if (isLoadingData) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Repartidor" />
            <div className="space-y-8 rounded-md border p-8">
                <Skeleton className="h-96 w-full" />
                <Skeleton className="h-64 w-full" />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </div>
    );
  }

  if (isError) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Editar Repartidor" />
      <RiderForm 
        initialData={rider} 
        zones={zones || []}
      />
    </div>
  );
}
