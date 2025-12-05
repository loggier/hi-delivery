

"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { type Customer, type CustomerAddress } from '@/types';
import { api } from '@/lib/api';
import { Building, ChevronDown, ChevronUp, User, Home, Package } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoadScript } from '@react-google-maps/api';
import { CustomerSearch, AddressFormModal, CustomerDisplay, CustomerFormModal, ShippingMapModal, LocationSelector, PackageDetails, ShippingSummary } from './components';

const libraries: ('places' | 'directions')[] = ['places', 'directions'];
export type LocationPoint = { address: string; lat: number; lng: number };

export default function ShippingPage() {
    const [origin, setOrigin] = React.useState<LocationPoint | null>(null);
    const [destination, setDestination] = React.useState<LocationPoint | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [packageDescription, setPackageDescription] = React.useState('');
    
    const [isOriginOpen, setIsOriginOpen] = React.useState(true);
    const [isDestinationOpen, setIsDestinationOpen] = React.useState(false);
    const [isPackageOpen, setIsPackageOpen] = React.useState(false);

    const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();
    const { data: customerAddresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: selectedCustomer?.id });
    
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
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-base">
            <div className="col-span-1 lg:col-span-2 space-y-6">
                
                <Card>
                    <Collapsible open={isOriginOpen} onOpenChange={setIsOriginOpen}>
                        <CollapsibleTrigger asChild>
                            <div className={cn("flex justify-between items-center p-4 cursor-pointer rounded-t-lg", isOriginOpen && "border-b")}>
                                <div className="flex items-center gap-3">
                                    <Building className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                        <h3 className="font-semibold text-xl">
                                            Paso 1: Origen del Envío
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
                    <Collapsible open={isDestinationOpen} onOpenChange={setIsDestinationOpen} disabled={!origin}>
                         <CollapsibleTrigger asChild disabled={!origin}>
                           <div className={cn(
                                "flex justify-between items-center p-4 cursor-pointer rounded-t-lg", 
                                isDestinationOpen && "border-b",
                                !origin && "opacity-50 cursor-not-allowed"
                            )}>
                                <div className="flex items-center gap-3">
                                    <User className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                         <h3 className="font-semibold text-xl">
                                            Paso 2: Destino del Envío
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
                                <Button variant="ghost" size="icon" disabled={!origin}>
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
                                        <h3 className="font-semibold text-xl">Paso 3: Detalles del Paquete</h3>
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
                    origin={origin}
                    destination={destination}
                    packageDescription={packageDescription}
                    isMapsLoaded={isLoaded}
                />
            </div>

            {selectedCustomer && (
                <AddressFormModal
                    isOpen={isAddressModalOpen}
                    onClose={() => setIsAddressModalOpen(false)}
                    customerId={selectedCustomer.id}
                    addressToEdit={editingAddress}
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
