"use client";

import { Building2, Crown, ShoppingCart, Store, Trophy, Users, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { getDashboardRole } from "@/lib/auth/roles";
import { TopListCard } from "./top-list-card";
import { useAuthStore } from "@/store/auth-store";
import { RevenueChart } from "./revenue-chart";
import { OrdersChart } from "./orders-chart";
import { OrderStatusGrid } from "./order-status-grid";
import { RiderCapacityChart } from "./rider-capacity-chart";
import { KPICard, KPICardSkeleton } from "./kpi-card";
import { OwnerDashboard } from "./owner-dashboard";

// Vista HID: solo para admin (role-admin). Los agregados vienen de /api/dashboard-stats.
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
  );
};

// Solo se monta para admin: es el único rol que dispara la consulta de agregados.
function HidAdminDashboard() {
  const { data, isLoading } = api.dashboard.useGetStats({}, { enabled: true });
  return <AdminDashboard data={data} isLoading={isLoading} />;
}

// Otros roles de HID: sin datos hasta que existan permisos de estadísticas para ellos.
function HidOtherDashboard() {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium">Tu rol aún no tiene estadísticas en este panel.</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();

  if (isAuthLoading) {
    return <AdminDashboard data={null} isLoading={true} />;
  }

  // Única decisión de vista por rol. El layout ya redirige a repartidores; aquí no se renderiza nada.
  switch (getDashboardRole(user)) {
    case 'rider':
      return null;
    case 'owner':
      return <OwnerDashboard />;
    case 'hid-admin':
      return <HidAdminDashboard />;
    default:
      return <HidOtherDashboard />;
  }
}
