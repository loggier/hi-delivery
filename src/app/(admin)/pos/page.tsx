"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerSearch, OrderItems, OrderSummary, ProductSearch, CustomerFormModal, ShippingCost } from './components';
import { type Customer, type Product, type Business } from '@/types';
import { customers, products, businesses } from '@/mocks/data';

type OrderItem = Product & { quantity: number };

export default function POSPage() {
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [orderItems, setOrderItems] = React.useState<OrderItem[]>([]);
    const [selectedBusiness] = React.useState<Business | null>(businesses[0]); // Mock selected business
    const [isCustomerModalOpen, setIsCustomerModalOpen] = React.useState(false);

    const addProductToOrder = (product: Product) => {
        setOrderItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === product.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
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

    const subtotal = React.useMemo(() => {
        return orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [orderItems]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-base">
            {/* Customer & Product Selection Column */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">1. Cliente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CustomerSearch
                            customers={customers}
                            onSelectCustomer={setSelectedCustomer}
                            selectedCustomer={selectedCustomer}
                            onAddNewCustomer={() => setIsCustomerModalOpen(true)}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">2. Productos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProductSearch products={products} onSelectProduct={addProductToOrder} />
                        <OrderItems items={orderItems} onUpdateQuantity={updateQuantity} />
                    </CardContent>
                </Card>
            </div>

            {/* Order Summary Column */}
            <div className="col-span-1 lg:sticky top-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">3. Resumen del Pedido</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ShippingCost
                            business={selectedBusiness}
                            customer={selectedCustomer}
                        />
                        <OrderSummary
                            subtotal={subtotal}
                            shippingCost={100} // Mock shipping
                            itemsCount={orderItems.reduce((acc, item) => acc + item.quantity, 0)}
                        />
                    </CardContent>
                </Card>
            </div>

            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleCreateCustomer}
            />
        </div>
    );
}
