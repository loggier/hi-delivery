

"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { type Business, type BusinessBranch, type Customer, type CustomerAddress, type Order, type OrderPayload } from '@/types';
import { api } from '@/lib/api';
import { CheckCircle, ChevronDown, ChevronUp, User, Home, Package, Store, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoadScript } from '@react-google-maps/api';
import { CustomerSearch, AddressFormModal, CustomerDisplay, CustomerFormModal, ShippingMapModal, PackageDetails, ShippingSummary, type ShippingInfo } from './components';
import { useAuthStore } from '@/store/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export type LocationPoint = { address: string; lat: number; lng: number };
type PickupLocation = Pick<Business | BusinessBranch, 'id' | 'name' | 'address_line' | 'latitude' | 'longitude'>;
type CreatedOrderNotice = Pick<Order, 'id'>;

const ORDER_SUCCESS_NOTICE_SECONDS = 15;

function ShippingCreatedNotice({
    order,
    secondsLeft,
    onView,
    onClose,
}: {
    order: CreatedOrderNotice;
    secondsLeft: number;
    onView: () => void;
    onClose: () => void;
}) {
    const progress = Math.max(0, Math.min(100, (secondsLeft / ORDER_SUCCESS_NOTICE_SECONDS) * 100));
    const orderLabel = order.id.slice(0, 8).toUpperCase();

    return (
        <div className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:right-6 sm:w-[420px]">
            <div className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl dark:border-green-900 dark:bg-slate-950">
                <div className="flex items-start gap-3 p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950 dark:text-slate-50">Orden #{orderLabel} creada correctamente</p>
                        <p className="text-sm text-muted-foreground">El formulario quedó listo para capturar el siguiente envío.</p>
                        <div className="mt-3 flex items-center gap-2">
                            <Button type="button" size="sm" onClick={onView}>
                                Ver
                            </Button>
                            <span className="text-xs text-muted-foreground">Se cerrará en {secondsLeft}s</span>
                        </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="h-1 bg-green-100 dark:bg-green-950">
                    <div className="h-full bg-green-600 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
                </div>
            </div>
        </div>
    );
}

