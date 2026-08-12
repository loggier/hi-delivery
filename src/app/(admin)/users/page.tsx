"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";

export default function UsersPage() {
  const { data: usersData, isLoading: isLoadingUsers } = api.users.useGetAll();
  const { data: ridersData, isLoading: isLoadingRiders } = api.riders.useGetAll();
  const { data: rolesData, isLoading: isLoadingRoles } = api.roles.useGetAll();

  const columns = React.useMemo(() => getColumns(rolesData || []), [rolesData]);
  const usersWithRiderPhone = React.useMemo(
    () => (usersData || []).map((user) => ({
      ...user,
      phone_e164: ridersData?.find((rider) => rider.user_id === user.id)?.phone_e164 ?? null,
    })),
    [ridersData, usersData],
  );
  const isLoading = isLoadingUsers || isLoadingRoles || isLoadingRiders;

  return (
    <div className="space-y-4">
      <PageHeader title="Usuarios del Sistema" description="Gestiona los usuarios administradores y sus permisos.">
        <Button asChild>
          <Link href="/users/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Usuario
          </Link>
        </Button>
      </PageHeader>
      <DataTable 
        columns={columns} 
        data={usersWithRiderPhone}
        isLoading={isLoading} 
        searchKey="name"
      />
    </div>
  );
}
