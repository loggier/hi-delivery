
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    CustomerSearch, 
    CustomerFormModal,
    CustomerDisplay,
    ProductGrid,
    OrderCart,
    ShippingMapModal
} from './components';
import { type Customer, type Product, type Business } from '@/types';
import { customers, products, businesses } from '@/mocks/data';

type OrderItem = Product & { quantity: number };

export default function POSPage() {
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
    const [selectedBusiness] = React.useState<Business | null>(businesses[0]);
    
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = React.useState(false);
    
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

    const handleCreateCustomer = (newCustomer: Customer) => {
        // In a real app, you'd also save this to the DB. For now, just select it.
        setSelectedCustomer(newCustomer);
        setIsCustomerModalOpen(false);
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-base">
            {/* Customer & Product Selection Column */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedCustomer ? (
                            <CustomerDisplay 
                                customer={selectedCustomer} 
                                onClear={() => setSelectedCustomer(null)}
                                onShowMap={() => setIsMapModalOpen(true)}
                            />
                        ) : (
                            <CustomerSearch
                                customers={customers}
                                onSelectCustomer={setSelectedCustomer}
                                onAddNewCustomer={() => setIsCustomerModalOpen(true)}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">2. Productos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProductGrid products={products} onAddToCart={addProductToOrder} />
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
                />
            </div>

            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleCreateCustomer}
            />

            <ShippingMapModal 
                isOpen={isMapModalOpen}
                onClose={() => setIsMapModalOpen(false)}
                business={selectedBusiness}
                customer={selectedCustomer}
            />
        </div>
    );
}

