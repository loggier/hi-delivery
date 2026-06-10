

"use client";

import Link from "next/link";
import Image from "next/image";
import { notFound, useParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoadScript, GoogleMap, MarkerF, Polyline } from '@react-google-maps/api';

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { type Order, type OrderAssignmentAttempt, OrderStatus, type Rider } from '@/types';
import { Building, Phone, User, Home, Bike, CheckCircle, CookingPot, Eye, Package, XCircle, MoreVertical, MessageSquare, BellRing, GaugeCircle, Users, RefreshCw, UserPlus, Clock3, ReceiptText, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const libraries: ('places')[] = ['places'];
const OSRM_ROUTE_URL = process.env.NEXT_PUBLIC_OSRM_ROUTE_URL || 'https://nominatim.vemontech.com/route/v1/driving';
const activeDeliveryStatuses: OrderStatus[] = [
    'pending_acceptance',
    'accepted',
    'at_store',
    'cooking',
    'ready_for_pickup',
    'picked_up',
    'out_for_delivery',
    'on_the_way',
    'arrived_at_destination',
];
const manuallyAssignableStatuses: OrderStatus[] = [
    'pending_acceptance',
    'accepted',
    'at_store',
    'cooking',
    'ready_for_pickup',
    'picked_up',
    'out_for_delivery',
    'on_the_way',
    'arrived_at_destination',
];

type AvailableRider = Pick<Rider, "id" | "first_name" | "last_name" | "phone_e164" | "zone_id" | "is_active_for_orders" | "last_location_update"> & {
    activeOrderCount: number;
    last_latitude?: number;
    last_longitude?: number;
    zoneName?: string;
    areaName?: string;
    rejectedThisOrder?: boolean;
};

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPointInsidePolygon(
  point: { lat: number; lng: number },
  polygon?: { lat: number; lng: number }[],
) {
  if (!polygon || polygon.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function decodePolyline(encoded: string) {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

async function triggerOrderPushEvent(
  orderId: string,
  type: 'dispatch_wave' | 'manual_assignment',
) {
  const response = await fetch('/api/push/order-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId, type }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.message || 'No se pudieron enviar las notificaciones push.',
    );
  }
}

const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    at_store: { label: "En negocio", variant: "default", icon: Building },
    cooking: { label: "En preparación", variant: "default", icon: CookingPot },
    ready_for_pickup: { label: "Listo para recoger", variant: "default", icon: Package },
    picked_up: { label: "Recogido", variant: "default", icon: Package },
    out_for_delivery: { label: "En ruta", variant: "default", icon: Bike },
    on_the_way: { label: "En ruta", variant: "default", icon: Bike },
    arrived_at_destination: { label: "En destino", variant: "default", icon: Home },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    completed: { label: "Completado", variant: "success", icon: CheckCircle },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
    refunded: { label: "Reembolsado", variant: "outline", icon: ReceiptText },
    failed: { label: "Fallido", variant: "destructive", icon: XCircle },
};

const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string, children?: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
        <div className="flex min-w-0 flex-col">
            <p className="text-sm text-slate-500">{label}</p>
            {children || <p className="break-words text-sm font-medium">{value || 'No disponible'}</p>}
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
        id: "hi-delivery-orders-google-maps",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    const [woosmapRoutePoints, setWoosmapRoutePoints] = React.useState<Array<{ lat: number; lng: number }> | null>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);

    const businessLocation = order?.pickup_address?.coordinates;
    const customerLocation = order?.delivery_address?.coordinates;

    const mapCenter = useMemo(() => {
        if (businessLocation) return businessLocation;
        if (customerLocation) return customerLocation;
        return { lat: 19.4326, lng: -99.1332 };
    }, [businessLocation, customerLocation]);

    const mapBounds = useMemo(() => {
        if (!isLoaded || typeof window === 'undefined') return undefined;

        const bounds = new window.google.maps.LatLngBounds();
        if (woosmapRoutePoints?.length) {
            woosmapRoutePoints.forEach((point) => bounds.extend(point));
            return bounds;
        }

        if (businessLocation) bounds.extend(businessLocation);
        if (customerLocation) bounds.extend(customerLocation);

        if (bounds.isEmpty()) return undefined;
        return bounds;
    }, [isLoaded, woosmapRoutePoints, businessLocation, customerLocation]);
    
    React.useEffect(() => {
        // Si la ruta ya está guardada en la orden, la usamos directamente.
        if (order?.route_path) {
            const routePath = order.route_path as any;
            if (Array.isArray(routePath?.points) && routePath.points.length > 0) {
                setWoosmapRoutePoints(routePath.points);
                return;
            }
        }

        // Si no hay ruta guardada, la calculamos con OSRM.
        if (isLoaded && businessLocation && customerLocation) {
            let cancelled = false;
            (async () => {
                try {
                    const url = `${OSRM_ROUTE_URL}/${businessLocation.lng},${businessLocation.lat};${customerLocation.lng},${customerLocation.lat}?overview=full&geometries=polyline&steps=false`;
                    const response = await fetch(url);
                    const payload = await response.json();
                    const polyline = payload?.routes?.[0]?.geometry as string | undefined;
                    const points = polyline ? decodePolyline(polyline) : [businessLocation, customerLocation];
                    if (!cancelled) {
                        setWoosmapRoutePoints(points);
                    }
                } catch (error) {
                    if (!cancelled) {
                        setWoosmapRoutePoints([businessLocation, customerLocation]);
                    }
                }
            })();

            return () => {
                cancelled = true;
            };
        }

        setWoosmapRoutePoints(null);
    }, [isLoaded, businessLocation, customerLocation, order?.route_path]);

    React.useEffect(() => {
        if (mapRef.current && mapBounds) {
            mapRef.current.fitBounds(mapBounds);
        }
    }, [mapBounds]);


    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-full w-full rounded-md" />;

    return (
        <GoogleMap
            mapContainerClassName="h-full w-full rounded-md"
            center={mapCenter}
            zoom={12}
            onLoad={(map) => {
                mapRef.current = map;
                if (mapBounds) map.fitBounds(mapBounds);
            }}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {woosmapRoutePoints ? (
                <>
                    <Polyline
                        path={woosmapRoutePoints}
                        options={{ strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 8, zIndex: 1 }}
                    />
                    <Polyline
                        path={woosmapRoutePoints}
                        options={{
                            strokeColor: '#0b3a8f',
                            strokeOpacity: 0,
                            strokeWeight: 3,
                            zIndex: 2,
                            icons: [
                                {
                                    icon: {
                                        path: 'M 0,-1 0,1',
                                        strokeOpacity: 1,
                                        strokeColor: '#0b3a8f',
                                        strokeWeight: 3,
                                        scale: 3,
                                    },
                                    offset: '0',
                                    repeat: '14px',
                                },
                            ],
                        }}
                    />
                    {businessLocation && (
                        <MarkerF position={businessLocation} label={{ text: "N", color: 'white' }} title="Negocio"/>
                    )}
                    {customerLocation && (
                        <MarkerF position={customerLocation} label={{ text: "C", color: 'white' }} title="Cliente"/>
                    )}
                </>
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
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';
  const canUseOperationsTools = !isAuthLoading && !isBusinessOwner;
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [reDispatching, setReDispatching] = useState(false);
  const [assigningRiderId, setAssigningRiderId] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);
  
  const { data: order, isLoading, isError } = api.orders.useGetOne(id);
  const updateStatusMutation = api.orders.useUpdate();
  const [ConfirmationDialog, confirm] = useConfirm();

  const availableRidersQuery = useQuery<AvailableRider[]>({
    queryKey: ['orders', 'available-riders', order?.id, ...(order?.rejected_riders ?? [])],
    enabled: canUseOperationsTools && isAssignDialogOpen,
    queryFn: async () => {
      const { data: businessZoneRow, error: businessZoneError } = await supabase
        .from('businesses')
        .select('zone_id')
        .eq('id', order?.business_id)
        .single();

      if (businessZoneError) {
        throw businessZoneError;
      }

      const businessZoneId = businessZoneRow?.zone_id as string | null;
      if (!businessZoneId) {
        return [];
      }

      const rejectedRiderIds = new Set(order?.rejected_riders ?? []);

      const { data: riders, error: riderError } = await supabase
        .from('riders')
        .select('id, first_name, last_name, phone_e164, zone_id, is_active_for_orders, last_location_update, last_latitude, last_longitude, status')
        .in('status', ['ACTIVE', 'approved'])
        .eq('zone_id', businessZoneId)
        .eq('is_active_for_orders', true);
      if (riderError) {
        throw riderError;
      }

      const riderRows = (riders ?? []) as AvailableRider[];
      if (riderRows.length === 0) {
        return [];
      }

      const zoneIds = Array.from(new Set(riderRows.map((rider) => rider.zone_id).filter(Boolean))) as string[];
      const [{ data: zones, error: zonesError }, { data: areas, error: areasError }] = await Promise.all([
        zoneIds.length > 0
          ? supabase.from('zones').select('id, name').in('id', zoneIds)
          : Promise.resolve({ data: [], error: null }),
        zoneIds.length > 0
          ? supabase.from('areas').select('id, zone_id, name, status, geofence').in('zone_id', zoneIds).eq('status', 'ACTIVE')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (zonesError) {
        throw zonesError;
      }
      if (areasError) {
        throw areasError;
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

      const zoneNameById = new Map<string, string>(
        ((zones ?? []) as Array<{ id: string; name: string }>).map((zone) => [zone.id, zone.name]),
      );
      const areasByZone = new Map<string, Array<{ name: string; geofence?: { lat: number; lng: number }[] }>>();
      for (const area of (areas ?? []) as Array<{ zone_id: string; name: string; geofence?: { lat: number; lng: number }[] }>) {
        const currentAreas = areasByZone.get(area.zone_id) ?? [];
        currentAreas.push({ name: area.name, geofence: area.geofence });
        areasByZone.set(area.zone_id, currentAreas);
      }

      return riderRows
        .map((rider) => ({
          ...rider,
          activeOrderCount: loadByRider.get(rider.id) ?? 0,
          zoneName: rider.zone_id ? zoneNameById.get(rider.zone_id) : undefined,
          areaName: rider.zone_id && typeof rider.last_latitude === 'number' && typeof rider.last_longitude === 'number'
            ? areasByZone
                .get(rider.zone_id)
                ?.find((area) => isPointInsidePolygon({ lat: rider.last_latitude as number, lng: rider.last_longitude as number }, area.geofence))
                ?.name
            : undefined,
          rejectedThisOrder: rejectedRiderIds.has(rider.id),
        }))
        .filter((rider) => rider.activeOrderCount < 2)
        .sort((a, b) => {
          if (a.activeOrderCount !== b.activeOrderCount) {
            return a.activeOrderCount - b.activeOrderCount;
          }

          if ((a.rejectedThisOrder ? 1 : 0) !== (b.rejectedThisOrder ? 1 : 0)) {
            return (a.rejectedThisOrder ? 1 : 0) - (b.rejectedThisOrder ? 1 : 0);
          }

          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, 'es');
        });
    },
  });

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || !canUseOperationsTools) return;
    let deliveryFailureReason: string | undefined;

    if (
      order.status === 'arrived_at_destination' &&
      ['failed', 'cancelled'].includes(newStatus)
    ) {
      const reason = window.prompt('Motivo de la incidencia en destino:');
      if (reason === null) return;
      deliveryFailureReason = reason.trim();
      if (!deliveryFailureReason) {
        toast({
          variant: 'destructive',
          title: 'Motivo requerido',
          description: 'Debes capturar un motivo para cerrar una incidencia en destino.',
        });
        return;
      }
    }

    const ok = await confirm({
      title: `¿Confirmar cambio de estado?`,
      description: `El pedido se marcará como "${statusConfig[newStatus].label}".`,
      confirmText: "Confirmar"
    });

    if (ok) {
        updateStatusMutation.mutate({
          id: order.id,
          status: newStatus,
          ...(deliveryFailureReason
            ? {
                delivery_failure_reason: deliveryFailureReason,
                delivery_failure_reported_at: new Date().toISOString(),
              }
            : {}),
        }, {
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

  const handleRedispatchFallback = async () => {
    if (!order) {
      throw new Error('No se encontró la orden.');
    }

    const { data: settings } = await supabase
      .from('system_settings')
      .select('dispatch_algorithm, dispatch_candidate_radius_km, dispatch_batch_size, dispatch_decision_window_seconds')
      .eq('id', 1)
      .single();

    const dispatchAlgorithm = settings?.dispatch_algorithm ?? 'batch';
    const dispatchRadiusKm = settings?.dispatch_candidate_radius_km ?? 10;
    const dispatchBatchSize = settings?.dispatch_batch_size ?? 3;
    const decisionWindowSeconds = settings?.dispatch_decision_window_seconds ?? 60;

    const { data: riders, error: riderError } = await supabase
      .from('riders')
      .select('id, first_name, last_name, phone_e164, zone_id, is_active_for_orders, last_location_update, last_latitude, last_longitude, status')
      .in('status', ['ACTIVE', 'approved'])
      .eq('is_active_for_orders', true);

    if (riderError) {
      throw riderError;
    }

    const riderRows = (riders ?? []) as AvailableRider[];
    if (riderRows.length === 0) {
      throw new Error('No hay riders activos para reenviar este pedido.');
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

    const pickupCoordinates = order.pickup_address?.coordinates;
    const rejectedRiderIds = new Set(order.rejected_riders ?? []);
    const loadByRider = new Map<string, number>();

    for (const activeOrder of activeOrders ?? []) {
      const riderId = activeOrder.rider_id as string | null;
      if (!riderId) continue;
      if (activeOrder.id === order.id) continue;
      loadByRider.set(riderId, (loadByRider.get(riderId) ?? 0) + 1);
    }

    const candidateRiders = riderRows
      .filter((rider) => !rejectedRiderIds.has(rider.id))
      .map((rider) => {
        const activeOrderCount = loadByRider.get(rider.id) ?? 0;
        const hasLocation = typeof rider.last_latitude === 'number' && typeof rider.last_longitude === 'number';
        const distanceKm = pickupCoordinates && hasLocation
          ? getDistanceInKm(
              rider.last_latitude as number,
              rider.last_longitude as number,
              pickupCoordinates.lat,
              pickupCoordinates.lng,
            )
          : Number.POSITIVE_INFINITY;

        return {
          ...rider,
          activeOrderCount,
          distanceKm,
        };
      })
      .filter((rider) => rider.activeOrderCount < 2)
      .filter((rider) => !pickupCoordinates || rider.distanceKm <= dispatchRadiusKm || !Number.isFinite(rider.distanceKm))
      .sort((a, b) => {
        if (a.activeOrderCount !== b.activeOrderCount) {
          return a.activeOrderCount - b.activeOrderCount;
        }
        return a.distanceKm - b.distanceKm;
      });

    if (candidateRiders.length === 0) {
      throw new Error('No hay riders elegibles para reenviar este pedido.');
    }

    const selectionSize = dispatchAlgorithm === 'sequential' ? 1 : dispatchBatchSize;
    const selectedRiders = candidateRiders.slice(0, Math.max(1, selectionSize));
    const selectedIds = selectedRiders.map((rider) => rider.id);
    const notifiedRiders = Array.from(new Set([...(order.notified_riders ?? []), ...selectedIds]));
    const expiresAt = new Date(Date.now() + decisionWindowSeconds * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending_acceptance',
        rider_id: null,
        active_notified_riders: selectedIds,
        notified_riders: notifiedRiders,
        notification_expires_at: expiresAt,
        assignment_exhausted_at: null,
        last_dispatch_at: new Date().toISOString(),
        dispatch_attempt_count: (order.dispatch_attempt_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      throw updateError;
    }

    return selectedRiders.length;
  };

  const handleRedispatch = async () => {
    if (!order || !canUseOperationsTools) return;
    const ok = await confirm({
      title: '¿Reenviar notificación?',
      description: 'Se intentará lanzar otra vez el dispatch de esta orden a riders disponibles.',
      confirmText: 'Reenviar',
    });
    if (!ok) return;

    setReDispatching(true);
    try {
      let selectedRiderCount: number | null = null;
      try {
        await tryDispatchOrderRpc(order.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const shouldFallback =
          message.includes('dispatch_order') ||
          message.includes('function') ||
          message.includes('schema cache');

        if (!shouldFallback) {
          throw error;
        }

        selectedRiderCount = await handleRedispatchFallback();
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', order.id] }),
      ]);
      await triggerOrderPushEvent(order.id, 'dispatch_wave').catch((error) => {
        console.error('Push redispatch failed:', error);
      });
      toast({
        title: 'Dispatch reenviado',
        description: selectedRiderCount != null
          ? `La orden volvió a entrar al flujo de notificación con ${selectedRiderCount} rider${selectedRiderCount === 1 ? '' : 's'} candidato${selectedRiderCount === 1 ? '' : 's'}.`
          : 'La orden volvió a entrar al flujo de notificación.',
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
    if (!order || !canUseOperationsTools) return;
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
      await triggerOrderPushEvent(order.id, 'manual_assignment').catch((error) => {
        console.error('Manual assignment push failed:', error);
      });
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

  const handleTestPush = async () => {
    if (!order || !canUseOperationsTools) return;
    setTestingPush(true);
    try {
      await triggerOrderPushEvent(
        order.id,
        order.rider_id ? 'manual_assignment' : 'dispatch_wave',
      );
      toast({
        title: 'Push enviado',
        description:
          'Se disparó una notificación de prueba hacia los destinatarios disponibles de esta orden.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'No se pudo enviar el push',
        description:
          error instanceof Error
            ? error.message
            : 'Error al enviar la notificación de prueba.',
        variant: 'destructive',
      });
    } finally {
      setTestingPush(false);
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
  const hasOrderItems = (order.order_items?.length ?? 0) > 0;
  const isShippingOrder = !hasOrderItems;
  const ticketPhotoUrls = (order.ticket_photo_urls?.length ? order.ticket_photo_urls : order.ticket_photo_url ? [order.ticket_photo_url] : []).filter(Boolean);
  
  return (
    <div className="space-y-6">
      <ConfirmationDialog />
      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Ticket del pedido</DialogTitle>
            <DialogDescription>
              Vista ampliada de la factura o ticket adjunto a esta orden.
            </DialogDescription>
          </DialogHeader>
          {ticketPhotoUrls.length > 0 ? (
            <div className="max-h-[75vh] space-y-3 overflow-auto rounded-md border bg-slate-50 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ticketPhotoUrls.map((photoUrl, index) => (
                  <div key={`${photoUrl}-${index}`} className="rounded-md border bg-white p-2">
                    <Image
                      src={photoUrl}
                      alt={`Ticket ${index + 1} del pedido ${displayId}`}
                      width={1600}
                      height={1200}
                      unoptimized
                      className="h-auto w-full rounded-md object-contain"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {ticketPhotoUrls.length} imagen{ticketPhotoUrls.length === 1 ? '' : 'es'} adjunta{ticketPhotoUrls.length === 1 ? '' : 's'}.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-slate-500">
              Este pedido no tiene ticket adjunto.
            </div>
          )}
        </DialogContent>
      </Dialog>
      {canUseOperationsTools ? (
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asignar rider manualmente</DialogTitle>
              <DialogDescription>
                Se muestran riders activos para órdenes en la misma zona. Si un rider rechazó esta solicitud, igual puede asignarse manualmente mientras siga disponible y con carga permitida.
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
                  <div key={rider.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">
                        {rider.first_name} {rider.last_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {[
                          rider.phone_e164 || 'Sin teléfono',
                          rider.zoneName ? `Zona ${rider.zoneName}` : rider.zone_id ? 'Zona asignada' : null,
                          rider.areaName ? `Área ${rider.areaName}` : null,
                        ].filter(Boolean).join(' · ')}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="success">Activo para órdenes</Badge>
                        <Badge variant={rider.activeOrderCount === 0 ? "outline" : "default"}>
                          {rider.activeOrderCount} pedido{rider.activeOrderCount === 1 ? '' : 's'} activo{rider.activeOrderCount === 1 ? '' : 's'}
                        </Badge>
                        {rider.rejectedThisOrder ? (
                          <Badge variant="warning">Rechazó esta solicitud</Badge>
                        ) : null}
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
                      className="w-full sm:w-auto"
                    >
                      {assigningRiderId === rider.id ? 'Asignando...' : 'Asignar'}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500">
                  No hay riders activos y disponibles en la misma zona de este negocio.
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
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
         <h2 className="break-words text-2xl font-bold tracking-tight">Pedido #{displayId}</h2>
         <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:justify-end">
            {canUseOperationsTools ? (
              <>
                <Badge variant={isShippingOrder ? "default" : "outline"} className="px-3 py-1 text-base">
                  {isShippingOrder ? "Shipping" : "POS"}
                </Badge>
                <Button
                  variant="outline"
                  onClick={handleTestPush}
                  disabled={testingPush}
                  className="flex-1 sm:flex-none"
                >
                  <BellRing className="mr-2 h-4 w-4" />
                  {testingPush ? 'Enviando push...' : 'Probar push'}
                </Button>
                {!order.rider_id && manuallyAssignableStatuses.includes(order.status as OrderStatus) ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRedispatch}
                      disabled={reDispatching}
                      className="flex-1 sm:flex-none"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {reDispatching ? 'Reenviando...' : 'Reenviar notificación'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAssignDialogOpen(true)}
                      className="flex-1 sm:flex-none"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Asignar rider
                    </Button>
                  </>
                ) : null}
              </>
            ) : null}
            <Badge variant={statusInfo.variant} className="px-3 py-1 text-base capitalize">
                <statusInfo.icon className="mr-2 h-4 w-4" />
                {statusInfo.label}
            </Badge>
            {canUseOperationsTools ? (
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
            ) : null}
          </div>
      </div>
      
       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
             {hasOrderItems ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de Artículos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                        <Table className="min-w-[560px]">
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
                        </div>
                    </CardContent>
                </Card>
             ) : (
                <Card>
                    <CardHeader>
                         <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <CardTitle>{canUseOperationsTools ? "Detalle del Pedido Shipping" : "Detalle del pedido"}</CardTitle>
                            {canUseOperationsTools ? <Badge variant="default">Shipping</Badge> : null}
                        </div>
                        {canUseOperationsTools ? (
                            <CardDescription>Pedido creado desde envío express, sin productos de catálogo.</CardDescription>
                        ) : null}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem icon={ReceiptText} label="Detalle del pedido" value={order.items_description || "No descrito"} />
                        <DetailItem
                            icon={Clock3}
                            label="Listo para recorrer en"
                            value={order.ready_in_minutes ? `${order.ready_in_minutes} min` : "No disponible"}
                        />
                        <DetailItem icon={ImageIcon} label="Fotos del ticket">
                            {ticketPhotoUrls.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setIsTicketDialogOpen(true)}
                                  className="block w-full text-left"
                                >
                                    <Image
                                        src={ticketPhotoUrls[0]}
                                        alt={`Ticket del pedido ${displayId}`}
                                        width={720}
                                        height={480}
                                        unoptimized
                                        className="mt-2 max-h-80 w-full rounded-md border object-contain transition hover:opacity-90"
                                    />
                                    {ticketPhotoUrls.length > 1 ? (
                                      <div className="mt-2 inline-flex rounded-full bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">
                                        +{ticketPhotoUrls.length - 1} imagen{ticketPhotoUrls.length === 2 ? '' : 'es'}
                                      </div>
                                    ) : null}
                                </button>
                            ) : (
                                <p className="font-medium text-sm">No disponible</p>
                            )}
                        </DetailItem>
                    </CardContent>
                </Card>
             )}
             {hasOrderItems && order.items_description && (
                <Card>
                    <CardHeader>
                        <CardTitle>Nota General del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 italic">"{order.items_description}"</p>
                    </CardContent>
                </Card>
             )}
             {canUseOperationsTools ? (
                <DispatchSummaryCard order={order} />
             ) : null}
             <Card>
                <CardHeader>
                    <CardTitle>{canUseOperationsTools ? "Mapa de la Ruta" : "Mapa de entrega"}</CardTitle>
                </CardHeader>
                 <CardContent className="h-72 sm:h-96">
                    <LocationMap order={order} />
                 </CardContent>
              </Card>
        </div>
        <div className="order-1 space-y-6 lg:order-2 lg:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Detalles del Pedido</CardTitle>
                    <CardDescription>{format(new Date(order.created_at), "d 'de' MMMM, yyyy, h:mm a", {locale: es})}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {canUseOperationsTools ? (
                        <DetailItem icon={Package} label="Tipo de orden">
                            <Badge variant={isShippingOrder ? "default" : "outline"}>{isShippingOrder ? "Shipping" : "POS"}</Badge>
                        </DetailItem>
                    ) : null}
                    {order.delivery_failure_reason ? (
                      <DetailItem
                        icon={XCircle}
                        label="Motivo de incidencia en destino"
                        value={order.delivery_failure_reason}
                      />
                    ) : null}
                    {canUseOperationsTools ? (
                        <DetailItem icon={Building} label="Negocio">
                            <Link href={`/businesses/${order.business_id}`} className="font-medium text-sm text-primary hover:underline">
                                {order.business?.name || 'No disponible'}
                            </Link>
                        </DetailItem>
                    ) : null}
                    <DetailItem icon={User} label="Cliente">
                        {canUseOperationsTools ? (
                            <Link href={`/customers/${order.customer_id}`} className="font-medium text-sm text-primary hover:underline">
                                {order.customer_name}
                            </Link>
                        ) : (
                            <p className="font-medium text-sm">{order.customer_name}</p>
                        )}
                    </DetailItem>
                    <DetailItem icon={Phone} label="Teléfono Cliente" value={order.customer_phone} />
                    <DetailItem icon={Home} label="Dirección de Entrega" value={order.delivery_address.text} />
                    {canUseOperationsTools ? (
                        <DetailItem icon={Bike} label="Repartidor">
                           {order.rider_id ? (
                               <Link href={`/riders/${order.rider_id}`} className="font-medium text-sm text-primary hover:underline">
                                    {order.rider?.first_name} {order.rider?.last_name}
                               </Link>
                            ) : 'Sin asignar'}
                        </DetailItem>
                    ) : null}
                    {canUseOperationsTools && !order.rider_id && manuallyAssignableStatuses.includes(order.status as OrderStatus) ? (
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
                        <span>{isShippingOrder ? "Monto del pedido" : "Subtotal"}</span>
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
