"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";

export default function ModulesPage() {
  const { data, isLoading } = api.modules.useGetAll();
  
  return (
    <div className="space-y-4">
      <PageHeader title="Módulos" description="Gestiona los módulos del sistema y sus permisos base.">
        <Button asChild>
          <Link href="/modules/new">
            <PlusCircle />
            Nuevo Módulo
          </Link>
        </Button>
      </PageHeader>
       <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        searchKey="name"
      />
    </div>
  );
}
