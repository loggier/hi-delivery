"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { notFound, useParams } from 'next/navigation';
import React from 'react';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GHMapStub = ({ lat, lng }: { lat?: number, lng?: number }) => (
    <div className="h-64 w-full bg-slate-200 rounded-md flex items-center justify-center">
        {lat && lng ? (
            <p className="text-slate-500 text-sm">Mapa para ({lat.toFixed(4)}, {lng.toFixed(4)})</p>
        ) : (
            <p className="text-slate-500 text-sm">Ubicación no disponible</p>
        )}
    </div>
);


export default function ViewBusinessPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: business, isLoading: isLoadingBusiness, isError } = api.businesses.useGetOne(id);
  const { data: categories, isLoading: isLoadingCategories } = api.business_categories.useGetAll();
  
  const isLoading = isLoadingBusiness || isLoadingCategories;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Detalle del Negocio" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {Array.from({length: 6}).map((_, i) => (
                           <div key={i} className="space-y-2">
                               <Skeleton className="h-4 w-1/3" />
                               <Skeleton className="h-5 w-2/3" />
                           </div>
                       ))}
                    </div>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    );
  }

  if (isError || !business) {
      notFound();
  }

  const status = business.status;
  const statusText = status === "ACTIVE" ? "Activo" : status === "PENDING_REVIEW" ? "Pendiente" : "Inactivo";
  const category = categories?.find(c => c.id === business.category_id);

  return (
    <div className="space-y-4">
      <PageHeader title={business.name}>
        <Button asChild variant="outline">
            <Link href={`/businesses/${business.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl">{business.name}</CardTitle>
                    <CardDescription>{category?.name || "Categoría no definida"}</CardDescription>
                </div>
                 <Badge variant={status === "ACTIVE" ? "success" : status === "PENDING_REVIEW" ? "warning" : "outline"} className={cn(
                    "capitalize text-base",
                    status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
                    status === "INACTIVE" && "bg-slate-100 text-slate-600",
                    status === "PENDING_REVIEW" && "border-amber-500/20 bg-amber-50 text-amber-700",
                )}>{statusText}</Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Contacto</p>
                    <p>{business.owner_name}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Email</p>
                    <p>{business.email}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">WhatsApp</p>
                    <p>{business.phone_whatsapp}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">RFC</p>
                    <p>{business.tax_id || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Sitio Web</p>
                    <p>{business.website ? <a href={business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{business.website}</a> : 'N/A'}</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Instagram</p>
                    <p>{business.instagram || 'N/A'}</p>
                </div>
                {business.notes && (
                    <div className="space-y-1 md:col-span-2">
                        <p className="text-sm font-medium text-slate-500">Notas</p>
                        <p className="text-sm whitespace-pre-wrap">{business.notes}</p>
                    </div>
                )}
            </div>
            
            <div>
                <h3 className="text-lg font-medium mb-4">Ubicación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">Dirección</p>
                            <p>{business.address_line}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">Colonia</p>
                            <p>{business.neighborhood}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-500">Ciudad, Estado y CP</p>
                            <p>{business.city}, {business.state} {business.zip_code}</p>
                        </div>
                     </div>
                     <GHMapStub lat={business.latitude} lng={business.longitude} />
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
