"use client";

import { notFound, useParams } from 'next/navigation';
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mail, Phone, Home, MapPin, Package, Bike, Building, Calendar, Hash } from "lucide-react";

import { api, useCustomerOrders } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { businesses, riders } from '@/mocks/data';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { type Order } from '@/types';


const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5" />
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium">{value || 'No disponible'}</p>
        </div>
    </div>
);

const OrderHistoryTable = ({ customerId }: { customerId: string }) => {
    const { data: orders, isLoading } = useCustomerOrders(customerId);

    const getOrderBusiness = (order: Order) => businesses.find(b => b.id === order.businessId)?.name || 'N/A';
    const getOrderRider = (order: Order) => {
        const rider = riders.find(r => r.id === order.riderId);
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

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title={<Skeleton className="h-8 w-64" />} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (isError || !customer) {
      notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`${customer.first_name} ${customer.last_name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <CardTitle>Direcciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Home} label="Dirección Principal" value={customer.main_address} />
                    {customer.additional_address_1 && <DetailItem icon={MapPin} label="Dirección Adicional 1" value={customer.additional_address_1} />}
                    {customer.additional_address_2 && <DetailItem icon={MapPin} label="Dirección Adicional 2" value={customer.additional_address_2} />}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
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
      </div>
    </div>
  );
}
