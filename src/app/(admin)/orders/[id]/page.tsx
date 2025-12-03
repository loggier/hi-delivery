
"use client";

import Link from "next/link";
import { notFound, useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoadScript, GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { type Order, OrderItem, type Business, type Customer, OrderStatus } from '@/types';
import { Building, Phone, User, Home, Bike, CheckCircle, CookingPot, Eye, Package, XCircle, Ban, MoreVertical, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";

const libraries: ('places')[] = ['places'];

const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    cooking: { label: "En preparación", variant: "default", icon: CookingPot },
    out_for_delivery: { label: "En Camino", variant: "default", icon: Bike },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
};

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col">
            <p className="text-sm text-slate-500">{label}</p>
            {children || <p className="font-medium text-sm">{value || 'No disponible'}</p>}
        </div>
    </div>
);

const LocationMap = ({ order }: { order: Order | undefined }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const businessLocation = order?.pickup_address?.coordinates;
    const customerLocation = order?.delivery_address?.coordinates;

    const mapCenter = useMemo(() => {
        if (businessLocation) return businessLocation;
        if (customerLocation) return customerLocation;
        return { lat: 19.4326, lng: -99.1332 };
    }, [businessLocation, customerLocation]);
    
    const mapBounds = useMemo(() => {
        if (!isLoaded || !businessLocation || !customerLocation || typeof window === 'undefined') return undefined;
        
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(businessLocation);
        bounds.extend(customerLocation);
        return bounds;
    }, [businessLocation, customerLocation, isLoaded]);

    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-full w-full rounded-md" />;

    return (
        <GoogleMap
            mapContainerClassName="h-full w-full rounded-md"
            center={mapCenter}
             onLoad={map => {
                if (mapBounds) map.fitBounds(mapBounds, 50);
            }}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {businessLocation && (
                <MarkerF position={businessLocation} label={{ text: "N", color: 'white' }} title="Negocio"/>
            )}
            {customerLocation && (
                <MarkerF position={customerLocation} label={{ text: "C", color: 'white' }} title="Cliente"/>
            )}
             {businessLocation && customerLocation && (
                <PolylineF
                    path={[businessLocation, customerLocation]}
                    options={{ strokeColor: 'hsl(var(--hid-primary))', strokeWeight: 3 }}
                />
            )}
        </GoogleMap>
    )
}

export default function ViewOrderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { data: order, isLoading, isError } = api.orders.useGetOne(id);
  const updateStatusMutation = api.orders.useUpdate();
  const [ConfirmationDialog, confirm] = useConfirm();

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    const ok = await confirm({
      title: `¿Confirmar cambio de estado?`,
      description: `El pedido se marcará como "${statusConfig[newStatus].label}".`,
      confirmText: "Confirmar"
    });

    if (ok) {
        updateStatusMutation.mutate({ id: order.id, status: newStatus });
    }
  }

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title={<Skeleton className="h-8 w-64" />} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-72 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (isError || !order) {
      notFound();
  }

  const statusInfo = statusConfig[order.status as OrderStatus] || { label: "Desconocido", variant: "outline", icon: Eye };
  
  return (
    <div className="space-y-6">
      <ConfirmationDialog />
      <PageHeader title={`Pedido #${order.id.split('-')[0].toUpperCase()}`}>
         <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} className="capitalize text-base py-1 px-3">
                <statusInfo.icon className="mr-2 h-4 w-4" />
                {statusInfo.label}
            </Badge>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(statusConfig).map(([key, config]) => (
                        <DropdownMenuItem 
                            key={key} 
                            onClick={() => handleStatusChange(key as OrderStatus)}
                            disabled={order.status === key}
                            className="capitalize"
                        >
                            <config.icon className="mr-2 h-4 w-4"/> {config.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
         </div>
      </PageHeader>
      
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Resumen de Artículos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Cantidad</TableHead>
                                <TableHead className="text-right">Precio Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.order_items?.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="font-medium">{item.products.name}</div>
                                      {item.item_description && (
                                        <div className="text-xs text-muted-foreground italic flex items-center gap-1 mt-1">
                                          <MessageSquare className="h-3 w-3" />
                                          {item.item_description}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.price * item.quantity)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
             {order.items_description && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nota General del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 italic">"{order.items_description}"</p>
                    </CardContent>
                </Card>
             )}
             <Card>
                <CardHeader>
                    <CardTitle>Mapa de la Ruta</CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                   <LocationMap order={order} />
                </CardContent>
             </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Detalles del Pedido</CardTitle>
                    <CardDescription>{format(new Date(order.created_at), "d 'de' MMMM, yyyy, h:mm a", {locale: es})}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Building} label="Negocio">
                        <Link href={`/businesses/${order.business_id}`} className="font-medium text-sm text-primary hover:underline">
                            {order.business.name}
                        </Link>
                    </DetailItem>
                    <DetailItem icon={User} label="Cliente">
                         <Link href={`/customers/${order.customer_id}`} className="font-medium text-sm text-primary hover:underline">
                            {order.customer_name}
                        </Link>
                    </DetailItem>
                    <DetailItem icon={Phone} label="Teléfono Cliente" value={order.customer_phone} />
                    <DetailItem icon={Home} label="Dirección de Entrega" value={order.delivery_address.text} />
                    <DetailItem icon={Bike} label="Repartidor">
                       {order.rider_id ? (
                           <Link href={`/riders/${order.rider_id}`} className="font-medium text-sm text-primary hover:underline">
                                {order.rider?.first_name} {order.rider?.last_name}
                           </Link>
                        ) : 'Sin asignar'}
                    </DetailItem>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Costos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span>Costo de envío</span>
                        <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                        <span>Total</span>
                        <span>{formatCurrency(order.order_total)}</span>
                    </div>
                </CardContent>
             </Card>
        </div>
       </div>

    </div>
  );
}
