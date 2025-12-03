"use client";

import { Activity, CreditCard, ShoppingCart, Users, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, useDashboardStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RevenueChart } from "./revenue-chart";
import { OrdersChart } from "./orders-chart";
import { formatCurrency } from "@/lib/utils";
import { OrderStatusGrid } from "./order-status-grid";

function KPICard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-500">{description}</p>
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
                <Skeleton className="h-8 w-1/4 mb-2" />
                <Skeleton className="h-3 w-3/4" />
            </CardContent>
        </Card>
    );
}

function getEntityType(item: any) {
  if ('tax_id' in item) return 'Negocio';
  if ('lastName' in item) return 'Repartidor';
  if ('price' in item) return 'Producto';
  if ('slug' in item) return 'Cat. Producto';
  return 'Desconocido';
}

function getEntityName(item: any) {
    if ('name' in item) return item.name;
    if ('firstName' in item) return `${item.firstName} ${item.lastName}`;
    return item.id;
}

function getEntityStatus(item: any) {
    if (!item.status) return null;
    const isActive = item.status === 'ACTIVE' || item.status === 'approved';
    return (
        <Badge className="text-xs" variant={isActive ? 'success' : 'outline'}>
            {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
    );
}

function getEntityDate(item: any): string | null {
    const dateValue = item.created_at || item.createdAt;
    if (!dateValue) return null;
    try {
        return format(new Date(dateValue), 'PPpp', { locale: es });
    } catch (e) {
        return "Fecha inválida";
    }
}


export default function DashboardPage() {
  const { data, isLoading } = api.dashboard.useGetStats();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
            </>
        ) : data ? (
            <>
                <KPICard title="Ingresos Totales" value={formatCurrency(data.totalRevenue)} icon={DollarSign} description="Ingresos de los últimos 7 días" />
                <KPICard title="Pedidos Totales" value={data.totalOrders} icon={ShoppingCart} description="Pedidos de los últimos 7 días" />
                <KPICard title="Negocios Activos" value={data.activeBusinesses} icon={CreditCard} description="Total de negocios operando" />
                <KPICard title="Repartidores Aprobados" value={data.activeRiders} icon={Users} description="Total de repartidores en servicio" />
            </>
        ) : null}
      </div>
      <OrderStatusGrid data={data?.orderStatusSummary} isLoading={isLoading} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart data={data?.revenueData} isLoading={isLoading} />
        <OrdersChart data={data?.ordersData} isLoading={isLoading} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cambios Recientes</CardTitle>
          <CardDescription>
            Un registro de las entidades creadas más recientemente en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidad</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="hidden md:table-cell">Creado en</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    </TableRow>
                ))}
                {data?.latestChanges.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="font-medium">{getEntityName(item)}</div>
                            <div className="text-sm text-slate-500 md:hidden">
                                {getEntityDate(item)}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{getEntityType(item)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                           {getEntityStatus(item)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{getEntityDate(item)}</TableCell>
                    </TableRow>
                ))}
                { !isLoading && (!data || data.latestChanges.length === 0) && (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No hay cambios recientes.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
