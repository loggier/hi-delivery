
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
    CustomerSearch, 
    AddressFormModal,
    CustomerDisplay,
    ProductGrid,
    OrderCart,
    ShippingMapModal,
    CustomerFormModal
} from './components';
import { type Customer, type Product, type Business, type CustomerAddress } from '@/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, ChevronDown, ChevronUp, User, Home } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLoadScript } from '@react-google-maps/api';

type OrderItem = Product & { quantity: number };
const libraries: ('places')[] = ['places'];

export default function POSPage() {
    const [selectedBusiness, setSelectedBusiness] = React.useState<Business | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [selectedAddress, setSelectedAddress] = React.useState<CustomerAddress | null>(null);
    const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
    
    const [isBusinessOpen, setIsBusinessOpen] = React.useState(true);
    const [isCustomerOpen, setIsCustomerOpen] = React.useState(true);
    const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll({ status: 'ACTIVE' });
    const { data: products, isLoading: isLoadingProducts } = api.products.useGetAll({ business_id: selectedBusiness?.id });
    const { data: customers, isLoading: isLoadingCustomers } = api.customers.useGetAll();
    const { data: customerAddresses, isLoading: isLoadingAddresses } = api.customer_addresses.useGetAll({ customer_id: selectedCustomer?.id });
    
    const handleSelectBusiness = (businessId: string) => {
        const business = businesses?.find(b => b.id === businessId);
        if (business) {
            setSelectedBusiness(business);
            setSelectedCustomer(null);
            setSelectedAddress(null);
            setOrderItems([]);
            setIsBusinessOpen(false); // Collapse on selection
            setIsCustomerOpen(true);
        }
    };

    const handleSelectCustomer = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setSelectedAddress(null);
        if (!customer) {
            setOrderItems([]);
        }
    }

    const handleSelectAddress = (address: CustomerAddress) => {
        setSelectedAddress(address);
        setIsCustomerOpen(false); // Collapse on selection
    }
    
    const addProductToOrder = (product: Product, quantity: number) => {
        setOrderItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevItems, { ...product, quantity }];
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        setOrderItems((prevItems) => {
            if (quantity <= 0) {
                return prevItems.filter((item) => item.id !== productId);
            }
            return prevItems.map((item) =>
                item.id === productId ? { ...item, quantity } : item
            );
        });
    };

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
            {/* Main Content Column */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                
                {/* Step 1: Business Selection (Collapsible) */}
                 <Card>
                    <Collapsible open={isBusinessOpen} onOpenChange={setIsBusinessOpen}>
                        <CollapsibleTrigger asChild>
                            <div className={cn("flex justify-between items-center p-4 cursor-pointer rounded-t-lg", isBusinessOpen && "border-b")}>
                                <div className="flex items-center gap-3">
                                    <Building className="h-6 w-6" />
                                    <div className="flex flex-col text-left">
                                        <h3 className="font-semibold text-xl">
                                            {selectedBusiness ? `Paso 1: Negocio Seleccionado` : `Paso 1: Seleccionar Negocio`}
                                        </h3>
                                        {selectedBusiness && <span className="text-primary font-medium">{selectedBusiness.name}</span>}
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
                                    <Select onValueChange={handleSelectBusiness} value={selectedBusiness?.id}>
                                        <SelectTrigger className="h-12 text-base">
                                            <SelectValue placeholder="Elige un negocio para empezar a vender..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {businesses?.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                {/* Step 2: Customer Selection (Collapsible) */}
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
                                            {selectedCustomer ? `Paso 2: Cliente y Dirección` : `Paso 2: Buscar Cliente`}
                                        </h3>
                                        {selectedCustomer && (
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm">
                                                <span className="text-primary font-medium">{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                                                {selectedAddress && (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Home className="h-3 w-3 sm:block hidden"/>
                                                        <span className="truncate max-w-[200px] sm:max-w-xs">{selectedAddress.address}</span>
                                                    </div>
                                                )}
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
                                        disabled={isLoadingCustomers || !selectedBusiness}
                                    />
                                )}
                           </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                {/* Step 3: Product Grid */}
                <Card>
                    <CardContent className="p-4">
                       <ProductGrid 
                            products={products || []} 
                            onAddToCart={addProductToOrder}
                            isLoading={isLoadingProducts}
                            disabled={!selectedBusiness}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Order Summary Column */}
            <div className="col-span-1">
                <OrderCart 
                    items={orderItems}
                    onUpdateQuantity={updateQuantity}
                    customer={selectedCustomer}
                    business={selectedBusiness}
                    address={selectedAddress}
                    isMapsLoaded={isLoaded}
                />
            </div>

            {/* Modals */}
            {selectedCustomer && isLoaded && (
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
                business={selectedBusiness}
                address={selectedAddress}
                isMapsLoaded={isLoaded}
            />
        </div>
    );
}
