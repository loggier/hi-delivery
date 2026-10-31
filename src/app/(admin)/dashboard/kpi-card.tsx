import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  footer?: React.ReactNode;
}

export function KPICard({ title, value, icon: Icon, description, footer }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-700" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-700">{description}</p>
        {footer ? <div className="mt-1 text-xs text-slate-700">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
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
