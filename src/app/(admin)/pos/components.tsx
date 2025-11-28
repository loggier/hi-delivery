

"use client";

import React, { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Trash2, Map, Minus, Loader2, Edit, CheckCircle, AlertCircle, Timer, Building, ArrowRight, Package } from 'lucide-react';
import { Customer, Product, Business, Order, CustomerAddress, Plan, SystemSettings, OrderItem as OrderItemType, OrderPayload } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormMessage } from '@/components/ui/form';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { LocationMap } from './map';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoadScript, GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { newCustomerSchema, customerAddressSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const libraries: ('places')[] = ['places'];

// --- Customer Search & Display ---

interface CustomerDisplayProps {
    customer: Customer;
    addresses: CustomerAddress[];
    selectedAddress: CustomerAddress | null;
    onSelectAddress: (address: CustomerAddress) => void;
    onClearCustomer: () => void;
    onShowMap: () => void;
    onAddAddress: () => void;
    onEditAddress: (address: CustomerAddress) => void;
    isLoadingAddresses: boolean;
}

export function CustomerDisplay({
    customer, addresses, selectedAddress, onSelectAddress, onClearCustomer, onShowMap, onAddAddress, onEditAddress, isLoadingAddresses
}: CustomerDisplayProps) {
    return (
        <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 flex justify-between items-start text-base">
                <div className="space-y-1">
                    <p className="font-semibold text-lg">{customer.first_name} {customer.last_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={onClearCustomer}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium text-base">Direcciones Guardadas</h4>
                    <Button variant="outline" size="sm" onClick={onAddAddress}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Añadir Dirección
                    </Button>
                </div>

                {isLoadingAddresses ? (
                    <Skeleton className="h-20 w-full" />
                ) : addresses.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg p-4">
                        Este cliente no tiene direcciones guardadas.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {addresses.map(addr => (
                            <div
                                key={addr.id}
                                onClick={() => onSelectAddress(addr)}
                                className={cn(
                                    "w-full text-left p-3 border rounded-lg flex justify-between items-center transition-colors cursor-pointer",
                                    selectedAddress?.id === addr.id
                                        ? "bg-primary/10 border-primary"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {selectedAddress?.id === addr.id && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0"/>}
                                    <p className="text-sm">{addr.address}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); onEditAddress(addr)}}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
             <Button variant="outline" size="sm" onClick={onShowMap} disabled={!selectedAddress}>
                <Map className="h-4 w-4 mr-2" />
                Ver Ruta en Mapa
            </Button>
        </div>
    );
}

interface CustomerSearchProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer | null) => void;
    onAddNewCustomer: () => void;
    disabled?: boolean;
}

export function CustomerSearch({ customers, onSelectCustomer, onAddNewCustomer, disabled = false }: CustomerSearchProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    
    const filteredCustomers = useMemo(() => {
        if (!query) return [];
        return customers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(query)
        );
    }, [query, customers]);

    const handleSelect = (customer: Customer) => {
        setQuery('');
        onSelectCustomer(customer);
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar cliente por nombre o teléfono..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        className="w-full pl-10 h-12 text-base"
                        disabled={disabled}
                    />
                </div>
                 <Button variant="outline" onClick={onAddNewCustomer}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                </Button>
            </div>
             {isFocused && query && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                            <div key={c.id} onMouseDown={() => handleSelect(c)} className="p-3 hover:bg-slate-100 cursor-pointer">
                                <p className="font-semibold">{c.first_name} {c.last_name}</p>
                                <p className="text-sm text-muted-foreground">{c.phone}</p>
                            </div>
                        ))
                    ) : (
                        <p className="p-3 text-sm text-muted-foreground">No se encontraron clientes.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Customer Creation Modal ---

const newCustomerFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es requerido." }),
  lastName: z.string().min(2, { message: "El apellido es requerido." }),
  phone: z.string().min(10, { message: "El teléfono debe tener al menos 10 dígitos." }),
  email: z.string().email({ message: "El email no es válido." }).optional().or(z.literal('')),
});
type NewCustomerFormValues = z.infer<typeof newCustomerFormSchema>;

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated: (customer: Customer) => void;
}

export function CustomerFormModal({ isOpen, onClose, onCustomerCreated }: CustomerFormModalProps) {
    const createCustomerMutation = api.customers.useCreate();
    
    const methods = useForm<NewCustomerFormValues>({
        resolver: zodResolver(newCustomerFormSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phone: '',
            email: ''
        },
    });

    const onSubmit = async (data: NewCustomerFormValues) => {
        try {
            const newCustomer = await createCustomerMutation.mutateAsync(data as any);
            if(newCustomer) {
                methods.reset();
                onCustomerCreated(newCustomer as Customer);
            }
        } catch(e) {
            // error is handled by mutation hook
        }
    };
    
    const isSubmitting = createCustomerMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { methods.reset(); onClose(); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Nuevo Cliente</DialogTitle>
                </DialogHeader>
                <FormProvider {...methods}>
                    <Form {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                             <FormInput name="firstName" label="Nombre(s)" placeholder="Juan"/>
                             <FormInput name="lastName" label="Apellido(s)" placeholder="Pérez" />
                             <FormInput name="phone" label="Teléfono" type="tel" placeholder="5512345678" />
                             <FormInput name="email" label="Email (Opcional)" type="email" placeholder="juan.perez@email.com"/>
                             <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Crear Cliente
                                </Button>
                            </div>
                        </form>
                    </Form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}

// --- Customer Address Creation/Edit Modal ---

type AddressFormValues = z.infer<typeof customerAddressSchema>;

interface AddressFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId?: string;
    addressToEdit: CustomerAddress | null;
}

export function AddressFormModal({ isOpen, onClose, customerId, addressToEdit }: AddressFormModalProps) {
    const methods = useForm<AddressFormValues>({
        resolver: zodResolver(customerAddressSchema),
    });
    
    const createAddressMutation = api["customer-addresses"].useCreate();
    const updateAddressMutation = api["customer-addresses"].useUpdate();

    useEffect(() => {
        if (addressToEdit) {
            methods.reset({ ...addressToEdit, customer_id: addressToEdit.customer_id });
        } else if (customerId) {
            methods.reset({ customer_id: customerId, address: '', latitude: 19.4326, longitude: -99.1332 });
        }
    }, [addressToEdit, customerId, methods]);

    const onSubmit = async (data: AddressFormValues) => {
        if (!data.customer_id) {
            console.error("Customer ID is missing");
            return;
        }

        try {
            if (addressToEdit) {
                await updateAddressMutation.mutateAsync({ ...data, id: addressToEdit.id });
            } else {
                await createAddressMutation.mutateAsync(data as any);
            }
            onClose();
        } catch (error) {
            // Error is handled by useMutation hook
        }
    };
    
    const isSubmitting = createAddressMutation.isPending || updateAddressMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{addressToEdit ? "Editar Dirección" : "Nueva Dirección"}</DialogTitle>
                </DialogHeader>
                <FormProvider {...methods}>
                    <Form {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                            <div>
                                <LocationMap
                                    onLocationSelect={({ address, lat, lng, city, state, zip_code, neighborhood }) => {
                                        methods.setValue('address', address, { shouldValidate: true });
                                        methods.setValue('latitude', lat, { shouldValidate: true });
                                        methods.setValue('longitude', lng, { shouldValidate: true });
                                        if (city) methods.setValue('city', city);
                                        if (state) methods.setValue('state', state);
                                        if (zip_code) methods.setValue('zip_code', zip_code);
                                        if (neighborhood) methods.setValue('neighborhood', neighborhood);
                                    }}
                                />
                                <FormField control={methods.control} name="latitude" render={() => <FormMessage/>} />
                                <FormInput name="address" label="Dirección Completa" placeholder="Calle, número, colonia, etc." className="mt-4" />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Guardar Dirección
                                </Button>
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
            <div className="aspect-square relative">
                <Image 
                    src={product.image_url || 'https://placehold.co/300x300'} 
                    alt={product.name}
                    fill
                    className="object-cover"
                />
            </div>
            <CardContent className="p-3 flex flex-col flex-grow">
                <h4 className="font-semibold truncate text-base flex-grow">{product.name}</h4>
                <div className="mt-2 space-y-3">
                    <p className="text-lg font-bold text-muted-foreground">{formatCurrency(product.price)}</p>
                    <div className="space-y-2">
                         <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q-1))}><Minus className="h-4 w-4"/></Button>
                            <Input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="h-8 w-12 text-center" min="1"/>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => q+1)}><PlusCircle className="h-4 w-4"/></Button>
                        </div>
                        <Button size="sm" onClick={handleAdd} className="w-full">
                            Agregar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


