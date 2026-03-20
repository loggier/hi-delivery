

"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { type Business, type Customer, type CustomerAddress, type OrderPayload } from '@/types';
import { api } from '@/lib/api';
import { Building, ChevronDown, ChevronUp, User, Home, Package, Store } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoadScript } from '@react-google-maps/api';
import { CustomerSearch, AddressFormModal, CustomerDisplay, CustomerFormModal, ShippingMapModal, LocationSelector, PackageDetails, ShippingSummary } from './components';
import { useAuthStore } from '@/store/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

const libraries: ('places')[] = ['places'];
export type LocationPoint = { address: string; lat: number; lng: number };

export default function ShippingPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const isBusinessOwner = user?.role_id === 'role-owner' || user?.role?.name === 'Dueño de Negocio';

    const [selectedBusiness, setSelectedBusiness] = React.useState<Business | null>(null);
    const [origin, setOrigin] = React.useState<LocationPoint | null>(null);
    const [destination, setDestination] = React.useState<LocationPoint | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [packageDescription, setPackageDescription] = React.useState('');
    
    const [isBusinessOpen, setIsBusinessOpen] = React.useState(!isBusinessOwner);
    const [isOriginOpen, setIsOriginOpen] = React.useState(isBusinessOwner);
    const [isDestinationOpen, setIsDestinationOpen] = React.useState(false);
    const [isPackageOpen, setIsPackageOpen] = React.useState(false);

    const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

    const createOrderMutation = api.orders.useCreate();

    const { isLoaded } = useLoadScript({
        id: "hi-delivery-shipping-google-maps",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const { data: businessesData, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({
        status: 'ACTIVE',
        id: isBusinessOwner ? user?.business_id : undefined,
    });
    const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();
    const { data: customerAddresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: selectedCustomer?.id });

    React.useEffect(() => {
        if (isBusinessOwner && businessesData && businessesData.length > 0 && !selectedBusiness) {
            setSelectedBusiness(businessesData[0]);
            setIsBusinessOpen(false);
            setIsOriginOpen(true);
        }
    }, [isBusinessOwner, businessesData, selectedBusiness]);

    const handleSelectBusiness = (businessId: string) => {
        const business = businessesData?.find((item) => item.id === businessId) || null;
        setSelectedBusiness(business);
        setOrigin(null);
        setDestination(null);
        setSelectedCustomer(null);
        setPackageDescription('');
        setIsBusinessOpen(false);
        setIsOriginOpen(true);
        setIsDestinationOpen(false);
        setIsPackageOpen(false);
    };
    
    const handleSelectCustomer = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setDestination(null);
    }

    const handleSelectAddress = (address: CustomerAddress) => {
        setDestination({
            address: address.address,
            lat: address.latitude,
            lng: address.longitude,
        });
        setIsDestinationOpen(false);
        setIsPackageOpen(true);
    }
    
    const handleOpenAddressModal = (address: CustomerAddress | null = null) => {
        setEditingAddress(address);
        setIsAddressModalOpen(true);
    }
    
    const handleCustomerCreated = (newCustomer: Customer) => {
        setSelectedCustomer(newCustomer);
        setIsCustomerModalOpen(false);
    };

    const handleCreateShipping = ({ shippingInfo }: { shippingInfo: { cost: number; distance: number; directions: google.maps.DirectionsResult | null } }) => {
        if (!selectedBusiness || !selectedCustomer || !origin || !destination || !packageDescription.trim()) {
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
            subtotal: 0,
            delivery_fee: shippingInfo.cost,
            order_total: shippingInfo.cost,
            distance: shippingInfo.distance,
            route_path: shippingInfo.directions,
        };

        createOrderMutation.mutate(orderPayload, {
            onSuccess: (createdOrder) => {
                router.push(`/orders/${createdOrder.id}`);
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
                    <Collapsible open={isOriginOpen} onOpenChange={setIsOriginOpen} disabled={!selectedBusiness}>
                        <CollapsibleTrigger asChild>
                            <div className={cn("flex justify-between items-center p-4 cursor-pointer rounded-t-lg", isOriginOpen && "border-b", !selectedBusiness && "opacity-50 cursor-not-allowed")}>
                                <div className="flex items-center gap-3">
                                    <Building className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                        <h3 className="font-semibold text-xl">
                                            Paso 2: Origen del Envío
                                        </h3>
                                        {origin && <span className="text-primary font-medium truncate max-w-xs sm:max-w-md">{origin.address}</span>}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    {isOriginOpen ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                             <CardContent className="pt-4">
                                <LocationSelector 
                                    isLoaded={isLoaded}
                                    onLocationSelect={(loc) => {
                                        setOrigin(loc);
                                        setIsOriginOpen(false);
                                        setIsDestinationOpen(true);
                                    }}
                                    title="Buscar dirección de origen"
                                />
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                <Card>
                    <Collapsible open={isDestinationOpen} onOpenChange={setIsDestinationOpen} disabled={!selectedBusiness || !origin}>
                         <CollapsibleTrigger asChild disabled={!selectedBusiness || !origin}>
                           <div className={cn(
                                "flex justify-between items-center p-4 cursor-pointer rounded-t-lg", 
                                isDestinationOpen && "border-b",
                                (!selectedBusiness || !origin) && "opacity-50 cursor-not-allowed"
                            )}>
                                <div className="flex items-center gap-3">
                                    <User className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                         <h3 className="font-semibold text-xl">
                                            Paso 3: Destino del Envío
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
                                <Button variant="ghost" size="icon" disabled={!selectedBusiness || !origin}>
                                     {isDestinationOpen ? <ChevronUp /> : <ChevronDown />}
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                           <CardContent className="pt-4">
                                {selectedCustomer ? (
                                    <CustomerDisplay 
                                        customer={selectedCustomer} 
                                        addresses={customerAddresses || []}
                                        onSelectAddress={handleSelectAddress}
                                        onClearCustomer={() => handleSelectCustomer(null)}
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
                                        <h3 className="font-semibold text-xl">Paso 4: Detalles del Paquete</h3>
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
                    isMapsLoaded={isLoaded}
                    onCreateShipping={handleCreateShipping}
                    isCreating={createOrderMutation.isPending}
                    onOpenMap={() => setIsMapModalOpen(true)}
                />
            </div>

            {selectedCustomer && (
                <AddressFormModal
                    isOpen={isAddressModalOpen}
                    onClose={() => setIsAddressModalOpen(false)}
                    customerId={selectedCustomer.id}
                    addressToEdit={editingAddress}
                    isMapsLoaded={isLoaded}
                />
            )}
            
             <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onCustomerCreated={handleCustomerCreated}
             />

            <ShippingMapModal 
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                origin={origin}
                destination={destination}
                isMapsLoaded={isLoaded}
            />
        </div>
    );
}
