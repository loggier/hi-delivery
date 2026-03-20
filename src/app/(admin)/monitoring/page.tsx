
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ClipboardList, Package, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { LiveMap } from './live-map';
import { OrderStatus, type Rider, type Zone } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase();
}

function sanitizeImageUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  return undefined;
}

function KPICard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
  return (
    <div className="flex min-w-[132px] items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-3.5 w-3.5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="text-lg font-bold leading-none">{value}</div>
      </div>
    </div>
  );
}

function KPICardSkeleton() {
  return (
    <div className="flex min-w-[132px] items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-10" />
      </div>
    </div>
  );
}

const activeOrderStatuses: OrderStatus[] = ['pending_acceptance', 'accepted', 'cooking', 'out_for_delivery'];

const ActiveRidersTable = ({
    riders,
    zones,
    activeOrderRiderIds,
    searchTerm,
    onSearchChange,
    selectedZoneId,
    onZoneChange,
    selectedRiderId,
    onSelectRider,
}: {
    riders: Rider[],
    zones: Zone[],
    activeOrderRiderIds: Set<string>,
    searchTerm: string,
    onSearchChange: (value: string) => void,
    selectedZoneId: string,
    onZoneChange: (value: string) => void,
    selectedRiderId: string | null,
    onSelectRider: (rider: Rider) => void,
}) => {
    const filteredRiders = React.useMemo(() => {
        if (!searchTerm) return riders;
        return riders.filter(rider => 
            `${rider.first_name} ${rider.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rider.phone_e164.includes(searchTerm)
        );
    }, [riders, searchTerm]);

    return (
        <Card className="flex flex-col">
            <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-base">Repartidores Activos</CardTitle>
                <div className="mt-2 space-y-2">
                    <Select value={selectedZoneId} onValueChange={onZoneChange}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Filtrar por zona" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las zonas</SelectItem>
                            {zones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.id}>
                                    {zone.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                     <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="h-9 pl-8 text-xs"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto px-0 pb-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wide">Repartidor</TableHead>
                            <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wide">Teléfono</TableHead>
                            <TableHead className="px-3 py-2 text-[11px] uppercase tracking-wide">Pedido</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRiders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-20 text-center text-sm">
                                    No se encontraron repartidores.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRiders.map(rider => (
                            <TableRow
                                key={rider.id}
                                className={cn(
                                    "cursor-pointer transition-colors",
                                    selectedRiderId === rider.id && "bg-primary/5",
                                )}
                                onClick={() => onSelectRider(rider)}
                            >
                                <TableCell className="px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarImage src={sanitizeImageUrl(rider.avatar1x1_url)} alt={`${rider.first_name} ${rider.last_name}`} />
                                            <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700">
                                                {getInitials(rider.first_name, rider.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5">
                                            <Link
                                                href={`/riders/${rider.id}`}
                                                className="text-sm font-medium leading-none hover:underline"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                {rider.first_name} {rider.last_name}
                                            </Link>
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge className="px-1.5 py-0 text-[10px]" variant={rider.is_active_for_orders ? "success" : "outline"}>
                                                    {rider.is_active_for_orders ? "Disponible" : "No disponible"}
                                                </Badge>
                                                {typeof rider.last_speed === 'number' ? (
                                                    <Badge className="px-1.5 py-0 text-[10px] font-bold" variant="outline">
                                                        {Math.round(rider.last_speed)} KPH
                                                    </Badge>
                                                ) : null}
                                                {selectedRiderId === rider.id ? (
                                                    <Badge className="px-1.5 py-0 text-[10px]" variant="default">Seleccionado</Badge>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="px-3 py-2.5 text-xs">{rider.phone_e164}</TableCell>
                                <TableCell className="px-3 py-2.5">
                                    {activeOrderRiderIds.has(rider.id) && (
                                        <Badge className="px-1.5 py-0 text-[10px]" variant="warning">
                                            <Package className="mr-1 h-3 w-3"/>
                                            En curso
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default function MonitoringPage() {
  const supabase = React.useMemo(() => createClient(), []);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedZoneId, setSelectedZoneId] = React.useState('all');
  const [selectedRiderId, setSelectedRiderId] = React.useState<string | null>(null);
  const [realtimeRiders, setRealtimeRiders] = React.useState<Rider[]>([]);
  const [realtimeOrders, setRealtimeOrders] = React.useState<any[]>([]);
  const { data: allRiders, isLoading: isLoadingRiders } = api.riders.useGetAll();
  const { data: zones } = api.zones.useGetAll({ status: 'ACTIVE' });
  const { data: allOrders, isLoading: isLoadingOrders } = api.orders.useGetAll();

  React.useEffect(() => {
    if (allRiders) {
      setRealtimeRiders(allRiders);
    }
  }, [allRiders]);

  React.useEffect(() => {
    if (allOrders) {
      setRealtimeOrders(allOrders);
    }
  }, [allOrders]);

  React.useEffect(() => {
    const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public';
    const riderChannel = supabase
      .channel('monitoring-riders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema, table: 'riders' },
        (payload) => {
          setRealtimeRiders((current) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id as string;
              return current.filter((rider) => rider.id !== deletedId);
            }

            const nextRider = payload.new as Rider;
            const existingIndex = current.findIndex((rider) => rider.id === nextRider.id);
            if (existingIndex === -1) {
              return [nextRider, ...current];
            }

            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], ...nextRider };
            return updated;
          });
        }
      )
      .subscribe();

    const orderChannel = supabase
      .channel('monitoring-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema, table: 'orders' },
        (payload) => {
          setRealtimeOrders((current) => {
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id as string;
              return current.filter((order) => order.id !== deletedId);
            }

            const nextOrder = payload.new as any;
            const existingIndex = current.findIndex((order) => order.id === nextOrder.id);
            if (existingIndex === -1) {
              return [nextOrder, ...current];
            }

            const updated = [...current];
            updated[existingIndex] = { ...updated[existingIndex], ...nextOrder };
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(riderChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [supabase]);

  const { activeRidersWithLocation, activeRidersForTable, activeOrders, activeOrderRiderIds, activeOrderByRiderId } = React.useMemo(() => {
    const availableRiders = realtimeRiders.filter(
      (r) => (r.status === 'approved' || (r.status as string) === 'ACTIVE') && r.is_active_for_orders
    );
    const filteredRiders = selectedZoneId === 'all'
      ? availableRiders
      : availableRiders.filter((rider) => rider.zone_id === selectedZoneId);
    const activeRidersWithLocation = filteredRiders.filter(r => r.last_latitude && r.last_longitude);
    const activeOrders = realtimeOrders.filter(o => activeOrderStatuses.includes(o.status));
    const activeOrderRiderIds = new Set(activeOrders.map(o => o.rider_id).filter(Boolean) as string[]);
    const activeOrderByRiderId = new Map(
      activeOrders
        .filter((order) => Boolean(order.rider_id))
        .map((order) => [order.rider_id as string, { id: order.id }]),
    );
    
    return {
        activeRidersWithLocation,
        activeRidersForTable: filteredRiders,
        activeOrders,
        activeOrderRiderIds,
        activeOrderByRiderId,
    };
  }, [realtimeRiders, realtimeOrders, selectedZoneId]);

  React.useEffect(() => {
    if (!selectedRiderId) return;
    const stillExists = activeRidersForTable.some((rider) => rider.id === selectedRiderId);
    if (!stillExists) {
      setSelectedRiderId(null);
    }
  }, [activeRidersForTable, selectedRiderId]);
  
  const isLoading = isLoadingRiders || isLoadingOrders;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Monitoreo en Vivo"
        description="Vista en tiempo real de repartidores y pedidos activos."
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : (
            <>
              <KPICard title="Repartidores Activos" value={activeRidersForTable.length} icon={Bike} />
              <KPICard title="Pedidos Activos" value={activeOrders.length} icon={ClipboardList} />
            </>
          )}
        </div>
      </PageHeader>
      <div className="mt-3 grid flex-grow grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex h-[calc(100vh-150px)] flex-col gap-4 lg:col-span-1">
            <ActiveRidersTable 
                riders={activeRidersForTable} 
                zones={zones || []}
                activeOrderRiderIds={activeOrderRiderIds}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedZoneId={selectedZoneId}
                onZoneChange={setSelectedZoneId}
                selectedRiderId={selectedRiderId}
                onSelectRider={(rider) => setSelectedRiderId(rider.id)}
            />
        </div>
        <div className="h-[60vh] overflow-hidden rounded-lg lg:col-span-2 lg:h-full">
            <LiveMap
                riders={activeRidersWithLocation}
                activeOrderRiderIds={activeOrderRiderIds}
                activeOrderByRiderId={activeOrderByRiderId}
                selectedRiderId={selectedRiderId}
                onSelectRider={(rider) => setSelectedRiderId(rider?.id ?? null)}
            />
        </div>
      </div>
    </div>
  );
}
