
"use client";

import { notFound, useParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mail, Phone, Home, MapPin, Package, Bike, Building, Calendar, Hash, CheckCircle } from "lucide-react";
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';

import { api, useCustomerOrders } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { businesses, riders } from '@/mocks/data';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { type Order, type CustomerAddress } from '@/types';

const libraries: ('places')[] = ['places'];

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5" />
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium">{value || 'No disponible'}</p>
        </div>
    </div>
);

const LocationMap = ({ address }: { address: CustomerAddress | null }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const mapCenter = useMemo(() => {
        if (address) {
            return { lat: address.latitude, lng: address.longitude };
        }
        return { lat: 19.4326, lng: -99.1332 }; // Default a Ciudad de México
    }, [address]);

    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-full w-full" />;

    return (
        <GoogleMap
            mapContainerClassName="h-full w-full rounded-md"
            center={mapCenter}
            zoom={address ? 16 : 10}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {address && <MarkerF position={{ lat: address.latitude, lng: address.longitude }} />}
        </GoogleMap>
    );
};


const OrderHistoryTable = ({ customerId }: { customerId: string }) => {
    const { data: orders, isLoading } = useCustomerOrders(customerId);

    const getOrderBusiness = (order: Order) => businesses.find(b => b.id === order.business_id)?.name || 'N/A';
    const getOrderRider = (order: Order) => {
        const rider = riders.find(r => r.id === order.rider_id);
        return rider ? `${rider.first_name} ${rider.last_name}` : 'N/A';
    }

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }
    
    if (!orders || orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
                <p className="text-slate-500">Este cliente aún no tiene pedidos.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Negocio</TableHead>
                    <TableHead>Repartidor</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map(order => (
                    <TableRow key={order.id}>
                        <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                                {order.id.split('-')[0]}...
                            </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(order.created_at), 'd MMM, yyyy', { locale: es })}</TableCell>
                        <TableCell className="font-medium">{getOrderBusiness(order)}</TableCell>
                        <TableCell>{getOrderRider(order)}</TableCell>
                        <TableCell className="text-center">{order.productCount}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


export default function ViewCustomerPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { data: customer, isLoading, isError } = api.customers.useGetOne(id);
  const { data: addresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: id });
  
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  React.useEffect(() => {
    if (addresses && addresses.length > 0) {
        const primaryAddress = addresses.find(addr => addr.is_primary) || addresses[0];
        setSelectedAddress(primaryAddress);
    } else {
        setSelectedAddress(null);
    }
  }, [addresses]);


  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title={<Skeleton className="h-8 w-64" />} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-[480px] w-full" />
                </div>
            </div>
            <Skeleton className="h-72 w-full" />
        </div>
    );
  }

  if (isError || !customer) {
      notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${customer.first_name} ${customer.last_name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Phone} label="Teléfono" value={customer.phone} />
                    <DetailItem icon={Mail} label="Email" value={customer.email} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Direcciones Guardadas</CardTitle>
                     <CardDescription>Selecciona una dirección para verla en el mapa.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingAddresses ? (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : addresses && addresses.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {addresses.map(addr => (
                                <div 
                                    key={addr.id}
                                    onClick={() => setSelectedAddress(addr)}
                                    className={cn(
                                        "p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all",
                                        selectedAddress?.id === addr.id
                                            ? "bg-primary/10 border-primary shadow-sm"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <Home className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        selectedAddress?.id === addr.id ? "text-primary" : "text-slate-400"
                                    )} />
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium leading-tight">{addr.address}</p>
                                        <p className="text-xs text-muted-foreground">{addr.city}, {addr.state}</p>
                                    </div>
                                    {selectedAddress?.id === addr.id && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
                            <p className="text-slate-500 text-sm">No hay direcciones guardadas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="h-[480px]">
                <CardHeader>
                    <CardTitle>Ubicación Seleccionada</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)]">
                   <LocationMap address={selectedAddress} />
                </CardContent>
            </Card>
        </div>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Historial de Pedidos</CardTitle>
                <CardDescription>
                    Un total de {customer.order_count} pedidos con un gasto de {formatCurrency(customer.total_spent)}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <OrderHistoryTable customerId={customer.id} />
            </CardContent>
        </Card>
    </div>
  );
}
