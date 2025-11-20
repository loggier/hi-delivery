"use client";

import Link from "next/link";
import { Pencil, FileText, CheckCircle, XCircle, Building, Map, ShoppingBag } from "lucide-react";
import { notFound, useParams } from 'next/navigation';
import React from 'react';
import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api';


import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { SubscriptionManager } from "./subscription-manager";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { BusinessType } from "@/types";

const libraries: ('places')[] = ['places'];

const BusinessLocationMap = ({ lat, lng }: { lat?: number, lng?: number }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const center = React.useMemo(() => {
        if (lat && lng) return { lat, lng };
        return { lat: 19.4326, lng: -99.1332 }; // Default a Ciudad de México
    }, [lat, lng]);

    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-64 w-full" />;

    return (
        <GoogleMap
            mapContainerClassName="h-64 w-full rounded-md"
            center={center}
            zoom={15}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {lat && lng && <Marker position={{ lat, lng }} />}
        </GoogleMap>
    );
};

const DetailItem = ({ label, value, children, icon: Icon }: { label: string, value?: string | number, children?: React.ReactNode, icon?: React.ElementType }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {label}
        </p>
        {children ? <div className="text-sm">{children}</div> : <p className="text-sm">{value || 'N/A'}</p>}
    </div>
);

const DocumentLink = ({ label, url }: { label: string, url?: string }) => (
    <DetailItem label={label}>
        {url ? (
            <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> Ver documento
                </a>
            </Button>
        ) : (
            <p className="text-sm text-slate-500">No disponible</p>
        )}
    </DetailItem>
);


export default function ViewBusinessPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: business, isLoading: isLoadingBusiness, isError } = api.businesses.useGetOne(id);
  const { data: categories, isLoading: isLoadingCategories } = api.business_categories.useGetAll();
  const { data: zones, isLoading: isLoadingZones } = api.zones.useGetAll();
  
  const isLoading = isLoadingBusiness || isLoadingCategories || isLoadingZones;

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
                       {Array.from({length: 9}).map((_, i) => (
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
  const zone = zones?.find(z => z.id === business.zone_id);

  const typeTranslations: Record<BusinessType, string> = {
    restaurant: "Restaurante",
    store: "Tienda",
    service: "Servicio",
  };

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

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-6">
        <Card>
            <CardHeader className="flex-row items-start gap-4 space-y-0">
                <Image 
                    src={business.logo_url || 'https://placehold.co/80x80/E33739/FFFFFF/png?text=HID'}
                    alt={`Logo de ${business.name}`}
                    width={80}
                    height={80}
                    className="rounded-md border"
                />
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{business.name}</CardTitle>
                            <CardDescription>ID: {business.id}</CardDescription>
                        </div>
                        <Badge variant={status === "ACTIVE" ? "success" : status === "PENDING_REVIEW" ? "warning" : "outline"} className={cn(
                            "capitalize text-base",
                            status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
                            status === "INACTIVE" && "bg-slate-100 text-slate-600",
                            status === "PENDING_REVIEW" && "border-amber-500/20 bg-amber-50 text-amber-700",
                        )}>{statusText}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Información General y Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                        <DetailItem label="Tipo de Negocio" value={typeTranslations[business.type]} icon={Building}/>
                        <DetailItem label="Categoría" value={category?.name} icon={ShoppingBag} />
                        <DetailItem label="Zona de Operación" value={zone?.name} icon={Map} />
                        <Separator className="md:col-span-2 lg:col-span-3"/>
                        <DetailItem label="Contacto" value={business.owner_name} />
                        <DetailItem label="Email" value={business.email} />
                        <DetailItem label="WhatsApp" value={business.phone_whatsapp} />
                        <DetailItem label="RFC" value={business.tax_id} />
                        <DetailItem label="Sitio Web">
                            {business.website ? <a href={business.website} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">{business.website}</a> : 'N/A'}
                        </DetailItem>
                        <DetailItem label="Instagram" value={business.instagram} />
                        {business.notes && (
                            <div className="space-y-1 md:col-span-2 lg:col-span-3">
                                <p className="text-sm font-medium text-slate-500">Notas</p>
                                <p className="text-sm whitespace-pre-wrap">{business.notes}</p>
                            </div>
                        )}
                    </div>
                </section>
                <Separator />
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Ubicación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <DetailItem label="Dirección" value={business.address_line} />
                            <DetailItem label="Colonia" value={business.neighborhood} />
                            <DetailItem label="Ciudad, Estado y CP" value={`${business.city}, ${business.state} ${business.zip_code}`} />
                        </div>
                        <BusinessLocationMap lat={business.latitude} lng={business.longitude} />
                    </div>
                </section>
                 <Separator />
                <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Detalles Operativos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                        <DetailItem label="Tiempo de entrega" value={`${business.delivery_time_min || '?'} - ${business.delivery_time_max || '?'} min.`} />
                        <DetailItem label="Ticket promedio (MXN)" value={business.average_ticket ? formatCurrency(business.average_ticket) : 'N/A'} />
                        <DetailItem label="Demanda semanal" value={business.weekly_demand} />
                        <DetailItem label="Servicio a domicilio propio">
                           {typeof business.has_delivery_service === 'boolean' ? (
                                business.has_delivery_service ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
                           ) : 'N/A'}
                        </DetailItem>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <DocumentLink label="Foto de Fachada" url={business.business_photo_facade_url} />
                       <DocumentLink label="Foto de Interior" url={business.business_photo_interior_url} />
                       <DocumentLink label="Menú Digital" url={business.digital_menu_url} />
                    </div>
                </section>
                <Separator />
                 <section>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Documentos del Propietario</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                        <DocumentLink label="INE (Frente)" url={business.owner_ine_front_url} />
                        <DocumentLink label="INE (Reverso)" url={business.owner_ine_back_url} />
                        <DocumentLink label="Constancia Fiscal" url={business.tax_situation_proof_url} />
                    </div>
                </section>

            </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <SubscriptionManager business={business} />
      </div>
    </div>
    </div>
  );
}
