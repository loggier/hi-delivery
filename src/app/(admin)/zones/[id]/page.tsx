"use client";

import Link from "next/link";
import { Pencil, Users, Building2 } from "lucide-react";
import { notFound, useParams } from 'next/navigation';
import React from 'react';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GeofenceMapStub = () => (
    <div className="h-96 w-full bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center border border-dashed">
        <p className="text-slate-500 text-sm">Visualización del mapa de Geocerca</p>
    </div>
);


export default function ViewZonePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: zone, isLoading, isError } = api.zones.useGetOne(id);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Detalle de la Zona" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {Array.from({length: 3}).map((_, i) => (
                           <div key={i} className="space-y-2">
                               <Skeleton className="h-4 w-1/3" />
                               <Skeleton className="h-5 w-2/3" />
                           </div>
                       ))}
                    </div>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (isError || !zone) {
      notFound();
  }

  const status = zone.status;
  const statusText = status === "ACTIVE" ? "Activo" : "Inactivo";

  return (
    <div className="space-y-4">
      <PageHeader title={zone.name}>
        <Button asChild variant="outline">
            <Link href={`/zones/${zone.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl">{zone.name}</CardTitle>
                    <CardDescription>ID: {zone.id}</CardDescription>
                </div>
                 <Badge variant={status === "ACTIVE" ? "success" : "outline"} className={cn(
                    "capitalize text-base",
                    status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
                    status === "INACTIVE" && "bg-slate-100 text-slate-600",
                )}>{statusText}</Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-8">
                <div className="flex items-center gap-4 rounded-lg border p-4">
                    <Building2 className="h-8 w-8 text-primary" />
                    <div>
                        <p className="text-sm font-medium text-slate-500">Negocios</p>
                        <p className="text-2xl font-bold">{zone.businessCount}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 rounded-lg border p-4">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                        <p className="text-sm font-medium text-slate-500">Repartidores</p>
                        <p className="text-2xl font-bold">{zone.riderCount}</p>
                    </div>
                </div>
            </div>
            
            <div>
                <h3 className="text-lg font-medium mb-4">Geocerca de la Zona</h3>
                <GeofenceMapStub />
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
