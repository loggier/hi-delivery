"use client";

import Link from "next/link";
import { AlertCircle, Bike, MapPinned, MapPinOff, PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { getColumns } from "./columns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RidersDataTableToolbar } from "./data-table-toolbar";
import { type Table } from "@tanstack/react-table";
import { type Rider } from "@/types";

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  active = false,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="text-left" onClick={onClick}>
    <Card className={cn("transition-colors", active && "border-primary bg-primary/5")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="text-xl font-bold leading-none">{value}</div>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>
      </CardContent>
    </Card>
    </button>
  );
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <Skeleton className="mb-2 h-6 w-10" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function StatusSummaryCard({
  counts,
  activeStatus,
  onStatusClick,
}: {
  counts: Array<{ label: string; value: number }>;
  activeStatus: string | null;
  onStatusClick: (status: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-3">
        <CardTitle className="text-sm font-medium">Total por Estado</CardTitle>
        <AlertCircle className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {counts.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onStatusClick(item.key)}
              className={cn(
                "rounded-md border bg-slate-50/70 px-2.5 py-1.5 text-left transition-colors",
                activeStatus === item.key && "border-primary bg-primary/5"
              )}
            >
              <div className="text-[9px] uppercase tracking-wide text-slate-500">{item.label}</div>
              <div className="mt-1 text-sm font-semibold leading-none">{item.value}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusSummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-1 pt-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ZoneSummaryCard({
  zones,
  activeZone,
  onZoneClick,
}: {
  zones: Array<[string, number]>;
  activeZone: string | null;
  onZoneClick: (zone: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="px-4 pb-1 pt-3">
        <CardTitle className="text-sm font-medium">Resumen por Zona</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {zones.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {zones.map(([zoneName, count]) => (
              <button
                key={zoneName}
                type="button"
                onClick={() => onZoneClick(zoneName)}
                className={cn(
                  "rounded-md border bg-slate-50/70 px-2.5 py-1.5 text-left transition-colors",
                  activeZone === zoneName && "border-primary bg-primary/5"
                )}
              >
                <div className="truncate text-[10px] text-slate-500">{zoneName}</div>
                <div className="mt-1 text-sm font-semibold leading-none">{count}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Aún no hay repartidores registrados.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ZoneSummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="px-4 pb-1 pt-3">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RidersPage() {
  const { data: ridersData, isLoading: isLoadingRiders } = api.riders.useGetAll();

  const { data: zonesData, isLoading: isLoadingZones } = api.zones.useGetAll();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const columns = useMemo(() => getColumns(zonesData || []), [zonesData]);
  const isLoading = isLoadingRiders || isLoadingZones;
  const riderSummary = useMemo(() => {
    const riders = ridersData || [];
    const zones = zonesData || [];
    const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));
    const zoneCounts = riders.reduce<Record<string, number>>((acc, rider) => {
      const zoneKey = rider.zone_id ? zoneNameById.get(rider.zone_id) || "Zona sin nombre" : "Sin zona";
      acc[zoneKey] = (acc[zoneKey] || 0) + 1;
      return acc;
    }, {});

    return {
      totalRegistered: riders.length,
      assignedToZone: riders.filter((rider) => Boolean(rider.zone_id)).length,
      withoutZone: riders.filter((rider) => !rider.zone_id).length,
      statusBreakdown: [
        { key: "approved", label: "Aprobado", value: riders.filter((rider) => rider.status === "approved").length },
        { key: "pending_review", label: "Pendiente", value: riders.filter((rider) => rider.status === "pending_review").length },
        { key: "incomplete", label: "Incompleto", value: riders.filter((rider) => rider.status === "incomplete").length },
        { key: "inactive", label: "Inactivo", value: riders.filter((rider) => rider.status === "inactive").length },
      ],
      zoneBreakdown: Object.entries(zoneCounts).sort((left, right) => right[1] - left[1]),
    };
  }, [ridersData, zonesData]);
  const filteredRiders = useMemo(() => {
    const riders = ridersData || [];
    const zones = zonesData || [];
    const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]));

    return riders.filter((rider) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesStatus = selectedStatus ? rider.status === selectedStatus : true;
      const riderZoneName = rider.zone_id ? zoneNameById.get(rider.zone_id) || "Zona sin nombre" : "Sin zona";
      const matchesZone = selectedZone
        ? selectedZone === "__assigned__"
          ? Boolean(rider.zone_id)
          : riderZoneName === selectedZone
        : true;
      const fullName = `${rider.first_name} ${rider.last_name}`.toLowerCase();
      const matchesSearch = normalizedSearch
        ? fullName.includes(normalizedSearch) ||
          rider.first_name.toLowerCase().includes(normalizedSearch) ||
          rider.last_name.toLowerCase().includes(normalizedSearch) ||
          rider.email.toLowerCase().includes(normalizedSearch) ||
          rider.phone_e164.toLowerCase().includes(normalizedSearch) ||
          riderZoneName.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesStatus && matchesZone && matchesSearch;
    });
  }, [ridersData, zonesData, selectedStatus, selectedZone, searchTerm]);

  const toggleStatusFilter = (status: string) => {
    setSelectedStatus((current) => (current === status ? null : status));
  };

  const toggleZoneFilter = (zone: string) => {
    setSelectedZone((current) => (current === zone ? null : zone));
  };
  
  return (
    <div className="space-y-4">
      <PageHeader title="Repartidores" description="Gestiona los repartidores de la plataforma.">
        {/* The button to create new riders is commented out as creation is done via the public form */}
        {/* <Button asChild>
          <Link href="/riders/new">
            <PlusCircle />
            Nuevo Repartidor
          </Link>
        </Button> */}
      </PageHeader>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              title="Repartidores Registrados"
              value={riderSummary.totalRegistered}
              icon={Bike}
              description="Base total de repartidores"
              active={!selectedStatus && !selectedZone}
              onClick={() => {
                setSelectedStatus(null);
                setSelectedZone(null);
              }}
            />
            <SummaryCard
              title="Asignados a Zona"
              value={riderSummary.assignedToZone}
              icon={MapPinned}
              description="Con zona configurada"
              active={selectedZone === "__assigned__"}
              onClick={() => toggleZoneFilter("__assigned__")}
            />
            <SummaryCard
              title="Sin Zona"
              value={riderSummary.withoutZone}
              icon={MapPinOff}
              description="Pendientes de asignación"
              active={selectedZone === "Sin zona"}
              onClick={() => toggleZoneFilter("Sin zona")}
            />
          </>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {isLoading ? (
          <>
            <StatusSummaryCardSkeleton />
            <ZoneSummaryCardSkeleton />
          </>
        ) : (
          <>
            <StatusSummaryCard
              counts={riderSummary.statusBreakdown}
              activeStatus={selectedStatus}
              onStatusClick={toggleStatusFilter}
            />
            <ZoneSummaryCard
              zones={riderSummary.zoneBreakdown}
              activeZone={selectedZone}
              onZoneClick={toggleZoneFilter}
            />
          </>
        )}
      </div>
       <DataTable
        columns={columns}
        data={filteredRiders}
        isLoading={isLoading}
        toolbar={(table: Table<Rider>) => (
          <RidersDataTableToolbar
            table={table}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onResetQuickFilters={() => {
              setSelectedStatus(null);
              setSelectedZone(null);
            }}
            hasQuickFilters={Boolean(selectedStatus || selectedZone)}
          />
        )}
      />
    </div>
  );
}
