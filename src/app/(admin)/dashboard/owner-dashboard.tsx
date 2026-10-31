"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Ban, Clock, PackageCheck, ShoppingCart, Timer, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { OwnerDashboardStats } from "@/lib/dashboard/owner-stats-types";
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { OrderStatusGrid } from "./order-status-grid";
import { OrdersChart } from "./orders-chart";
import { RevenueChart } from "./revenue-chart";

const OWNER_STATS_QUERY_KEY = ["dashboard-stats", "owner"] as const;

async function fetchOwnerStats(): Promise<OwnerDashboardStats> {
  const response = await fetch("/api/dashboard-stats", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`dashboard-stats ${response.status}`);
  }
  return (await response.json()) as OwnerDashboardStats;
}

function useOwnerDashboardStats() {
  return useQuery<OwnerDashboardStats>({
    queryKey: OWNER_STATS_QUERY_KEY,
    queryFn: fetchOwnerStats,
    retry: 1,
    staleTime: 30_000,
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

function describeComparison(current: number, previous: number): string {
  if (previous <= 0) return "Sin datos el mismo día de la semana pasada";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent > 0 ? "+" : ""}${percent}% vs. mismo día de la semana pasada`;
}

function OwnerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-[260px] w-full" />
    </div>
  );
}

function OwnerDashboardError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <Card role="alert">
      <CardContent className="flex flex-col items-start gap-3 p-6">
        <p className="text-base font-semibold">No pudimos cargar tus datos</p>
        <p className="text-sm text-slate-700">Revisa tu conexión e inténtalo de nuevo.</p>
        <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? "Reintentando..." : "Reintentar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyTodayBanner({ yesterdaySameHourOrders }: { yesterdaySameHourOrders: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm font-medium">
          Hoy aún no hay pedidos. Ayer a esta hora tenías {yesterdaySameHourOrders}.
        </p>
      </CardContent>
    </Card>
  );
}

function QueueCard({ queue }: { queue: OwnerDashboardStats["queue"] }) {
  const rows = [
    {
      label: "Pedidos sin repartidor",
      value: queue.unassignedCount,
      hint:
        queue.oldestUnassignedMinutes !== null
          ? `Más antiguo: hace ${formatMinutes(queue.oldestUnassignedMinutes)}`
          : "Sin pedidos pendientes de asignar",
      icon: Clock,
    },
    {
      label: "Listos para recoger",
      value: queue.readyForPickupCount,
      hint: "Esperando al repartidor",
      icon: PackageCheck,
    },
    {
      label: "Entregas fallidas hoy",
      value: queue.failedToday,
      hint: "Pedidos marcados como fallidos hoy",
      icon: AlertTriangle,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cola de acciones</CardTitle>
        <CardDescription>Lo que requiere tu atención ahora</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <row.icon className="h-4 w-4 text-slate-700" aria-hidden="true" />
              {row.label}
            </div>
            <div className="mt-1 text-2xl font-bold">{row.value}</div>
            <p className="text-xs text-slate-700">{row.hint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CancellationCard({ cancellation }: { cancellation: OwnerDashboardStats["cancellation"] }) {
  const hasData = cancellation.total > 0 && cancellation.ratePercent !== null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tasa de cancelación</CardTitle>
        <Ban className="h-4 w-4 text-slate-700" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{hasData ? `${cancellation.ratePercent}%` : "—"}</div>
        <p className="text-xs text-slate-700">
          {hasData
            ? `${cancellation.cancelled} de ${cancellation.total} pedidos en los últimos 7 días`
            : "Sin pedidos en los últimos 7 días"}
        </p>
      </CardContent>
    </Card>
  );
}

function DeliveryTimeCard({ deliveryTime }: { deliveryTime: NonNullable<OwnerDashboardStats["deliveryTime"]> }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tiempo de entrega</CardTitle>
        <Timer className="h-4 w-4 text-slate-700" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatMinutes(deliveryTime.medianMinutes)}</div>
        <p className="text-xs text-slate-700">
          Mediana · p90 {formatMinutes(deliveryTime.p90Minutes)} · {deliveryTime.sample} entregas de los últimos 7 días
        </p>
      </CardContent>
    </Card>
  );
}

export function OwnerDashboard() {
  const { data, isLoading, isError, isFetching, refetch } = useOwnerDashboardStats();

  if (isLoading) {
    return <OwnerDashboardSkeleton />;
  }

  if (isError || !data) {
    return <OwnerDashboardError onRetry={() => void refetch()} isRetrying={isFetching} />;
  }

  const noOrdersToday = data.today.orders === 0;

  return (
    <div className="space-y-6">
      {noOrdersToday ? (
        <EmptyTodayBanner yesterdaySameHourOrders={data.yesterdaySameHourOrders} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard
          title="Ventas del día"
          value={noOrdersToday ? "—" : formatCurrency(data.today.sales)}
          icon={Wallet}
          description="Pedidos completados y entregados hoy"
          footer={describeComparison(data.today.sales, data.previousWeekday.sales)}
        />
        <KPICard
          title="Pedidos del día"
          value={noOrdersToday ? "—" : data.today.orders}
          icon={ShoppingCart}
          description="Pedidos registrados hoy"
          footer={describeComparison(data.today.orders, data.previousWeekday.orders)}
        />
        <KPICard
          title="Ticket promedio"
          value={noOrdersToday || data.today.averageTicket === 0 ? "—" : formatCurrency(data.today.averageTicket)}
          icon={TrendingUp}
          description="Promedio por pedido completado hoy"
        />
      </div>

      <QueueCard queue={data.queue} />

      {noOrdersToday ? null : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Estado de pedidos hoy</h2>
          <OrderStatusGrid data={data.orderStatusSummary} isLoading={false} />
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={data.revenueLast7Days} isLoading={false} />
        <OrdersChart data={data.ordersLast7Days} isLoading={false} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CancellationCard cancellation={data.cancellation} />
        {data.deliveryTime ? <DeliveryTimeCard deliveryTime={data.deliveryTime} /> : null}
      </div>
    </div>
  );
}
