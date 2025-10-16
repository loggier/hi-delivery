"use client";

import React from 'react';
import { Business, SubscriptionStatus } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, CreditCard, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SubscribedBusinessesProps {
    planName: string;
    businesses?: Business[];
    isLoading: boolean;
}

const statusConfig: Record<SubscriptionStatus, { label: string; Icon: React.ElementType, className: string }> = {
    active: { label: "Activa", Icon: CheckCircle, className: "text-green-600" },
    inactive: { label: "Inactiva", Icon: XCircle, className: "text-slate-500" },
    past_due: { label: "Vencida", Icon: CreditCard, className: "text-red-600" },
}


export function SubscribedBusinesses({ planName, businesses, isLoading }: SubscribedBusinessesProps) {
    
    const getSubscriptionStatus = (business: Business) => {
        const status = business.subscription_status || 'inactive';
        return statusConfig[status];
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Negocios Suscritos</CardTitle>
                <CardDescription>
                    Lista de negocios actualmente suscritos al plan "{planName}".
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Negocio</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Estado de Suscripción</TableHead>
                            <TableHead>Fecha de Vencimiento</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && businesses?.map(business => {
                            const status = getSubscriptionStatus(business);
                            return (
                                <TableRow key={business.id}>
                                    <TableCell className="font-medium">{business.name}</TableCell>
                                    <TableCell>{business.owner_name}</TableCell>
                                    <TableCell>
                                         <Badge variant={status.label === 'Activa' ? 'success' : status.label === 'Vencida' ? 'destructive' : 'outline'}>
                                            <status.Icon className="mr-1 h-3 w-3" />
                                            {status.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {business.current_period_ends_at 
                                            ? format(new Date(business.current_period_ends_at), "d MMM, yyyy", { locale: es })
                                            : 'N/A'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/businesses/${business.id}`}>Ver Negocio</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                         {!isLoading && (!businesses || businesses.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No hay negocios suscritos a este plan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
