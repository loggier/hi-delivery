"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { columns } from "./columns";
import { type Table } from "@tanstack/react-table";
import { Plan } from "@/types";

export default function PlansPage() {
  const { data: plans, isLoading } = api.plans.useGetAll();
  
  return (
    <div className="space-y-4">
      <PageHeader title="Planes" description="Gestiona los planes de suscripción para los negocios.">
        <Button asChild>
          <Link href="/plans/new">
            <PlusCircle />
            Nuevo Plan
          </Link>
        </Button>
      </PageHeader>
       <DataTable
        columns={columns}
        data={plans || []}
        isLoading={isLoading}
        toolbar={(table: Table<Plan>) => <DataTable.Toolbar table={table} searchKey="name" />}
      />
    </div>
  );
}
