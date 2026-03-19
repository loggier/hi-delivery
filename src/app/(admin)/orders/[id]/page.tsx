

"use client";

import Link from "next/link";
import { notFound, useParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';
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
import { type Order, type OrderAssignmentAttempt, OrderStatus, type Rider } from '@/types';
import { Building, Phone, User, Home, Bike, CheckCircle, CookingPot, Eye, Package, XCircle, MoreVertical, MessageSquare, BellRing, GaugeCircle, Users, RefreshCw, UserPlus, Clock3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const libraries: ('places' | 'directions')[] = ['places', 'directions'];
const activeDeliveryStatuses: OrderStatus[] = [
    'accepted',
    'cooking',
    'out_for_delivery',
    'pending_acceptance',
];
const manuallyAssignableStatuses: OrderStatus[] = [
    'pending_acceptance',
    'accepted',
    'cooking',
    'out_for_delivery',
];

type AvailableRider = Pick<Rider, "id" | "first_name" | "last_name" | "phone_e164" | "zone_id" | "is_active_for_orders" | "last_location_update"> & {
    activeOrderCount: number;
};

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
  const { toast } = useToast();
  const supabase = createClient();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [reDispatching, setReDispatching] = useState(false);
  const [assigningRiderId, setAssigningRiderId] = useState<string | null>(null);
  
  const { data: order, isLoading, isError } = api.orders.useGetOne(id);
  const updateStatusMutation = api.orders.useUpdate();
  const [ConfirmationDialog, confirm] = useConfirm();

  const availableRidersQuery = useQuery<AvailableRider[]>({
    queryKey: ['orders', 'available-riders', order?.id],
    enabled: isAssignDialogOpen,
    queryFn: async () => {
      const { data: riders, error: riderError } = await supabase
        .from('riders')
        .select('id, first_name, last_name, phone_e164, zone_id, is_active_for_orders, last_location_update')
        .eq('status', 'ACTIVE')
        .eq('is_active_for_orders', true);
      if (riderError) {
        throw riderError;
      }

      const riderRows = (riders ?? []) as AvailableRider[];
      if (riderRows.length === 0) {
        return [];
      }

      const riderIds = riderRows.map((rider) => rider.id);
      const { data: activeOrders, error: activeOrdersError } = await supabase
        .from('orders')
        .select('id, rider_id, status')
        .in('rider_id', riderIds)
        .in('status', activeDeliveryStatuses);
      if (activeOrdersError) {
        throw activeOrdersError;
      }

      const loadByRider = new Map<string, number>();
      for (const activeOrder of activeOrders ?? []) {
        const riderId = activeOrder.rider_id as string | null;
        if (!riderId) continue;
        loadByRider.set(riderId, (loadByRider.get(riderId) ?? 0) + 1);
      }

      return riderRows
        .map((rider) => ({
          ...rider,
          activeOrderCount: loadByRider.get(rider.id) ?? 0,
        }))
        .filter((rider) => rider.activeOrderCount < 2)
        .sort((a, b) => a.activeOrderCount - b.activeOrderCount);
    },
  });

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

  const tryDispatchOrderRpc = async (orderId: string) => {
    const attempts = [
      { order_id_in: orderId },
      { p_order_id: orderId },
      { order_id: orderId },
    ];

    let lastError: unknown = null;
    for (const params of attempts) {
      const { error } = await supabase.rpc('dispatch_order', params);
      if (!error) {
        return;
      }
      lastError = error;
    }
    throw lastError instanceof Error ? lastError : new Error('No se pudo ejecutar dispatch_order.');
  };

  const handleRedispatch = async () => {
    if (!order) return;
    const ok = await confirm({
      title: '¿Reenviar notificación?',
      description: 'Se intentará lanzar otra vez el dispatch de esta orden a riders disponibles.',
      confirmText: 'Reenviar',
    });
    if (!ok) return;

    setReDispatching(true);
    try {
      await tryDispatchOrderRpc(order.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', order.id] }),
      ]);
      toast({
        title: 'Dispatch reenviado',
        description: 'La orden volvió a entrar al flujo de notificación.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'No se pudo reenviar',
        description: error instanceof Error ? error.message : 'Fallo al ejecutar el dispatch manual.',
        variant: 'destructive',
      });
    } finally {
      setReDispatching(false);
    }
  };

  const handleManualAssign = async (rider: AvailableRider) => {
    if (!order) return;
    const ok = await confirm({
      title: '¿Asignar rider manualmente?',
      description: `La orden se asignará directamente a ${rider.first_name} ${rider.last_name}.`,
      confirmText: 'Asignar',
    });
    if (!ok) return;

    setAssigningRiderId(rider.id);
    try {
      const nowIso = new Date().toISOString();
      const payload: Record<string, unknown> = {
        rider_id: rider.id,
        status: 'accepted',
        accepted_at: nowIso,
        active_notified_riders: [],
        notification_expires_at: null,
        assignment_exhausted_at: null,
        updated_at: nowIso,
      };
      try {
        const { error } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', order.id);
        if (error) {
          throw error;
        }
      } catch {
        delete payload.accepted_at;
        const { error } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', order.id);
        if (error) {
          throw error;
        }
      }

      try {
        const { error } = await supabase.from('order_events').insert({
          order_id: order.id,
          rider_id: rider.id,
          event_type: 'driver_assigned',
          notes: 'Asignación manual desde el panel de administración.',
        });
        if (error) {
          throw error;
        }
      } catch {
        // Best effort only.
      }

      setIsAssignDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', order.id] }),
        queryClient.invalidateQueries({ queryKey: ['orders', 'available-riders', order.id] }),
      ]);
      toast({
        title: 'Rider asignado',
        description: `${rider.first_name} ${rider.last_name} quedó asignado a la orden.`,
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'No se pudo asignar',
        description: error instanceof Error ? error.message : 'Error al asignar manualmente.',
        variant: 'destructive',
      });
    } finally {
      setAssigningRiderId(null);
    }
  };

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
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar rider manualmente</DialogTitle>
            <DialogDescription>
              Se muestran riders activos para órdenes. La carga actual se calcula con pedidos en curso.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {availableRidersQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : availableRidersQuery.data?.length ? (
              availableRidersQuery.data.map((rider) => (
                <div key={rider.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {rider.first_name} {rider.last_name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {rider.phone_e164 || 'Sin teléfono'}{rider.zone_id ? ` · Zona ${rider.zone_id}` : ''}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="success">Activo para órdenes</Badge>
                      <Badge variant={rider.activeOrderCount === 0 ? "outline" : "default"}>
                        {rider.activeOrderCount} pedido{rider.activeOrderCount === 1 ? '' : 's'} activo{rider.activeOrderCount === 1 ? '' : 's'}
                      </Badge>
                      {rider.last_location_update ? (
                        <Badge variant="outline">
                          <Clock3 className="mr-1 h-3 w-3" />
                          {format(new Date(rider.last_location_update), "d MMM, h:mm a", { locale: es })}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleManualAssign(rider)}
                    disabled={assigningRiderId === rider.id}
                  >
                    {assigningRiderId === rider.id ? 'Asignando...' : 'Asignar'}
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500">
                No hay riders activos y disponibles en este momento.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PageHeader title={`Pedido #${displayId}`}>
         <div className="flex items-center gap-2">
            {!order.rider_id && manuallyAssignableStatuses.includes(order.status as OrderStatus) ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleRedispatch}
                  disabled={reDispatching}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {reDispatching ? 'Reenviando...' : 'Reenviar notificación'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Asignar rider
                </Button>
              </>
            ) : null}
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
                    {!order.rider_id && manuallyAssignableStatuses.includes(order.status as OrderStatus) ? (
                      <div className="rounded-lg border border-dashed px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRedispatch}
                            disabled={reDispatching}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {reDispatching ? 'Reenviando...' : 'Reenviar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsAssignDialogOpen(true)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Asignar manual
                          </Button>
                        </div>
                      </div>
                    ) : null}
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