export default function ShippingPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';

    const [selectedBusiness, setSelectedBusiness] = React.useState<Business | null>(null);
    const [selectedPickupLocation, setSelectedPickupLocation] = React.useState<PickupLocation | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [selectedAddress, setSelectedAddress] = React.useState<CustomerAddress | null>(null);
    const [packageDescription, setPackageDescription] = React.useState('');
    const [orderAmount, setOrderAmount] = React.useState('');
    const [readyInMinutes, setReadyInMinutes] = React.useState('');
    const [ticketPhotos, setTicketPhotos] = React.useState<File[]>([]);
    const [isTicketPhotoProcessing, setIsTicketPhotoProcessing] = React.useState(false);
    
    const [isBusinessOpen, setIsBusinessOpen] = React.useState(!isBusinessOwner);
    const [isCustomerOpen, setIsCustomerOpen] = React.useState(isBusinessOwner);
    const [isPackageOpen, setIsPackageOpen] = React.useState(false);

    const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);
    const [shippingInfoForMap, setShippingInfoForMap] = React.useState<ShippingInfo | null>(null);
    const [createdOrderNotice, setCreatedOrderNotice] = React.useState<CreatedOrderNotice | null>(null);
    const [createdOrderNoticeSecondsLeft, setCreatedOrderNoticeSecondsLeft] = React.useState(ORDER_SUCCESS_NOTICE_SECONDS);

    const createOrderMutation = api.orders.useCreate();

    const { isLoaded } = useLoadScript({
        id: "hi-delivery-shipping-google-maps",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const { data: businessesData, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({
        status: 'ACTIVE',
        id: isBusinessOwner ? user?.business_id : undefined,
    });
    const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll({ business_id: selectedBusiness?.id });
    const { data: customerAddresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: selectedCustomer?.id });

    React.useEffect(() => {
        if (!selectedCustomer) {
            setSelectedAddress(null);
            return;
        }

        if (!customerAddresses || customerAddresses.length === 0) {
            setSelectedAddress(null);
            return;
        }

        if (customerAddresses[0]?.customer_id !== selectedCustomer.id) {
            return;
        }

        const currentAddressId = selectedAddress?.id;
        const currentAddressExists = currentAddressId ? customerAddresses.some((address) => address.id === currentAddressId) : false;

        if (!currentAddressExists) {
            setSelectedAddress(customerAddresses[0]);
            setIsCustomerOpen(false);
        }
    }, [customerAddresses, selectedAddress?.id, selectedCustomer]);

    const origin = React.useMemo<LocationPoint | null>(() => {
        if (!selectedPickupLocation) return null;
        if (!selectedPickupLocation.address_line || selectedPickupLocation.latitude === undefined || selectedPickupLocation.longitude === undefined) return null;
        return {
            address: selectedPickupLocation.address_line,
            lat: selectedPickupLocation.latitude,
            lng: selectedPickupLocation.longitude,
        };
    }, [selectedPickupLocation]);

    const destination = React.useMemo<LocationPoint | null>(() => {
        if (!selectedAddress) return null;
        return {
            address: selectedAddress.address,
            lat: selectedAddress.latitude,
            lng: selectedAddress.longitude,
        };
    }, [selectedAddress]);

    const selectedAddressId = selectedAddress?.id;

    React.useEffect(() => {
        if (!selectedAddressId) return;
        setIsCustomerOpen(false);
        setIsPackageOpen(true);
    }, [selectedAddressId]);

    React.useEffect(() => {
        if (isBusinessOwner && businessesData && businessesData.length > 0 && !selectedBusiness) {
            const business = businessesData[0];
            setSelectedBusiness(business);
            setSelectedPickupLocation({
                id: business.id,
                name: `${business.name} (Matriz)`,
                address_line: business.address_line,
                latitude: business.latitude,
                longitude: business.longitude,
            });
            setIsBusinessOpen(false);
            setIsCustomerOpen(true);
        }
    }, [isBusinessOwner, businessesData, selectedBusiness]);

    React.useEffect(() => {
        if (!createdOrderNotice) return;

        const startedAt = Date.now();
        setCreatedOrderNoticeSecondsLeft(ORDER_SUCCESS_NOTICE_SECONDS);

        const interval = window.setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
            const nextSecondsLeft = ORDER_SUCCESS_NOTICE_SECONDS - elapsedSeconds;

            if (nextSecondsLeft <= 0) {
                window.clearInterval(interval);
                setCreatedOrderNotice(null);
                return;
            }

            setCreatedOrderNoticeSecondsLeft(nextSecondsLeft);
        }, 1000);

        return () => window.clearInterval(interval);
    }, [createdOrderNotice]);

    const handleSelectBusiness = (businessId: string) => {
        const business = businessesData?.find((item) => item.id === businessId) || null;
        setSelectedBusiness(business);
        setSelectedPickupLocation(
            business
                ? {
                    id: business.id,
                    name: `${business.name} (Matriz)`,
                    address_line: business.address_line,
                    latitude: business.latitude,
                    longitude: business.longitude,
                }
                : null
        );
        setSelectedCustomer(null);
        setSelectedAddress(null);
        setPackageDescription('');
        setOrderAmount('');
        setReadyInMinutes('');
        setTicketPhotos([]);
        setIsTicketPhotoProcessing(false);
        setIsBusinessOpen(false);
        setIsCustomerOpen(true);
        setIsPackageOpen(false);
    };
    
    const handleSelectCustomer = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setSelectedAddress(null);
        setPackageDescription('');
        setOrderAmount('');
        setReadyInMinutes('');
        setTicketPhotos([]);
        setIsTicketPhotoProcessing(false);
        setIsPackageOpen(false);
        setIsCustomerOpen(true);
    }

    const handleSelectAddress = (address: CustomerAddress) => {
        setSelectedAddress(address);
        setIsCustomerOpen(false);
        setIsPackageOpen(true);
    }
    
    const handleOpenAddressModal = (address: CustomerAddress | null = null) => {
        setEditingAddress(address);
        setIsAddressModalOpen(true);
    }
    
    const handleCustomerCreated = (newCustomer: Customer) => {
        setSelectedCustomer(newCustomer);
        setSelectedAddress(null);
        setPackageDescription('');
        setOrderAmount('');
        setReadyInMinutes('');
        setTicketPhotos([]);
        setIsTicketPhotoProcessing(false);
        setIsPackageOpen(false);
        setIsCustomerModalOpen(false);
        setIsCustomerOpen(true);
        setIsAddressModalOpen(true);
    };

    const handleCreateShipping = ({ shippingInfo }: { shippingInfo: ShippingInfo }) => {
        const parsedReadyInMinutes = Number(readyInMinutes);
        const parsedOrderAmount = Number(orderAmount || 0);

        if (
            !selectedBusiness ||
            !selectedCustomer ||
            !origin ||
            !destination ||
            !packageDescription.trim() ||
            parsedOrderAmount < 0 ||
            isTicketPhotoProcessing ||
            !Number.isFinite(parsedReadyInMinutes) ||
            parsedReadyInMinutes <= 0
        ) {
            return;
        }

        const orderPayload: OrderPayload & { items: [] } = {
            business_id: selectedBusiness.id,
            customer_id: selectedCustomer.id,
            status: 'pending_acceptance',
            items: [],
            items_description: packageDescription.trim(),
            pickup_address: {
                text: origin.address,
                coordinates: { lat: origin.lat, lng: origin.lng },
            },
            delivery_address: {
                text: destination.address,
                coordinates: { lat: destination.lat, lng: destination.lng },
            },
            customer_name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim(),
            customer_phone: selectedCustomer.phone,
            subtotal: Number.isFinite(parsedOrderAmount) ? parsedOrderAmount : 0,
            delivery_fee: shippingInfo.cost,
            order_total: (Number.isFinite(parsedOrderAmount) ? parsedOrderAmount : 0) + shippingInfo.cost,
            distance: shippingInfo.distance,
            route_path: shippingInfo.routePath,
            ready_in_minutes: parsedReadyInMinutes,
            ticket_photos: ticketPhotos,
        };

        createOrderMutation.mutate(orderPayload, {
            onSuccess: (createdOrder) => {
                setCreatedOrderNotice({ id: createdOrder.id });
                setSelectedCustomer(null);
                setSelectedAddress(null);
                setPackageDescription('');
                setOrderAmount('');
                setReadyInMinutes('');
                setTicketPhotos([]);
                setIsTicketPhotoProcessing(false);
                setIsBusinessOpen(false);
                setIsCustomerOpen(true);
                setIsPackageOpen(false);
                setShippingInfoForMap(null);
            },
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-base">
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <Card>
                    <Collapsible open={isBusinessOpen} onOpenChange={setIsBusinessOpen}>
                        <CollapsibleTrigger asChild>
                            <div className={cn("flex justify-between items-center p-4 cursor-pointer rounded-t-lg", isBusinessOpen && "border-b")}>
                                <div className="flex items-center gap-3">
                                    <Store className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                        <h3 className="font-semibold text-xl">Paso 1: Negocio del Envío</h3>
                                        {selectedBusiness && (
                                            <span className="text-primary font-medium truncate max-w-xs sm:max-w-md">
                                                {selectedBusiness.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    {isBusinessOpen ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-4">
                                {isLoadingBusinesses ? (
                                    <Skeleton className="h-12 w-full" />
                                ) : (
                                    <Select value={selectedBusiness?.id || ''} onValueChange={handleSelectBusiness}>
                                        <SelectTrigger className="h-12">
                                            <SelectValue placeholder="Selecciona un negocio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(businessesData || []).map((business) => (
                                                <SelectItem key={business.id} value={business.id}>
                                                    {business.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
                
                <Card>
                    <Collapsible open={isCustomerOpen} onOpenChange={setIsCustomerOpen} disabled={!selectedBusiness}>
                         <CollapsibleTrigger asChild disabled={!selectedBusiness}>
                           <div className={cn(
                                "flex justify-between items-center p-4 cursor-pointer rounded-t-lg", 
                                isCustomerOpen && "border-b",
                                !selectedBusiness && "opacity-50 cursor-not-allowed"
                            )}>
                                <div className="flex items-center gap-3">
                                    <User className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                         <h3 className="font-semibold text-xl">
                                            Paso 2: Cliente y Dirección
                                        </h3>
                                        {destination && selectedCustomer && (
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm">
                                                <span className="text-primary font-medium">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Home className="h-3 w-3 sm:block hidden"/>
                                                    <span className="truncate max-w-[200px] sm:max-w-xs">{destination.address}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" disabled={!selectedBusiness}>
                                     {isCustomerOpen ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-4">
                                {selectedCustomer ? (
                                    <CustomerDisplay 
                                        customer={selectedCustomer} 
                                        addresses={customerAddresses || []}
                                        selectedAddress={selectedAddress}
                                        onSelectAddress={handleSelectAddress}
                                        onClearCustomer={() => handleSelectCustomer(null)}
                                        onShowMap={() => setIsMapModalOpen(true)}
                                        onAddAddress={() => handleOpenAddressModal(null)}
                                        onEditAddress={(addr) => handleOpenAddressModal(addr)}
                                        isLoadingAddresses={isLoadingAddresses}
                                    />
                                ) : (
                                    <CustomerSearch
                                        customers={customers || []}
                                        onSelectCustomer={handleSelectCustomer}
                                        onAddNewCustomer={() => setIsCustomerModalOpen(true)}
                                        disabled={isLoadingCustomers}
                                    />
                                )}
                           </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <Card>
                    <Collapsible open={isPackageOpen} onOpenChange={setIsPackageOpen} disabled={!destination}>
                        <CollapsibleTrigger asChild disabled={!destination}>
                             <div className={cn(
                                "flex justify-between items-center p-4 cursor-pointer rounded-t-lg", 
                                isPackageOpen && "border-b",
                                !destination && "opacity-50 cursor-not-allowed"
                            )}>
                                 <div className="flex items-center gap-3">
                                    <Package className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                        <h3 className="font-semibold text-xl">Paso 3: Detalle del pedido</h3>
                                        {packageDescription && <span className="text-primary font-medium truncate max-w-xs sm:max-w-md">{packageDescription}</span>}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" disabled={!destination}>
                                     {isPackageOpen ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-4">
                                <PackageDetails 
                                    value={packageDescription}
                                    onValueChange={setPackageDescription}
                                    orderAmount={orderAmount}
                                    onOrderAmountChange={setOrderAmount}
                                    readyInMinutes={readyInMinutes}
                                    onReadyInMinutesChange={setReadyInMinutes}
                                    ticketPhotos={ticketPhotos}
                                    onTicketPhotosChange={setTicketPhotos}
                                    onTicketPhotoProcessingChange={setIsTicketPhotoProcessing}
                                />
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>
            </div>

            <div className="col-span-1">
                <ShippingSummary 
                    business={selectedBusiness}
                    customer={selectedCustomer}
                    origin={origin}
                    destination={destination}
                    packageDescription={packageDescription}
                    orderAmount={Number(orderAmount || 0)}
                    readyInMinutes={Number.isFinite(Number(readyInMinutes)) && Number(readyInMinutes) > 0 ? Number(readyInMinutes) : null}
                    isTicketPhotoProcessing={isTicketPhotoProcessing}
                    isMapsLoaded={isLoaded}
                    onCreateShipping={handleCreateShipping}
                    isCreating={createOrderMutation.isPending}
                    onOpenMap={(shippingInfo) => {
                        setShippingInfoForMap(shippingInfo);
                        setIsMapModalOpen(true);
                    }}
                />
            </div>

            {selectedCustomer && (
                <AddressFormModal
                    isOpen={isAddressModalOpen}
                    onClose={() => setIsAddressModalOpen(false)}
                    customerId={selectedCustomer.id}
                    addressToEdit={editingAddress}
                    isMapsLoaded={isLoaded}
                    origin={origin}
                    onSaved={() => setSelectedAddress(null)}
                />
            )}
            
             <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                businessId={selectedBusiness?.id || ''}
                onCustomerCreated={handleCustomerCreated}
             />

            <ShippingMapModal 
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                origin={origin}
                destination={destination}
                isMapsLoaded={isLoaded}
                shippingInfo={shippingInfoForMap}
            />

            {createdOrderNotice && (
                <ShippingCreatedNotice
                    order={createdOrderNotice}
                    secondsLeft={createdOrderNoticeSecondsLeft}
                    onView={() => router.push(`/orders/${createdOrderNotice.id}`)}
                    onClose={() => setCreatedOrderNotice(null)}
                />
            )}
        </div>
    );
}
