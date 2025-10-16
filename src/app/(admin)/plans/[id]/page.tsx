"use client";

import { api } from "@/lib/api";
import { PlanForm } from "../plan-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound, useParams } from "next/navigation";
import React from 'react';
import { SubscribedBusinesses } from "../subscribed-businesses";
import { Separator } from "@/components/ui/separator";

export default function EditPlanPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: plan, isLoading, isError } = api.plans.useGetOne(id);
  const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({ plan_id: id });


  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Plan" />
            <div className="space-y-8 rounded-md border p-8">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-24 w-full" />
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
        <PageHeader title="Editar Plan" />
        <PlanForm initialData={plan} />
      </div>
      <Separator />
      <SubscribedBusinesses 
        planName={plan?.name || ""} 
        businesses={businesses}
        isLoading={isLoadingBusinesses}
      />
    </div>
  );
}
