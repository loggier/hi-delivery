
"use client";

import React from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  Bell,
  Download,
  Wallet,
  CircleDollarSign,
  TrendingUp
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { format, isAfter, isBefore, add, sub } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, downloadCSV } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns } from "./columns";
import { Business, Plan } from "@/types";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  className?: string;
}

const KPICard = ({ title, value, icon: Icon, className }: KPICardProps) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const KPICardSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-2/4" />
            <Skeleton className="h-5 w-5" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-1/4" />
        </CardContent>
    </Card>
);

const useSubscriptionStats = () => {
    const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll();
    const { data: payments, isLoading: isLoadingPayments } = api.payments.useGetAll();
    const { data: plans, isLoading: isLoadingPlans } = api.plans.useGetAll();

    const isLoading = isLoadingBusinesses || isLoadingPayments || isLoadingPlans;

    const stats = React.useMemo(() => {
        if (isLoading || !businesses || !payments || !plans) {
            return {
                totalSubscriptions: 0,
                activeSubscriptions: 0,
                expiredSubscriptions: 0,
                expiringSoon: 0,
                totalTransactions: 0,
                totalRevenue: 0,
                monthlyRevenue: 0,
                subscribedBusinesses: []
            };
        }

        const now = new Date();
        const next7Days = add(now, { days: 7 });
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const subscribedBusinesses = businesses.filter(b => b.plan_id);

        let activeSubscriptions = 0;
        let expiredSubscriptions = 0;
        let expiringSoon = 0;

        subscribedBusinesses.forEach(b => {
            if (b.current_period_ends_at) {
                const expiryDate = new Date(b.current_period_ends_at);
                if (isAfter(expiryDate, now)) {
                    activeSubscriptions++;
                    if (isBefore(expiryDate, next7Days)) {
                        expiringSoon++;
                    }
                } else {
                    expiredSubscriptions++;
                }
            } else {
                expiredSubscriptions++; // No expiry date means inactive/expired
            }
        });

        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
        const monthlyRevenue = payments
            .filter(p => isAfter(new Date(p.payment_date), startOfMonth))
            .reduce((acc, p) => acc + p.amount, 0);
            
        const businessesWithPlan = subscribedBusinesses.map(business => {
            const plan = plans.find(p => p.id === business.plan_id);
            return { ...business, plan };
        }).filter(b => b.plan);

        return {
            totalSubscriptions: subscribedBusinesses.length,
            activeSubscriptions,
            expiredSubscriptions,
            expiringSoon,
            totalTransactions: payments.length,
            totalRevenue,
            monthlyRevenue,
            subscribedBusinesses: businessesWithPlan,
        };
    }, [businesses, payments, plans, isLoading]);

    return { stats, isLoading };
};


export default function SubscriptionsPage() {
    const { stats, isLoading } = useSubscriptionStats();
    const [search, setSearch] = React.useState('');
    const [debouncedSearch] = useDebounce(search, 500);

    const filteredData = React.useMemo(() => {
        if (!stats.subscribedBusinesses) return [];
        if (!debouncedSearch) return stats.subscribedBusinesses;

        const lowercasedSearch = debouncedSearch.toLowerCase();
        return stats.subscribedBusinesses.filter(item =>
            item.name.toLowerCase().includes(lowercasedSearch) ||
            item.plan?.name.toLowerCase().includes(lowercasedSearch)
        );
    }, [stats.subscribedBusinesses, debouncedSearch]);

    const columns = React.useMemo(() => getColumns(), []);

    const handleExport = () => {
        const dataToExport = filteredData.map(item => ({
            "ID Negocio": item.id,
            "Nombre Negocio": item.name,
            "Plan": item.plan?.name,
            "Precio Plan": item.plan?.price,
            "Fecha Expiración": item.current_period_ends_at ? format(new Date(item.current_period_ends_at), 'yyyy-MM-dd') : 'N/A',
            "Estado Suscripción": item.subscription_status,
        }));
        downloadCSV(dataToExport, `suscripciones-${new Date().toISOString().split('T')[0]}.csv`);
    }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de Tiendas Suscritas"
        description="Un resumen financiero de las suscripciones de los negocios."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
            </>
        ) : (
            <>
                <KPICard title="Usuarios Totales Suscritos" value={stats.totalSubscriptions} icon={Users} className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" />
                <KPICard title="Suscripciones Activas" value={stats.activeSubscriptions} icon={CheckCircle} className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800" />
                <KPICard title="Suscripción Expirada" value={stats.expiredSubscriptions} icon={XCircle} className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800" />
                <KPICard title="Próximo a Expirar" value={stats.expiringSoon} icon={Bell} className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800" />
            </>
        )}
      </div>

       <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <span>Transacciones Totales:</span>
                    <span className="font-bold">{isLoading ? <Skeleton className="h-5 w-8 inline-block" /> : stats.totalTransactions}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <CircleDollarSign className="h-5 w-5 text-green-500" />
                    <span>Ganancias Totales:</span>
                    <span className="font-bold">{isLoading ? <Skeleton className="h-5 w-20 inline-block" /> : formatCurrency(stats.totalRevenue)}</span>
                </div>
                 <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span>Ganado este mes:</span>
                    <span className="font-bold text-primary">{isLoading ? <Skeleton className="h-5 w-20 inline-block" /> : formatCurrency(stats.monthlyRevenue)}</span>
                </div>
            </CardContent>
        </Card>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        toolbar={
            <div className="flex items-center justify-between gap-2">
                <Input
                    placeholder="Buscar por nombre de tienda..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 max-w-sm"
                />
                 <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </div>
        }
      />
    </div>
  );
}