interface ProductGridProps {
    products: Product[];
    onAddToCart: (product: Product, quantity: number) => void;
    isLoading: boolean;
    disabled?: boolean;
}

export function ProductGrid({ products, onAddToCart, isLoading, disabled = false }: ProductGridProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    const { data: categories } = api.product_categories.useGetAll();

    const filteredProducts = useMemo(() => {
        return (products || []).filter(p => {
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
                        disabled={disabled}
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={disabled}>
                    <SelectTrigger className="w-[200px] h-11 text-base">
                        <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                     {Array.from({length: 5}).map((_, i) => <Card key={i} className="h-64"><CardContent className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></CardContent></Card>)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(p => (
                        <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Order Cart & Summary ---

interface ShippingInfo {
    distance: number;
    duration: string;
    cost: number;
}

const useShippingCalculation = (business: Business | null, address: CustomerAddress | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '');

    useEffect(() => {
        if (isMapsLoaded && business?.latitude && business?.longitude && address?.latitude && address?.longitude && plan) {
            setIsLoading(true);
            setError(null);
            
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route({
                origin: { lat: business.latitude, lng: business.longitude },
                destination: { lat: address.latitude, lng: address.longitude },
                travelMode: window.google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                setIsLoading(false);
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                    const route = result.routes[0].legs[0];
                    if (route.distance && route.duration) {
                        const distanceInKm = route.distance.value / 1000;
                        
                        let cost = plan.rider_fee;
                        if (distanceInKm > plan.min_distance) {
                            const extraKm = distanceInKm - plan.min_distance;
                            cost += extraKm * plan.fee_per_km;
                        }

                        setShippingInfo({
                            distance: distanceInKm,
                            duration: route.duration.text,
                            cost: Math.max(cost, plan.min_shipping_fee)
                        });
                    }
                } else {
                    setError("No se pudo calcular la ruta. Verifica las direcciones.");
                    setShippingInfo(null);
                }
            });
        } else {
            setShippingInfo(null);
            setError(null);
        }
    }, [business, address, isMapsLoaded, plan]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan, error };
}


interface OrderCartProps {
    items: OrderItemType[];
    onUpdateQuantity: (productId: string, quantity: number) => void;
    customer: Customer | null;
    business: Business | null;
    address: CustomerAddress | null;
    isMapsLoaded: boolean;
    onOrderCreated: () => void;
}

export function OrderCart({ items, onUpdateQuantity, customer, business, address, isMapsLoaded, onOrderCreated }: OrderCartProps) {
    const { toast } = useToast();
    const createOrderMutation = api.orders.useCreate();
    const { shippingInfo, isLoading: isLoadingShipping, error: shippingError } = useShippingCalculation(business, address, isMapsLoaded);

    const subtotal = useMemo(() => {
        return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [items]);
    
    const total = subtotal + (shippingInfo?.cost || 0);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    const handleCreateOrder = async () => {
        if (!business || !customer || !address || !shippingInfo) return;

        const orderData: OrderPayload = {
            business_id: business.id,
            customer_id: customer.id,
            items: items.map(item => ({ product_id: item.id, quantity: item.quantity, price: item.price })),
            pickup_address: {
                text: business.address_line,
                coordinates: { lat: business.latitude || 0, lng: business.longitude || 0 }
            },
            delivery_address: {
                text: address.address,
                coordinates: { lat: address.latitude, lng: address.longitude }
            },
            customer_name: `${customer.first_name} ${customer.last_name}`,
            customer_phone: customer.phone,
            subtotal: subtotal,
            delivery_fee: shippingInfo.cost,
            order_total: total,
            distance: shippingInfo.distance,
        };

        try {
            await createOrderMutation.mutateAsync(orderData as any);
            onOrderCreated();
        } catch (e) {
            // Error is handled by the mutation hook
        }
    }

    const isSubmitting = createOrderMutation.isPending;

    return (
        <Card className="lg:sticky top-6">
            <CardHeader>
                <CardTitle className="text-xl">4. Resumen del Pedido</CardTitle>
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
                    {business && customer && address ? (
                        <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
                             {isLoadingShipping ? (
                                 <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Calculando...</div>
                             ) : shippingError ? (
                                 <div className="flex items-center text-destructive"><AlertCircle className="mr-2 h-4 w-4"/>{shippingError}</div>
                             ) : shippingInfo ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1"><Map className="h-4 w-4"/>Distancia</div>
                                        <span className="font-semibold">{shippingInfo.distance.toFixed(2)} km</span>
                                    </div>
                                     <div className="flex justify-between items-center mt-1">
                                        <div className="flex items-center gap-1"><Timer className="h-4 w-4"/>Tiempo estimado</div>
                                        <span className="font-semibold">{shippingInfo.duration}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                        <span className="font-semibold">Costo de envío</span>
                                        <span className="font-bold text-primary">{formatCurrency(shippingInfo.cost)}</span>
                                    </div>
                                </>
                             ) : null}
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            Selecciona un negocio, un cliente y una dirección para calcular el envío.
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
                        <span>{formatCurrency(shippingInfo?.cost || 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-2xl font-bold text-primary">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>
                <Button size="lg" className="w-full text-lg h-12" disabled={items.length === 0 || !customer || !business || !address || isSubmitting} onClick={handleCreateOrder}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
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
    address: CustomerAddress | null;
    isMapsLoaded: boolean;
}

export function ShippingMapModal({ isOpen, onClose, business, address, isMapsLoaded }: ShippingMapModalProps) {
    
    const [isModalReady, setIsModalReady] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                setIsModalReady(true);
            }, 150);
            return () => clearTimeout(timer);
        } else {
            setIsModalReady(false);
        }
    }, [isOpen]);
    
    const mapCenter = useMemo(() => {
        if (business?.latitude && business?.longitude) {
            return { lat: business.latitude, lng: business.longitude };
        }
        if (address?.latitude && address?.longitude) {
            return { lat: address.latitude, lng: address.longitude };
        }
        return { lat: 19.4326, lng: -99.1332 }; // Default fallback
    }, [business, address]);

    const mapBounds = useMemo(() => {
        if (!isMapsLoaded || !business?.latitude || !address?.latitude || typeof window === 'undefined') return undefined;
        
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: business.latitude, lng: business.longitude });
        bounds.extend({ lat: address.latitude, lng: address.longitude });
        return bounds;
    }, [business, address, isMapsLoaded]);


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
                    {(!isMapsLoaded || !isModalReady) && <Skeleton className="h-full w-full rounded-md" />}
                    {isMapsLoaded && isModalReady && (
                        <GoogleMap
                            mapContainerClassName="w-full h-full rounded-md"
                            center={mapCenter}
                            onLoad={map => {
                                if (mapBounds) map.fitBounds(mapBounds);
                            }}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                            }}
                        >
                            {business?.latitude && business?.longitude && (
                                <MarkerF position={{ lat: business.latitude, lng: business.longitude }} label="N" title={business.name}/>
                            )}
                             {address?.latitude && address?.longitude && (
                                <MarkerF position={{ lat: address.latitude, lng: address.longitude }} label="C" title={address.address}/>
                            )}
                            {business?.latitude && address?.latitude && (
                                <PolylineF
                                    path={[{ lat: business.latitude, lng: business.longitude }, { lat: address.latitude, lng: address.longitude }]}
                                    options={{ strokeColor: 'hsl(var(--hid-primary))', strokeWeight: 3 }}
                                />
                            )}
                        </GoogleMap>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

