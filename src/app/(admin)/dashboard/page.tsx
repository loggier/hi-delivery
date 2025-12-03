
"use client";

import { Activity, CreditCard, ShoppingCart, Users, DollarSign, Package, Bike, User, TrendingUp, Crown, Trophy, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

interface TopListItem {
    id: string;
    name: string;
    count: number;
    href: string;
}

function TopListCard({ title, data, icon: Icon, emptyText, isLoading }: { title: string, data?: TopListItem[], icon: React.ElementType, emptyText: string, isLoading: boolean }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className="flex justify-between items-center">
                                <Skeleton className="h-5 w-3/5" />
                                <Skeleton className="h-5 w-1/5" />
                            </div>
                        ))}
                    </div>
                ) : !data || data.length === 0 ? (
                    <p className="text-sm text-center text-slate-500 py-4">{emptyText}</p>
                ) : (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-400 w-5">{index + 1}.</span>
                                    <Link href={item.href} className="font-medium hover:underline truncate" title={item.name}>
                                        {item.name}
                                    </Link>
                                </div>
                                <span className="font-bold">{item.count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
  const { data, isLoading } = api.dashboard.useGetStats();

  const topBusinesses = data?.topBusinesses?.map(b => ({
      id: b.business_id,
      name: b.business_name,
      count: b.order_count,
      href: `/businesses/${b.business_id}`
  }));
  
  const topRiders = data?.topRiders?.map(r => ({
      id: r.rider_id,
      name: r.rider_name,
      count: r.order_count,
      href: `/riders/${r.rider_id}`
  }));

  const topCustomers = data?.topCustomers?.map(c => ({
      id: c.customer_id,
      name: c.customer_name,
      count: c.order_count,
      href: `/customers/${c.customer_id}`
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
            <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
            </>
        ) : data ? (
            <>
                <KPICard title="Pedidos del Día" value={data.dailyOrders} icon={ShoppingCart} description="Total de órdenes hoy" />
                <KPICard title="Ticket Promedio (Hoy)" value={formatCurrency(data.averageTicketToday)} icon={TrendingUp} description="Valor promedio por orden" />
                <KPICard title="Pedidos Activos" value={data.activeOrders} icon={Activity} description="En preparación o en camino" />
            </>
        ) : null}
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
    </>
  );
}
