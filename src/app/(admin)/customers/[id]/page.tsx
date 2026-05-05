
"use client";

import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Mail, Phone, Home, Package, Bike, Building, CheckCircle, Eye, Trash2, CookingPot, ReceiptText, XCircle, Pencil, PlusCircle, Loader2 } from "lucide-react";
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';
import Link from 'next/link';

import { api, useCustomerOrders } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { type Order, type CustomerAddress, OrderStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressFormModal } from '@/app/(admin)/pos/components';

const libraries: ('places')[] = ['places'];

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-slate-500 mt-0.5" />
        <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="font-medium">{value || 'No disponible'}</p>
        </div>
    </div>
);

const LocationMap = ({ address }: { address: CustomerAddress | null }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const mapCenter = useMemo(() => {
        if (address) {
            return { lat: address.latitude, lng: address.longitude };
        }
        return { lat: 19.4326, lng: -99.1332 }; // Default a Ciudad de México
    }, [address]);

    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-full w-full" />;

    return (
        <GoogleMap
            mapContainerClassName="h-full w-full rounded-md"
            center={mapCenter}
            zoom={address ? 16 : 10}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
                mapTypeControl: true,
            }}
        >
            {address && <MarkerF position={{ lat: address.latitude, lng: address.longitude }} />}
        </GoogleMap>
    );
};


const statusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "default" | "outline", icon: React.ElementType }> = {
    pending_acceptance: { label: "Pendiente", variant: "warning", icon: Eye },
    accepted: { label: "Aceptado", variant: "default", icon: CheckCircle },
    at_store: { label: "En negocio", variant: "default", icon: Building },
    cooking: { label: "En preparación", variant: "default", icon: CookingPot },
    ready_for_pickup: { label: "Listo para recoger", variant: "default", icon: Package },
    picked_up: { label: "Recogido", variant: "default", icon: Package },
    out_for_delivery: { label: "En ruta", variant: "default", icon: Bike },
    on_the_way: { label: "En ruta", variant: "default", icon: Bike },
    arrived_at_destination: { label: "En destino", variant: "default", icon: Home },
    delivered: { label: "Entregado", variant: "success", icon: Package },
    completed: { label: "Completado", variant: "success", icon: CheckCircle },
    cancelled: { label: "Cancelado", variant: "destructive", icon: XCircle },
    refunded: { label: "Reembolsado", variant: "outline", icon: ReceiptText },
    failed: { label: "Fallido", variant: "destructive", icon: XCircle },
};


