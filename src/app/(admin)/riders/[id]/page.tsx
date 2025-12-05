
"use client";

import Link from "next/link";
import { Pencil, FileText, CheckCircle, XCircle, Ban, AlertTriangle } from "lucide-react";
import { notFound, useParams } from 'next/navigation';
import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from "next/image";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type Rider, type RiderStatus } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusConfig: Record<RiderStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline", icon: React.ElementType }> = {
    approved: { label: "Aprobado", variant: "success", icon: CheckCircle },
    pending_review: { label: "Pendiente de Revisión", variant: "warning", icon: Pencil },
    rejected: { label: "Rechazado", variant: "destructive", icon: XCircle },
    inactive: { label: "Inactivo", variant: "outline", icon: Ban },
    incomplete: { label: "Incompleto", variant: "warning", icon: Pencil },
}

const DetailItem = ({ label, value }: { label: string, value?: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm">{value || 'N/A'}</p>
    </div>
);

const DocumentLink = ({ label, url, expiryDate }: { label: string, url?: string, expiryDate?: string }) => {
    const daysUntilExpiry = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
    const isSoonToExpire = daysUntilExpiry !== null && daysUntilExpiry <= 30;

    return (
        <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            {url ? (
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" /> Ver documento
                        </a>
                    </Button>
                    {isSoonToExpire && (
                        <Badge variant="warning">Expira pronto ({daysUntilExpiry} días)</Badge>
                    )}
                </div>
            ) : (
                <p className="text-sm text-slate-500">No disponible</p>
            )}
        </div>
    );
};

const ProfileImage = ({ url, name }: { url?: string; name: string }) => (
    <div className={cn(
        "relative flex-shrink-0 border",
        url ? "rounded-md" : "rounded-full"
    )}>
        <Image 
            src={url || `https://placehold.co/80x80/E33739/FFFFFF/png?text=${name.charAt(0)}`}
            alt={`Foto de ${name}`}
            width={80}
            height={80}
            className={cn(
                "object-cover",
                url ? "rounded-md" : "rounded-full"
            )}
        />
    </div>
);

export default function ViewRiderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: rider, isLoading, isError } = api.riders.useGetOne(id);
  const { data: zones } = api.zones.useGetAll();

  const zoneName = zones?.find(z => z.id === rider?.zone_id)?.name;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Detalle del Repartidor" />
            <Skeleton className="h-[600px] w-full" />
        </div>
    );
  }

  if (isError || !rider) {
      notFound();
  }

  const statusInfo = statusConfig[rider.status];
  const fullName = `${rider.first_name} ${rider.last_name}`;

  return (
    <div className="space-y-4">
      <PageHeader title={fullName}>
        {/* We won't have an edit page for now, as the public form is too complex */}
      </PageHeader>

        <Card>
            <CardHeader className="flex-row items-start gap-4 space-y-0">
                <ProfileImage url={rider.avatar1x1_url} name={fullName} />
                <div className="flex-1">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                         <div>
                            <CardTitle className="text-2xl">{fullName} {rider.mother_last_name}</CardTitle>
                            <CardDescription>Repartidor Asociado en {zoneName || 'Zona no asignada'}</CardDescription>
                        </div>
                        <Badge variant={statusInfo.variant} className={cn(
                            "capitalize text-base",
                            rider.status === 'approved' && "border-green-600/20 bg-green-50 text-green-700",
                            rider.status === 'inactive' && "bg-slate-100 text-slate-600",
                            rider.status === 'rejected' && "border-red-600/10 bg-red-50 text-red-700",
                            (rider.status === 'pending_review' || rider.status === 'incomplete') && "border-amber-500/20 bg-amber-50 text-amber-700",
                        )}>
                            <statusInfo.icon className="mr-2 h-4 w-4" />
                            {statusInfo.label}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                
                {/* Personal Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Información Personal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Email" value={rider.email} />
                        <DetailItem label="Teléfono" value={rider.phone_e164} />
                        <DetailItem label="Fecha de Nacimiento" value={rider.birth_date ? format(new Date(rider.birth_date), 'd MMMM, yyyy', { locale: es }) : 'N/A'} />
                        <DetailItem label="Dirección" value={rider.address} />
                    </div>
                </section>

                {/* Documents */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Documentación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                         <DocumentLink label="INE (Frente)" url={rider.ine_front_url} />
                         <DocumentLink label="INE (Dorso)" url={rider.ine_back_url} />
                         <DocumentLink label="Comprobante de Domicilio" url={rider.proof_of_address_url} />
                    </div>
                </section>

                {/* Vehicle & License Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Vehículo y Licencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Tipo de Vehículo" value={rider.vehicle_type} />
                        <DetailItem label="Propiedad" value={rider.ownership} />
                        <DetailItem label="Marca" value={rider.brand} />
                        <DetailItem label="Modelo" value={rider.model} />
                        <DetailItem label="Año" value={rider.year?.toString()} />
                        <DetailItem label="Color" value={rider.color} />
                        <DetailItem label="Placa" value={rider.plate} />
                        <DocumentLink label="Licencia (Frente)" url={rider.license_front_url} expiryDate={rider.license_valid_until} />
                        <DocumentLink label="Licencia (Dorso)" url={rider.license_back_url} />
                        <DocumentLink label="Tarjeta de Circulación (Frente)" url={rider.circulation_card_front_url} />
                        <DocumentLink label="Tarjeta de Circulación (Dorso)" url={rider.circulation_card_back_url} />
                    </div>
                    <h4 className="font-medium mt-6 mb-2">Fotos de la Moto</h4>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {rider.moto_photos && rider.moto_photos.length > 0 ? rider.moto_photos.map((photo, index) => (
                            <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                                <Image src={photo} alt={`Foto de moto ${index + 1}`} width={200} height={112} className="rounded-md aspect-video object-cover hover:opacity-80 transition-opacity" />
                            </a>
                        )) : <p className="text-sm text-slate-500 col-span-full">No se subieron fotos de la moto.</p>}
                    </div>
                </section>
                
                {/* Policy Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Póliza de Seguro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Aseguradora" value={rider.insurer} />
                        <DetailItem label="Número de Póliza" value={rider.policy_number} />
                        <DocumentLink label="Póliza (1ra página)" url={rider.policy_first_page_url} expiryDate={rider.policy_valid_until} />
                    </div>
                </section>

                {/* Extras */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Extras</h3>
                    <div className="flex gap-4">
                        <Badge variant={rider.has_helmet ? 'default' : 'outline'}>Casco</Badge>
                        <Badge variant={rider.has_uniform ? 'default' : 'outline'}>Uniforme</Badge>
                        <Badge variant={rider.has_box ? 'default' : 'outline'}>Caja</Badge>
                    </div>
                </section>

            </CardContent>
      </Card>
    </div>
  );
}
