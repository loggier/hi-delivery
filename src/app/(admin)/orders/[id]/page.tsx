

"use client";

import Link from "next/link";
import { notFound, useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoadScript, GoogleMap, MarkerF, DirectionsRenderer } from '@react-google-maps/api';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { type Order, type OrderAssignmentAttempt, OrderStatus } from '@/types';
import { Building, Phone, User, Home, Bike, CheckCircle, CookingPot, Eye, Package, XCircle, MoreVertical, MessageSquare, BellRing, GaugeCircle, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useQueryClient } from "@tanstack/react-query";

const libraries: ('places' | 'directions')[] = ['places', 'directions'];

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

const assignmentOutcomeConfig: Record<OrderAssignmentAttempt["outcome"], { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline" }> = {
    notified: { label: "Notificado", variant: "outline" },
    accepted: { label: "Aceptó", variant: "success" },
    rejected: { label: "Rechazó", variant: "destructive" },
    expired: { label: "Expiró", variant: "warning" },
    superseded: { label: "Reemplazado", variant: "default" },
};

function DispatchSummaryCard({ order }: { order: Order }) {
    const notifiedCount = order.notified_riders?.length ?? 0;
    const activeWaveCount = order.active_notified_riders?.length ?? 0;
    const rejectedCount = order.rejected_riders?.length ?? 0;
    const attempts = [...(order.order_assignment_attempts ?? [])].sort(
        (a, b) => new Date(b.notified_at).getTime() - new Date(a.notified_at).getTime()
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Trazabilidad de Asignación</CardTitle>
                <CardDescription>
                    Estado actual del dispatch y registro de notificaciones enviadas a repartidores.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                            <span>Notificados</span>
                            <BellRing className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-2xl font-semibold">{notifiedCount}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                            <span>Ola activa</span>
                            <Users className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-2xl font-semibold">{activeWaveCount}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                            <span>Rechazos</span>
                            <XCircle className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-2xl font-semibold">{rejectedCount}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                            <span>Intentos</span>
                            <GaugeCircle className="h-3.5 w-3.5" />
                        </div>
                        <p className="mt-1 text-2xl font-semibold">{order.dispatch_attempt_count ?? attempts.length}</p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border px-3 py-2 text-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Ventana actual</p>
                        <p className="mt-1 font-medium">
                            {order.notification_expires_at
                                ? format(new Date(order.notification_expires_at), "d MMM, yyyy, h:mm a", { locale: es })
                                : "Sin ventana activa"}
                        </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-sm">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Estado del dispatch</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {order.assignment_exhausted_at ? (
                                <Badge variant="warning">Sin más candidatos</Badge>
                            ) : null}
                            {activeWaveCount > 0 ? (
                                <Badge variant="default">Esperando respuesta</Badge>
                            ) : null}
                            {order.rider_id ? (
                                <Badge variant="success">Rider asignado</Badge>
                            ) : null}
                            {!order.rider_id && !order.assignment_exhausted_at && activeWaveCount === 0 ? (
                                <Badge variant="outline">Sin ola activa</Badge>
                            ) : null}
                        </div>
                    </div>
                </div>

                {attempts.length > 0 ? (
                    <div className="space-y-3">
                        {attempts.map((attempt) => {
                            const outcome = assignmentOutcomeConfig[attempt.outcome] ?? assignmentOutcomeConfig.notified;
                            const riderName = attempt.rider
                                ? `${attempt.rider.first_name} ${attempt.rider.last_name}`.trim()
                                : attempt.rider_id;

                            return (
                                <div key={attempt.id} className="rounded-lg border px-3 py-3">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{riderName}</p>
                                            <p className="text-xs text-slate-500">
                                                Intento #{attempt.dispatch_attempt_no} · {attempt.algorithm === 'batch' ? 'Lote' : 'Secuencial'}
                                            </p>
                                        </div>
                                        <Badge variant={outcome.variant}>{outcome.label}</Badge>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                                        <div>
                                            <span className="font-medium text-slate-700">Notificado:</span>{" "}
                                            {format(new Date(attempt.notified_at), "d MMM, h:mm a", { locale: es })}
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700">Respondió:</span>{" "}
                                            {attempt.responded_at
                                                ? format(new Date(attempt.responded_at), "d MMM, h:mm a", { locale: es })
                                                : "Sin respuesta"}
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700">Expira:</span>{" "}
                                            {attempt.expires_at
                                                ? format(new Date(attempt.expires_at), "d MMM, h:mm a", { locale: es })
                                                : "N/A"}
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-700">Score:</span>{" "}
                                            {attempt.score ?? "N/A"}
                                            {attempt.distance_km != null ? ` · ${attempt.distance_km.toFixed(2)} km` : ""}
                                        </div>
                                    </div>
                                    {attempt.notes ? (
                                        <p className="mt-2 text-xs text-slate-500">{attempt.notes}</p>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-slate-500">
                        Todavía no hay registros en <code>order_assignment_attempts</code> para esta orden. Si ya corriste el SQL nuevo, esto se llenará cuando el dispatch registre cada notificación, rechazo, expiración o aceptación.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const LocationMap = ({ order }: { order: Order | undefined }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);

    const businessLocation = order?.pickup_address?.coordinates;
    const customerLocation = order?.delivery_address?.coordinates;

    const mapCenter = useMemo(() => {
        if (businessLocation) return businessLocation;
        if (customerLocation) return customerLocation;
        return { lat: 19.4326, lng: -99.1332 };
    }, [businessLocation, customerLocation]);
    
    React.useEffect(() => {
        // Si la ruta ya está guardada en la orden, la usamos directamente.
        if (order?.route_path) {
            setDirections(order.route_path);
            return;
        }

        // Si no, la calculamos (fallback para órdenes antiguas)
        if (isLoaded && businessLocation && customerLocation) {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: businessLocation,
                    destination: customerLocation,
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        setDirections(result);
                    } else {
                        console.error(`Error fetching directions ${result}`);
                    }
                }
            );
        }
    }, [isLoaded, businessLocation, customerLocation, order?.route_path]);


    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-full w-full rounded-md" />;

    return (
        <GoogleMap
            mapContainerClassName="h-full w-full rounded-md"
            center={mapCenter}
            zoom={12}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {directions ? (
                <DirectionsRenderer directions={directions} options={{
                    suppressMarkers: false,
                    polylineOptions: { strokeColor: 'hsl(var(--hid-primary))', strokeWeight: 4 }
                }}/>
            ) : (
                <>
                     {businessLocation && (
                        <MarkerF position={businessLocation} label={{ text: "N", color: 'white' }} title="Negocio"/>
                    )}
                    {customerLocation && (
                        <MarkerF position={customerLocation} label={{ text: "C", color: 'white' }} title="Cliente"/>
                    )}
                </>
            )}
        </GoogleMap>
    )
}

export default function ViewOrderPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();
  
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
        updateStatusMutation.mutate({ id: order.id, status: newStatus }, {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            }
        });
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
  const displayId = `ORD-${order.id.substring(4, 12).toUpperCase()}`;
  
  return (
    <div className="space-y-6">
      <ConfirmationDialog />
      <PageHeader title={`Pedido #${displayId}`}>
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
                                      <div className="font-medium">{item.products?.name || 'Producto no encontrado'}</div>
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
             <DispatchSummaryCard order={order} />
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
                            {order.business?.name || 'No disponible'}
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
