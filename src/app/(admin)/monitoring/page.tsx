
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, ClipboardList, Package, Phone, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { LiveMap } from './live-map';
import { OrderStatus, type Rider } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

function KPICard({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/4" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/4" />
      </CardContent>
    </Card>
  );
}

const activeOrderStatuses: OrderStatus[] = ['pending_acceptance', 'accepted', 'cooking', 'out_for_delivery'];

const ActiveRidersTable = ({ riders, activeOrderRiderIds, searchTerm, onSearchChange }: { riders: Rider[], activeOrderRiderIds: Set<string>, searchTerm: string, onSearchChange: (value: string) => void }) => {
    const filteredRiders = React.useMemo(() => {
        if (!searchTerm) return riders;
        return riders.filter(rider => 
            `${rider.first_name} ${rider.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rider.phone_e164.includes(searchTerm)
        );
    }, [riders, searchTerm]);

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Repartidores Activos</CardTitle>
                <div className="relative mt-2">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o teléfono..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Repartidor</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Pedido</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRiders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No se encontraron repartidores.
                                </TableCell>
                            </TableRow>
                        )}
                        {filteredRiders.map(rider => (
                            <TableRow key={rider.id}>
                                <TableCell>
                                    <Link href={`/riders/${rider.id}`} className="font-medium hover:underline">
                                        {rider.first_name} {rider.last_name}
                                    </Link>
                                </TableCell>
                                <TableCell>{rider.phone_e164}</TableCell>
                                <TableCell>
                                    {activeOrderRiderIds.has(rider.id) && (
                                        <Badge variant="warning">
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
  const [searchTerm, setSearchTerm] = React.useState('');
  const { data: allRiders, isLoading: isLoadingRiders } = api.riders.useGetAll({}, {
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: allOrders, isLoading: isLoadingOrders } = api.orders.useGetAll({}, {
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { activeRidersWithLocation, activeRidersForTable, activeOrders, activeOrderRiderIds } = React.useMemo(() => {
    const activeRiders = allRiders?.filter(r => r.is_active_for_orders) || [];
    const activeRidersWithLocation = activeRiders.filter(r => r.last_latitude && r.last_longitude);
    const activeOrders = allOrders?.filter(o => activeOrderStatuses.includes(o.status)) || [];
    const activeOrderRiderIds = new Set(activeOrders.map(o => o.rider_id).filter(Boolean) as string[]);
    
    return {
        activeRidersWithLocation,
        activeRidersForTable: activeRiders,
        activeOrders,
        activeOrderRiderIds,
    };
  }, [allRiders, allOrders]);
  
  const isLoading = isLoadingRiders || isLoadingOrders;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Monitoreo en Vivo"
        description="Vista en tiempo real de repartidores y pedidos activos."
      />
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-1 flex flex-col gap-6 h-[calc(100vh-150px)]">
            <div className="grid grid-cols-2 gap-4">
                 {isLoading ? (
                    <>
                        <KPICardSkeleton />
                        <KPICardSkeleton />
                    </>
                    ) : (
                    <>
                        <KPICard title="Repartidores Activos" value={activeRidersWithLocation.length} icon={Bike} />
                        <KPICard title="Pedidos Activos" value={activeOrders.length} icon={ClipboardList} />
                    </>
                )}
            </div>
            <ActiveRidersTable 
                riders={activeRidersForTable} 
                activeOrderRiderIds={activeOrderRiderIds}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />
        </div>
        <div className="lg:col-span-2 h-[60vh] lg:h-full rounded-lg overflow-hidden">
            <LiveMap riders={activeRidersWithLocation} />
        </div>
      </div>
    </div>
  );
}
