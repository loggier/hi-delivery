"use client";

import Link from "next/link";
import { Pencil, FileText, CheckCircle, XCircle, Ban, AlertTriangle } from "lucide-react";
import { notFound, useParams } from 'next/navigation';
import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type RiderStatus } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const statusConfig: Record<RiderStatus, { label: string; variant: "success" | "warning" | "destructive" | "outline", icon: React.ElementType }> = {
    approved: { label: "Aprobado", variant: "success", icon: CheckCircle },
    pending_review: { label: "Pendiente de Revisión", variant: "warning", icon: Pencil },
    rejected: { label: "Rechazado", variant: "destructive", icon: XCircle },
    inactive: { label: "Inactivo", variant: "outline", icon: Ban },
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

export default function ViewRiderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: rider, isLoading, isError } = api.riders.useGetOne(id);

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

  return (
    <div className="space-y-4">
      <PageHeader title={`${rider.firstName} ${rider.lastName}`}>
        {/* We won't have an edit page for now, as the public form is too complex */}
        {/* <Button asChild variant="outline">
            <Link href={`/riders/${rider.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
            </Link>
        </Button> */}
      </PageHeader>

        <Card>
            <CardHeader>
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <CardTitle className="text-2xl">{rider.firstName} ${rider.lastName} {rider.motherLastName}</CardTitle>
                        <CardDescription>Repartidor Asociado en {rider.zone}</CardDescription>
                    </div>
                    <Badge variant={statusInfo.variant} className={cn(
                        "capitalize text-base",
                        rider.status === 'approved' && "border-green-600/20 bg-green-50 text-green-700",
                        rider.status === 'inactive' && "bg-slate-100 text-slate-600",
                        rider.status === 'rejected' && "border-red-600/10 bg-red-50 text-red-700",
                        rider.status === 'pending_review' && "border-amber-500/20 bg-amber-50 text-amber-700",
                    )}>
                        <statusInfo.icon className="mr-2 h-4 w-4" />
                        {statusInfo.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                
                {/* Personal Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Información Personal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Email" value={rider.email} />
                        <DetailItem label="Teléfono" value={rider.phoneE164} />
                        <DetailItem label="Fecha de Nacimiento" value={format(new Date(rider.birthDate), 'd MMMM, yyyy', { locale: es })} />
                        <DetailItem label="Dirección" value={rider.address} />
                    </div>
                </section>

                {/* Documents */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Documentación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                         <DocumentLink label="Foto de Perfil" url={rider.avatar1x1Url} />
                         <DocumentLink label="INE (Frente)" url={rider.ineFrontUrl} />
                         <DocumentLink label="INE (Dorso)" url={rider.ineBackUrl} />
                         <DocumentLink label="Comprobante de Domicilio" url={rider.proofOfAddressUrl} />
                    </div>
                </section>

                {/* Vehicle & License Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Vehículo y Licencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Tipo de Vehículo" value={rider.vehicleType} />
                        <DetailItem label="Propiedad" value={rider.ownership} />
                        <DetailItem label="Marca" value={rider.brand} />
                        <DetailItem label="Modelo" value={rider.model} />
                        <DetailItem label="Año" value={rider.year} />
                        <DetailItem label="Color" value={rider.color} />
                        <DetailItem label="Placa" value={rider.plate} />
                        <DocumentLink label="Licencia (Frente)" url={rider.licenseFrontUrl} expiryDate={rider.licenseValidUntil} />
                        <DocumentLink label="Licencia (Dorso)" url={rider.licenseBackUrl} />
                        <DocumentLink label="Tarjeta de Circulación (Frente)" url={rider.circulationCardFrontUrl} />
                        <DocumentLink label="Tarjeta de Circulación (Dorso)" url={rider.circulationCardBackUrl} />
                    </div>
                    <h4 className="font-medium mt-6 mb-2">Fotos de la Moto</h4>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {rider.motoPhotos.map((photo, index) => (
                            <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                                <img src={photo} alt={`Foto de moto ${index + 1}`} className="rounded-md aspect-video object-cover hover:opacity-80 transition-opacity" />
                            </a>
                        ))}
                    </div>
                </section>
                
                {/* Policy Info */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Póliza de Seguro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
                        <DetailItem label="Aseguradora" value={rider.insurer} />
                        <DetailItem label="Número de Póliza" value={rider.policyNumber} />
                        <DocumentLink label="Póliza (1ra página)" url={rider.policyFirstPageUrl} expiryDate={rider.policyValidUntil} />
                    </div>
                </section>

                {/* Extras */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Extras</h3>
                    <div className="flex gap-4">
                        <Badge variant={rider.hasHelmet ? 'default' : 'outline'}>Casco</Badge>
                        <Badge variant={rider.hasUniform ? 'default' : 'outline'}>Uniforme</Badge>
                        <Badge variant={rider.hasBox ? 'default' : 'outline'}>Caja</Badge>
                    </div>
                </section>

            </CardContent>
      </Card>
    </div>
  );
}
