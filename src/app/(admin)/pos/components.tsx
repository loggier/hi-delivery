"use client";

import React, { useState, useMemo } from 'react';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Trash2 } from 'lucide-react';
import { Customer, Product, Business, Order } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { LocationMap } from './map';
import Image from 'next/image';

// --- Customer Search & Display ---

interface CustomerSearchProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
    selectedCustomer: Customer | null;
    onAddNewCustomer: () => void;
}

export function CustomerSearch({ customers, onSelectCustomer, selectedCustomer, onAddNewCustomer }: CustomerSearchProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const filteredCustomers = useMemo(() => {
        if (!query) return [];
        return customers.filter(c =>
            `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        );
    }, [query, customers]);

    const handleSelect = (customer: Customer) => {
        setQuery('');
        onSelectCustomer(customer);
    };

    if (selectedCustomer) {
        return (
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-lg">
                <div className="space-y-1">
                    <p className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.mainAddress}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onSelectCustomer(null!)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    className="w-full pl-10 h-12 text-base"
                />
            </div>
            {isFocused && (
                <div className="absolute top-full mt-2 w-full bg-card border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                            <div
                                key={c.id}
                                className="p-3 hover:bg-accent cursor-pointer"
                                onClick={() => handleSelect(c)}
                            >
                                <p className="font-semibold">{c.firstName} {c.lastName}</p>
                                <p className="text-sm text-muted-foreground">{c.phone}</p>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-muted-foreground">
                            No se encontraron clientes.
                        </div>
                    )}
                    <div className="p-2 border-t">
                        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onAddNewCustomer}>
                            <PlusCircle className="h-5 w-5" />
                            Crear Nuevo Cliente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}


// --- Customer Creation Modal ---

const newCustomerSchema = z.object({
    firstName: z.string().min(2, "El nombre es requerido."),
    lastName: z.string().min(2, "El apellido es requerido."),
    phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos."),
    address: z.string().min(5, "La dirección es requerida."),
    lat: z.number().optional(),
    lng: z.number().optional(),
});
type NewCustomerValues = z.infer<typeof newCustomerSchema>;

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
}

export function CustomerFormModal({ isOpen, onClose, onSave }: CustomerFormModalProps) {
    const methods = useForm<NewCustomerValues>({
        resolver: zodResolver(newCustomerSchema),
    });

    const onSubmit = (data: NewCustomerValues) => {
        const newCustomer: Customer = {
            id: `cust_${Date.now()}`,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            mainAddress: data.address,
            orderCount: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onSave(newCustomer);
        methods.reset();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Crear Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <FormProvider {...methods}>
                    <Form {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput name="firstName" label="Nombre" placeholder="Juan" />
                                <FormInput name="lastName" label="Apellido" placeholder="Pérez" />
                                <FormInput name="phone" label="Teléfono" placeholder="5512345678" type="tel" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium mb-2">Dirección</h3>
                                <LocationMap
                                    onLocationSelect={({ address, lat, lng }) => {
                                        methods.setValue('address', address);
                                        methods.setValue('lat', lat);
                                        methods.setValue('lng', lng);
                                    }}
                                />
                                <FormInput name="address" label="Dirección Completa" placeholder="Calle, número, colonia, etc." className="mt-4" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                                <Button type="submit">Guardar Cliente</Button>
                            </div>
                        </form>
                    </Form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

// --- Product Search ---

interface ProductSearchProps {
    products: Product[];
    onSelectProduct: (product: Product) => void;
}

export function ProductSearch({ products, onSelectProduct }: ProductSearchProps) {
    const [query, setQuery] = useState('');

    const filteredProducts = useMemo(() => {
        if (!query) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku?.toLowerCase().includes(query.toLowerCase())
        );
    }, [query, products]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Buscar producto por nombre o SKU..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 h-12 text-base"
                />
            </div>
            {query && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer" onClick={() => onSelectProduct(p)}>
                            <Image src={p.image_url || 'https://placehold.co/64x64'} alt={p.name} width={64} height={64} className="rounded-md object-cover" />
                            <div className="flex-1">
                                <p className="font-semibold">{p.name}</p>
                                <p className="text-sm text-muted-foreground">{p.sku}</p>
                            </div>
                            <p className="font-semibold">{formatCurrency(p.price)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Order Items ---

type OrderItem = Product & { quantity: number };

interface OrderItemsProps {
    items: OrderItem[];
    onUpdateQuantity: (productId: string, quantity: number) => void;
}

export function OrderItems({ items, onUpdateQuantity }: OrderItemsProps) {
    if (items.length === 0) {
        return (
            <div className="mt-6 text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                <p>Aún no has agregado productos al pedido.</p>
            </div>
        );
    }
    return (
        <div className="mt-6 space-y-4">
            {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <Image src={item.image_url || 'https://placehold.co/48x48'} alt={item.name} width={48} height={48} className="rounded-md object-cover" />
                    <div className="flex-1">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="h-9 w-20 text-center"
                            min="0"
                        />
                        <Button variant="ghost" size="icon" onClick={() => onUpdateQuantity(item.id, 0)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// --- Shipping & Summary ---

interface ShippingCostProps {
    business: Business | null;
    customer: Customer | null;
}

export function ShippingCost({ business, customer }: ShippingCostProps) {
    // Mock calculation
    const shippingCost = business && customer ? 45.00 : 0;

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-lg">Costo de Envío</h4>
            {business && customer ? (
                <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-center text-base">
                        <span>Distancia (simulada)</span>
                        <span className="font-semibold">5.2 km</span>
                    </div>
                    <div className="flex justify-between items-center text-lg mt-2">
                        <span className="font-semibold">Costo de envío</span>
                        <span className="font-bold text-primary">{formatCurrency(shippingCost)}</span>
                    </div>
                </div>
            ) : (
                <div className="text-muted-foreground text-sm">
                    Selecciona un negocio y un cliente para calcular el costo de envío.
                </div>
            )}
        </div>
    );
}

interface OrderSummaryProps {
    subtotal: number;
    shippingCost: number;
    itemsCount: number;
}

export function OrderSummary({ subtotal, shippingCost, itemsCount }: OrderSummaryProps) {
    const total = subtotal + shippingCost;
    return (
        <div className="space-y-4">
            <Separator />
            <div className="space-y-2 text-lg">
                <div className="flex justify-between">
                    <span>Subtotal ({itemsCount} productos)</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Envío</span>
                    <span>{formatCurrency(shippingCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-2xl font-bold text-primary">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
            <Button size="lg" className="w-full text-lg h-12" disabled={itemsCount === 0}>
                Crear Pedido
            </Button>
        </div>
    );
}
