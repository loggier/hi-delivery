
"use client";

import { Building2, Crown, ShoppingCart, Store, Trophy, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { TopListCard } from "./top-list-card";
import { useAuthStore } from "@/store/auth-store";
import { RevenueChart } from "./revenue-chart";
import { OrdersChart } from "./orders-chart";
import React from "react";
import { OrderStatusGrid } from "./order-status-grid";
import { RiderCapacityChart } from "./rider-capacity-chart";

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

const AdminDashboard = ({ data, isLoading }: { data: any, isLoading: boolean }) => {
  const topBusinesses = data?.topBusinesses?.map((b: any) => ({
      id: b.business_id,
      name: b.business_name,
      count: b.order_count,
      href: `/businesses/${b.business_id}`
  }));
  
  const topRiders = data?.topRiders?.map((r: any) => ({
      id: r.rider_id,
      name: r.rider_name,
      count: r.order_count,
      href: `/riders/${r.rider_id}`
  }));

  const topCustomers = data?.topCustomers?.map((c: any) => ({
      id: c.customer_id,
      name: c.customer_name,
      count: c.order_count,
      href: `/customers/${c.customer_id}`
  }));
  
  return (
    <div className="space-y-4">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <RiderCapacityChart
          totalRiders={data?.totalRiders}
          activeRiders={data?.activeRiders}
          isLoading={isLoading}
        />
        <div className="grid gap-4 md:grid-cols-2">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : data ? (
            <>
              <KPICard title="Negocios Registrados" value={data.totalBusinesses || 0} icon={Building2} description="Total de negocios registrados" />
              <KPICard title="Negocios Activos" value={data.activeBusinesses || 0} icon={Store} description="Negocios con estado activo" />
              <KPICard title="Pedidos del Día" value={data.dailyOrders} icon={ShoppingCart} description="Órdenes registradas hoy" />
              <KPICard title="Pedidos del Mes" value={data.monthlyOrders || 0} icon={Wallet} description="Órdenes acumuladas del mes actual" />
            </>
          ) : null}
        </div>
      </div>

      <OrderStatusGrid data={data?.orderStatusSummary} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <OrdersChart data={data?.ordersLast7Days} isLoading={isLoading} />
        <RevenueChart data={data?.revenueLast7Days} isLoading={isLoading} />
      </div>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 items-start">
         <TopListCard 
            title="Top 5 Negocios del Día" 
            data={topBusinesses}
            icon={Crown}
            emptyText="No hay pedidos registrados hoy."
            isLoading={isLoading}
         />
         <TopListCard 
            title="Top 5 Repartidores del Día" 
            data={topRiders}
            icon={Trophy}
            emptyText="No hay entregas completadas hoy."
            isLoading={isLoading}
         />
          <TopListCard 
            title="Top 5 Clientes del Día" 
            data={topCustomers}
            icon={Users}
            emptyText="No hay pedidos de clientes hoy."
            isLoading={isLoading}
         />
      </div>
    </div>
  )
}

const BusinessOwnerDashboard = ({ data, isLoading }: { data: any, isLoading: boolean }) => {
   const topCustomers = data?.topCustomers?.map((c: any) => ({
      id: c.customer_id,
      name: c.customer_name,
      count: c.order_count,
      href: `/customers/${c.customer_id}`
  }));

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
                <>
                    <KPICardSkeleton />
                    <KPICardSkeleton />
                    <KPICardSkeleton />
                </>
            ) : data ? (
                 <>
                    <KPICard title="Ingresos del Día" value={formatCurrency(data.dailyRevenue)} icon={Wallet} description="Ventas totales de hoy" />
                    <KPICard title="Pedidos del Día" value={data.dailyOrders} icon={ShoppingCart} description="Total de órdenes hoy" />
                    <KPICard title="Ticket Promedio" value={formatCurrency(data.averageTicketToday)} icon={TrendingUp} description="Valor promedio por orden" />
                </>
            ) : null}
        </div>
        
        <OrderStatusGrid data={data?.orderStatusSummary} isLoading={isLoading} />
        
        <div className="grid gap-6 md:grid-cols-2">
            <RevenueChart data={data?.revenueLast7Days} isLoading={isLoading} />
            <OrdersChart data={data?.ordersLast7Days} isLoading={isLoading} />
        </div>
        
        <TopListCard 
            title="Top 5 Clientes del Día" 
            data={topCustomers}
            icon={Users}
            emptyText="Aún no hay pedidos de clientes hoy."
            isLoading={isLoading}
         />
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role_id === 'owen-business' || user?.role?.name === 'Dueño de Negocio';
  const canLoadStats = !isAuthLoading && (!isBusinessOwner || Boolean(user?.business_id));
  
  const { data, isLoading } = api.dashboard.useGetStats({ 
      business_id: isBusinessOwner ? user?.business_id : undefined 
  }, {
      enabled: canLoadStats,
  });

  if (isAuthLoading) {
    return <AdminDashboard data={null} isLoading={true} />;
  }

  return isBusinessOwner 
    ? <BusinessOwnerDashboard data={data} isLoading={isLoading} />
    : <AdminDashboard data={data} isLoading={isLoading} />;
}
