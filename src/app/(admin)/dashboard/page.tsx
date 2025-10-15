"use client";

import { Activity, CreditCard, DollarSign, Users } from "lucide-react";
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
import { useDashboardStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';

function KPICard({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
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
  if ('rfc' in item) return 'Business';
  if ('lastName' in item) return 'Rider';
  if ('price' in item) return 'Product';
  if ('slug' in item) return 'Category';
  return 'Unknown';
}

function getEntityName(item: any) {
    if ('name' in item) return item.name;
    return item.id;
}


export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats();

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
                <KPICard title="Active Businesses" value={data.activeBusinesses} icon={CreditCard} description="Total active businesses" />
                <KPICard title="Active Riders" value={data.activeRiders} icon={Users} description="Total active riders" />
                <KPICard title="Total Products" value={data.totalProducts} icon={DollarSign} description="Total products in catalog" />
                <KPICard title="Total Categories" value={data.totalCategories} icon={Activity} description="Total product categories" />
            </>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Changes</CardTitle>
          <CardDescription>
            A log of the most recent entities created in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Created At</TableHead>
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
                            <div className="text-sm text-muted-foreground md:hidden">
                                {format(new Date(item.createdAt), 'PPpp')}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{getEntityType(item)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                            <Badge className="text-xs" variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {item.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{format(new Date(item.createdAt), 'PPpp')}</TableCell>
                    </TableRow>
                ))}
                { !isLoading && (!data || data.latestChanges.length === 0) && (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                        No recent changes.
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
