"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { columns } from "./columns";

export default function RolesPage() {
  const { data: roles, isLoading } = api.roles.useGetAll();

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Roles y Permisos" description="Gestiona los roles de los usuarios del sistema.">
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
      <PageHeader title="Roles y Permisos" description="Gestiona los roles de los usuarios del sistema y sus permisos.">
        <Button asChild>
          <Link href="/roles/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Rol
          </Link>
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={roles || []} searchKey="name"/>
    </div>
  );
}
