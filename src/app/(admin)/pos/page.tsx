

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AlertTriangle } from 'lucide-react';

type OrderItem = Product & { quantity: number };

export default function POSPage() {
    const [selectedBusiness, setSelectedBusiness] = React.useState<Business | null>(null);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [selectedAddress, setSelectedAddress] = React.useState<CustomerAddress | null>(null);
    const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
    
    const [isAddressModalOpen, setIsAddressModalOpen] = React.useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [editingAddress, setEditingAddress] = React.useState<CustomerAddress | null>(null);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);

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
        }
    };

    const handleSelectCustomer = (customer: Customer | null) => {
        setSelectedCustomer(customer);
        setSelectedAddress(null);
        if (!customer) {
            setOrderItems([]);
        }
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
            {/* Customer & Product Selection Column */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Seleccionar Negocio</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">2. Cliente y Dirección</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedBusiness ? (
                             <div className="h-24 flex items-center justify-center text-muted-foreground bg-slate-50 rounded-md">
                                <AlertTriangle className="h-5 w-5 mr-2"/>
                                Primero selecciona un negocio.
                             </div>
                        ) : selectedCustomer ? (
                            <CustomerDisplay 
                                customer={selectedCustomer} 
                                addresses={customerAddresses || []}
                                selectedAddress={selectedAddress}
                                onSelectAddress={setSelectedAddress}
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
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">3. Productos</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                business={selectedBusiness}
                address={selectedAddress}
            />
        </div>
    );
}
