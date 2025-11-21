
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Trash2, Map, Minus } from 'lucide-react';
import { Customer, Product, Business, Order } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { LocationMap } from './map';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoadScript, GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productCategories } from '@/mocks/data';

const libraries: ('places')[] = ['places'];

// --- Customer Search & Display ---

interface CustomerDisplayProps {
    customer: Customer;
    onClear: () => void;
    onShowMap: () => void;
}

export function CustomerDisplay({ customer, onClear, onShowMap }: CustomerDisplayProps) {
    return (
        <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start text-lg">
            <div className="space-y-1">
                <p className="font-semibold text-lg">{customer.firstName} {customer.lastName}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Home className="h-4 w-4" />
                    <span>{customer.mainAddress}</span>
                </div>
            </div>
            <div className="flex items-center gap-1">
                 <Button variant="outline" size="sm" onClick={onShowMap}>
                    <Map className="h-4 w-4 mr-2" />
                    Ver Mapa
                </Button>
                <Button variant="ghost" size="icon" onClick={onClear}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

interface CustomerSearchProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
    onAddNewCustomer: () => void;
}

export function CustomerSearch({ customers, onSelectCustomer, onAddNewCustomer }: CustomerSearchProps) {
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
    lat: z.number({ required_error: "La ubicación en el mapa es requerida." }),
    lng: z.number({ required_error: "La ubicación en el mapa es requerida." }),
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
            coordinates: { lat: data.lat, lng: data.lng },
            orderCount: 0,
            totalSpent: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onSave(newCustomer);
        methods.reset();
        onClose();
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
                                        methods.setValue('address', address, { shouldValidate: true });
                                        methods.setValue('lat', lat, { shouldValidate: true });
                                        methods.setValue('lng', lng, { shouldValidate: true });
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

// --- Product Grid & Cards ---

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product, quantity: number) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
    const [quantity, setQuantity] = useState(1);

    const handleAdd = () => {
        onAddToCart(product, quantity);
        setQuantity(1); // Reset quantity after adding
    }
    
    return (
        <Card className="overflow-hidden flex flex-col">
            <div className="aspect-video relative">
                <Image 
                    src={product.image_url || 'https://placehold.co/300x200'} 
                    alt={product.name}
                    fill
                    className="object-cover"
                />
            </div>
            <CardContent className="p-3 flex flex-col flex-grow">
                <h4 className="font-semibold truncate text-base flex-grow">{product.name}</h4>
                <div className="mt-2 space-y-3">
                    <p className="text-lg font-bold text-muted-foreground">{formatCurrency(product.price)}</p>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q-1))}><Minus className="h-4 w-4"/></Button>
                        <Input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="h-8 w-12 text-center" min="1"/>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => q+1)}><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                    <Button size="sm" onClick={handleAdd} className="w-full">
                        Agregar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


interface ProductGridProps {
    products: Product[];
    onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar producto..."
                        className="pl-10 h-11 text-base"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px] h-11 text-base">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {productCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
                ))}
            </div>
        </div>
    );
}

// --- Order Cart & Summary ---

type OrderItem = Product & { quantity: number };

interface OrderCartProps {
    items: OrderItem[];
    onUpdateQuantity: (productId: string, quantity: number) => void;
    customer: Customer | null;
    business: Business | null;
}

export function OrderCart({ items, onUpdateQuantity, customer, business }: OrderCartProps) {
    const subtotal = useMemo(() => {
        return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [items]);
    const shippingCost = useMemo(() => {
        // Mock calculation
        return customer && business ? 45.00 : 0;
    }, [customer, business]);
    const total = subtotal + shippingCost;
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <Card className="lg:sticky top-6">
            <CardHeader>
                <CardTitle className="text-xl">3. Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {items.length === 0 ? (
                     <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                        <p>Aún no has agregado productos al pedido.</p>
                    </div>
                ) : (
                    <div className="max-h-64 overflow-y-auto pr-2 space-y-4">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                                <Image src={item.image_url || 'https://placehold.co/48x48'} alt={item.name} width={48} height={48} className="rounded-md object-cover" />
                                <div className="flex-1">
                                    <p className="font-semibold text-sm truncate">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                        className="h-8 w-16 text-center"
                                        min="0"
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onUpdateQuantity(item.id, 0)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="space-y-4">
                    <Separator />
                    <h4 className="font-semibold text-base">Costo de Envío</h4>
                    {business && customer ? (
                        <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Distancia (simulada)</span>
                                <span className="font-semibold">5.2 km</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
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
                 <div className="space-y-2 text-lg">
                    <Separator />
                    <div className="flex justify-between">
                        <span>Subtotal ({totalItems} productos)</span>
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
                <Button size="lg" className="w-full text-lg h-12" disabled={items.length === 0 || !customer}>
                    Crear Pedido
                </Button>
            </CardContent>
        </Card>
    )
}

// -- Shipping Map Modal ---

interface ShippingMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: Business | null;
    customer: Customer | null;
}

export function ShippingMapModal({ isOpen, onClose, business, customer }: ShippingMapModalProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries
    });
    
    const mapCenter = useMemo(() => {
        if (business?.coordinates) return business.coordinates;
        if (customer?.coordinates) return customer.coordinates;
        return { lat: 19.4326, lng: -99.1332 }; // Mexico City
    }, [business, customer]);
    
    const mapBounds = useMemo(() => {
        if (!business?.coordinates || !customer?.coordinates || !isLoaded) return undefined;
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(business.coordinates);
        bounds.extend(customer.coordinates);
        return bounds;
    }, [business, customer, isLoaded]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">Visualización de Ruta</DialogTitle>
                    <DialogDescription>
                        Ubicación del negocio y destino del cliente.
                    </DialogDescription>
                </DialogHeader>
                <div className="h-[60vh] mt-4">
                    {loadError && <div className="text-destructive">Error al cargar el mapa.</div>}
                    {!isLoaded && <div className="h-full w-full bg-muted animate-pulse rounded-md" />}
                    {isLoaded && (
                        <GoogleMap
                            mapContainerClassName="w-full h-full rounded-md"
                            center={mapCenter}
                            onLoad={map => mapBounds && map.fitBounds(mapBounds)}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                            }}
                        >
                            {business?.coordinates && (
                                <MarkerF position={business.coordinates} label="N" title={business.name}/>
                            )}
                            {customer?.coordinates && (
                                <MarkerF position={customer.coordinates} label="C" title={customer.mainAddress}/>
                            )}
                            {business?.coordinates && customer?.coordinates && (
                                <PolylineF 
                                    path={[business.coordinates, customer.coordinates]}
                                    options={{
                                        strokeColor: "#E33739",
                                        strokeOpacity: 0.8,
                                        strokeWeight: 2,
                                    }}
                                />
                            )}
                        </GoogleMap>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
