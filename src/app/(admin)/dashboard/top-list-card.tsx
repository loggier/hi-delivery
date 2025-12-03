
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TopListItem {
    id: string;
    name: string;
    count: number;
    href: string;
}

interface TopListCardProps {
    title: string;
    data?: TopListItem[];
    icon: React.ElementType;
    emptyText: string;
    isLoading: boolean;
}

export function TopListCard({ title, data, icon: Icon, emptyText, isLoading }: TopListCardProps) {
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
