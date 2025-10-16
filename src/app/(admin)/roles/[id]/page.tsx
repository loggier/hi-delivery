"use client";

import { api } from "@/lib/api";
import { RoleForm } from "../role-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import React from 'react';
import { useParams } from "next/navigation";

export default function EditRolePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: role, isLoading } = api.roles.useGetOne(id);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Editar Rol" />
            <div className="space-y-8 rounded-md border p-8">
                <Skeleton className="h-10 w-1/2" />
                 <Skeleton className="h-64 w-full" />
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
      <PageHeader title="Editar Rol" />
      <RoleForm initialData={role} />
    </div>
  );
}