const OrderHistoryTable = ({ orders, isLoading }: { orders: Order[]; isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }
    
    if (!orders || orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
                <p className="text-slate-500">Este cliente aún no tiene pedidos.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID Pedido</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Negocio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map(order => {
                    const statusInfo = statusConfig[order.status as OrderStatus] || { label: "Desconocido", variant: "outline", icon: Eye };
                    return (
                        <TableRow key={order.id}>
                            <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {`ORD-${order.id.substring(4,12).toUpperCase()}`}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(order.created_at), 'd MMM, yyyy', { locale: es })}</TableCell>
                            <TableCell className="font-medium">{order.business?.name || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={statusInfo.variant} className="capitalize text-xs">
                                    <statusInfo.icon className="mr-1 h-3 w-3"/>
                                    {statusInfo.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(order.order_total)}</TableCell>
                             <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/orders/${order.id}`}>Ver</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    );
}


export default function ViewCustomerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) ?? '';
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';
  
  const { data: customer, isLoading, isError } = api.customers.useGetOne(id);
  const { data: addresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: id });
  const { data: customerOrders = [], isLoading: isLoadingOrders } = useCustomerOrders(id);
  const deleteAddressMutation = api.customer_addresses.useDelete();
  const updateCustomerMutation = api.customers.useUpdate<{
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  }>();
  const deleteCustomerMutation = api.customers.useDelete();
  
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });
  const [ConfirmationDialog, confirm] = useConfirm();

  React.useEffect(() => {
    if (!customer) return;
    setCustomerForm({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
    });
  }, [customer]);

  React.useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setIsCustomerDialogOpen(true);
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (addresses && addresses.length > 0) {
        const primaryAddress = addresses.find(addr => addr.is_primary) || addresses[0];
        setSelectedAddress(primaryAddress);
    } else {
        setSelectedAddress(null);
    }
  }, [addresses]);

  const handleSaveCustomer = async () => {
    if (!customer) return;

    const firstName = customerForm.first_name.trim();
    const lastName = customerForm.last_name.trim();
    const phone = customerForm.phone.trim();
    const email = customerForm.email.trim();

    if (firstName.length < 2 || lastName.length < 2 || phone.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Datos incompletos',
        description: 'Nombre, apellido y teléfono son obligatorios.',
      });
      return;
    }

    await updateCustomerMutation.mutateAsync({
      id: customer.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      email: email || null,
    });
    setIsCustomerDialogOpen(false);
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;

    const ok = await confirm({
      title: "¿Eliminar cliente?",
      description: "Solo se eliminará si no tiene pedidos relacionados. Si ya tiene historial, se conservará para no romper sus pedidos.",
      confirmText: "Eliminar",
      confirmVariant: "destructive",
    });

    if (!ok) return;

    deleteCustomerMutation.mutate(customer.id, {
      onSuccess: () => {
        router.push('/customers');
      },
    });
  };

  const handleOpenNewAddress = () => {
    setEditingAddress(null);
    setIsAddressDialogOpen(true);
  };

  const handleOpenEditAddress = (address: CustomerAddress) => {
    setEditingAddress(address);
    setIsAddressDialogOpen(true);
  };

  const handleCloseAddressDialog = () => {
    setIsAddressDialogOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = async (address: CustomerAddress) => {
    const ok = await confirm({
      title: "¿Eliminar dirección?",
      description: "Esta dirección se eliminará del cliente y no podrá recuperarse.",
      confirmText: "Eliminar",
      confirmVariant: "destructive",
    });

    if (!ok) return;

    deleteAddressMutation.mutate(address.id, {
      onSuccess: () => {
        if (selectedAddress?.id === address.id) {
          const remainingAddresses = (addresses ?? []).filter((item) => item.id !== address.id);
          setSelectedAddress(remainingAddresses[0] ?? null);
        }
      },
    });
  };


  if (isLoading) {
    return (
        <div className="space-y-4">
            <PageHeader title="Cargando cliente" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-[480px] w-full" />
                </div>
            </div>
            <Skeleton className="h-72 w-full" />
        </div>
    );
  }

  if (isError || !customer) {
      notFound();
  }

  if (
    !isAuthLoading &&
    isBusinessOwner &&
    user?.business_id &&
    customer.business_id !== user.business_id
  ) {
    notFound();
  }

  const orderCount = customerOrders.length;
  const totalSpent = customerOrders.reduce((total, order) => total + (Number(order.order_total) || 0), 0);

  return (
    <div className="space-y-6">
      <ConfirmationDialog />
      <AddressFormModal
        isOpen={isAddressDialogOpen}
        onClose={handleCloseAddressDialog}
        customerId={customer.id}
        addressToEdit={editingAddress}
      />
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos de contacto de este cliente para este negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={customerForm.first_name}
                onChange={(event) => setCustomerForm((current) => ({ ...current, first_name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={customerForm.last_name}
                onChange={(event) => setCustomerForm((current) => ({ ...current, last_name: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={customerForm.phone}
                onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={customerForm.email}
                onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)} disabled={updateCustomerMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCustomer} disabled={updateCustomerMutation.isPending}>
              {updateCustomerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PageHeader title={`${customer.first_name} ${customer.last_name}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteCustomer}
            disabled={deleteCustomerMutation.isPending}
          >
            {deleteCustomerMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Eliminar
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Phone} label="Teléfono" value={customer.phone} />
                    <DetailItem icon={Mail} label="Email" value={customer.email} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle>Direcciones Guardadas</CardTitle>
                            <CardDescription>Selecciona una dirección para verla en el mapa.</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleOpenNewAddress}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agregar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingAddresses ? (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : addresses && addresses.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {addresses.map(addr => (
                                <div 
                                    key={addr.id}
                                    onClick={() => setSelectedAddress(addr)}
                                    className={cn(
                                        "p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all",
                                        selectedAddress?.id === addr.id
                                            ? "bg-primary/10 border-primary shadow-sm"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <Home className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        selectedAddress?.id === addr.id ? "text-primary" : "text-slate-400"
                                    )} />
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium leading-tight">{addr.address}</p>
                                        <p className="text-xs text-muted-foreground">{addr.city}, {addr.state}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {[
                                                addr.street ? `Calle: ${addr.street}` : null,
                                                addr.house_number ? `Número: ${addr.house_number}` : null,
                                                addr.reference ? `Referencia: ${addr.reference}` : null,
                                            ].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {selectedAddress?.id === addr.id && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-primary"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleOpenEditAddress(addr);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                void handleDeleteAddress(addr);
                                            }}
                                            disabled={deleteAddressMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
                            <p className="text-slate-500 text-sm">No hay direcciones guardadas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="h-[480px]">
                <CardHeader>
                    <CardTitle>Ubicación Seleccionada</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)]">
                   <LocationMap address={selectedAddress} />
                </CardContent>
            </Card>
        </div>
      </div>
        <Card>
            <CardHeader>
                <CardTitle>Historial de Pedidos</CardTitle>
                <CardDescription>
                    Un total de {orderCount} pedido{orderCount === 1 ? '' : 's'} con un gasto de {formatCurrency(totalSpent)}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <OrderHistoryTable orders={customerOrders} isLoading={isLoadingOrders} />
            </CardContent>
        </Card>
    </div>
  );
}
