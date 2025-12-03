"use client";

import Link from "next/link";
import { notFound, useParams } from 'next/navigation';
import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { type Order, OrderItem, type Business, type Customer } from '@/types';
import { Building, Phone, User, Home, Bike, CheckCircle, CookingPot, Eye, Package, XCircle, Ban } from 'lucide-react';

type OrderStatus = 'pending_acceptance' | 'accepted' | 'cooking' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' | 'failed';

const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente de Aceptación", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    cooking: { label: "Cocinando", variant: "default", icon: CookingPot },
    out_for_delivery: { label: "En Camino", variant: "default", icon: Bike },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
    refunded: { label: "Reembolsado", variant: "destructive", icon: Ban },
    failed: { label: "Fallido", variant: "destructive", icon: XCircle },
}

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col">
            <p className="text-sm text-slate-500">{label}</p>
            {children || <p className="font-medium text-sm">{value || 'No disponible'}</p>}
        </div>
    </div>
);

export default function ViewOrderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const { data: order, isLoading: isLoadingOrder, isError } = api.orders.useGetOne(id);
  const { data: orderItems, isLoading: isLoadingItems } = api.order_items.useGetAll({ order_id: id });
  
  const isLoading = isLoadingOrder || isLoadingItems;

  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title={<Skeleton className="h-8 w-64" />} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
                <div className="lg:col-span-1">
                    <Skeleton className="h-72 w-full" />
                </div>
            </div>
        </div>
    );
  }

  if (isError || !order) {
      notFound();
  }

  const statusInfo = statusConfig[order.status as OrderStatus];
  
  return (
    <div className="space-y-6">
      <PageHeader title={`Pedido #${order.id.split('-')[0].toUpperCase()}`}>
         <Badge variant={statusInfo.variant} className="capitalize text-base py-1 px-3">
            <statusInfo.icon className="mr-2 h-4 w-4" />
            {statusInfo.label}
        </Badge>
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
                            {orderItems?.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product.name}</TableCell>
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
                    <DetailItem icon={Bike} label="Repartidor" value={order.rider?.first_name ? `${order.rider.first_name} ${order.rider.last_name}` : 'Sin asignar'} />
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
