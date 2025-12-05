

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Trash2, Map, Minus, Loader2, Edit, CheckCircle, AlertCircle, Timer, Building, ArrowRight, Package } from 'lucide-react';
import { Customer, Product, Business, Order, CustomerAddress, Plan, SystemSettings } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormLabel, FormMessage } from '@/components/ui/form';
import { FormInput } from '@/app/site/apply/_components/form-components';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoadScript, GoogleMap, MarkerF, PolylineF, Autocomplete } from '@react-google-maps/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { newCustomerSchema, customerAddressSchema } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationPoint } from './page';
import { Textarea } from '@/components/ui/textarea';

const libraries: ('places' | 'directions')[] = ['places', 'directions'];

// Haversine formula to calculate distance between two points in km
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Estimate duration based on an average speed
function estimateDuration(distanceInKm: number) {
    const AVERAGE_SPEED_KMPH = 30;
    const timeInHours = distanceInKm / AVERAGE_SPEED_KMPH;
    const timeInMinutes = Math.round(timeInHours * 60);
    if (timeInMinutes < 1) return "1 min";
    return `${timeInMinutes} min`;
}

// --- Location Selector ---
interface LocationSelectorProps {
    isLoaded: boolean;
    onLocationSelect: (location: LocationPoint) => void;
    title: string;
}

export function LocationSelector({ isLoaded, onLocationSelect, title }: LocationSelectorProps) {
    const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place && place.geometry?.location) {
                const newLocation: LocationPoint = {
                    address: place.formatted_address || '',
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                };
                setSelectedLocation(newLocation);
            }
        }
    };
    
    if (!isLoaded) return <Skeleton className="h-20 w-full" />

    return (
        <div className="space-y-4">
            <label className="text-sm font-medium leading-none">{title}</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                        <Input
                            type="text"
                            placeholder="Buscar dirección..."
                            className="w-full pl-10 h-12 text-base"
                        />
                    </Autocomplete>
                </div>
                <Button onClick={() => selectedLocation && onLocationSelect(selectedLocation)} disabled={!selectedLocation}>
                    Confirmar Origen
                </Button>
            </div>
             {selectedLocation && (
                <div className="p-2 border rounded-md bg-slate-50 text-sm text-slate-600">
                    {selectedLocation.address}
                </div>
            )}
        </div>
    );
}

// --- Package Details ---
interface PackageDetailsProps {
    value: string;
    onValueChange: (value: string) => void;
}
export function PackageDetails({ value, onValueChange }: PackageDetailsProps) {
    return (
        <div className="space-y-2">
            <label htmlFor="package-description" className="text-sm font-medium leading-none">Descripción del Paquete</label>
            <Textarea 
                id="package-description"
                placeholder="Ej. Documentos importantes, una caja de zapatos, llaves, etc."
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
            />
        </div>
    )
}

// --- Customer Search & Display ---

interface CustomerDisplayProps {
    customer: Customer;
    addresses: CustomerAddress[];
    onSelectAddress: (address: CustomerAddress) => void;
    onClearCustomer: () => void;
    onAddAddress: () => void;
    onEditAddress: (address: CustomerAddress) => void;
    isLoadingAddresses: boolean;
}

export function CustomerDisplay({
    customer, addresses, onSelectAddress, onClearCustomer, onAddAddress, onEditAddress, isLoadingAddresses
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
                                className="w-full text-left p-3 border rounded-lg flex justify-between items-center transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <div className="flex items-center gap-3">
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

type NewCustomerFormValues = z.infer<typeof newCustomerSchema>;

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated: (customer: Customer) => void;
}

export function CustomerFormModal({ isOpen, onClose, onCustomerCreated }: CustomerFormModalProps) {
    const createCustomerMutation = api.customers.useCreate();
    
    const methods = useForm<NewCustomerFormValues>({
        resolver: zodResolver(newCustomerSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
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
                             <FormInput name="first_name" label="Nombre(s)" placeholder="Juan"/>
                             <FormInput name="last_name" label="Apellido(s)" placeholder="Pérez" />
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
    customerId: string;
    addressToEdit: CustomerAddress | null;
}

export function AddressFormModal({ isOpen, onClose, customerId, addressToEdit }: AddressFormModalProps) {
    const methods = useForm<AddressFormValues>({
        resolver: zodResolver(customerAddressSchema),
    });
    
    const createAddressMutation = api.customer_addresses.useCreate();
    const updateAddressMutation = api.customer_addresses.useUpdate();

    useEffect(() => {
        if (addressToEdit) {
            methods.reset(addressToEdit);
        } else {
            methods.reset({ customer_id: customerId, address: '', latitude: 19.4326, longitude: -99.1332 });
        }
    }, [addressToEdit, customerId, methods]);

    const onSubmit = async (data: AddressFormValues) => {
        try {
            if (addressToEdit) {
                await updateAddressMutation.mutateAsync({ ...data, id: addressToEdit.id });
            } else {
                await createAddressMutation.mutateAsync({ ...data, customer_id: customerId } as any);
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
                                        if (state) methods.setValue('state');
                                        if (zip_code) methods.setValue('zip_code');
                                        if (neighborhood) methods.setValue('neighborhood');
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

interface LocationMapProps {
    onLocationSelect: (location: { address: string, lat: number, lng: number, city: string, state: string, zip_code: string, neighborhood: string }) => void;
}

export function LocationMap({ onLocationSelect }: LocationMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const [location, setLocation] = React.useState<{ lat: number, lng: number }>({ lat: 19.4326, lng: -99.1332 });
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);

    const mapCenter = useMemo(() => location, [location]);

    const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place && place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setLocation({ lat, lng });

                let address = '';
                let neighborhood = '';
                let city = '';
                let state = '';
                let zip_code = '';

                place.address_components?.forEach(component => {
                    const types = component.types;
                    if (types.includes('street_number')) address = `${address} ${component.long_name}`;
                    if (types.includes('route')) address = `${component.long_name}${address ? ' ' + address : ''}`;
                    if (types.includes('sublocality_level_1') || types.includes('neighborhood')) neighborhood = component.long_name;
                    if (types.includes('locality')) city = component.long_name;
                    if (types.includes('administrative_area_level_1')) state = component.short_name;
                    if (types.includes('postal_code')) zip_code = component.long_name;
                });
                
                onLocationSelect({ 
                    address: place.formatted_address || '', 
                    lat, 
                    lng, 
                    city, 
                    state, 
                    zip_code, 
                    neighborhood 
                });
                 if (mapRef.current) {
                    mapRef.current.panTo({ lat, lng });
                    mapRef.current.setZoom(15);
                }
            }
        }
    };
    
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
    }

    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setLocation({ lat, lng });
            // For now, we just pass coordinates. A reverse geocoding API would be needed for full address on click.
            onLocationSelect({ address: `Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng, city: '', state: '', zip_code: '', neighborhood: '' });
        }
    };

    if (loadError) return <div className="text-destructive">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-4">
             <FormLabel>Buscar Dirección</FormLabel>
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <Input type="text" placeholder="Busca la dirección o arrastra el pin en el mapa" className="w-full" />
            </Autocomplete>
            <div className="relative h-80 w-full">
                <GoogleMap
                    mapContainerClassName="h-full w-full rounded-md"
                    center={mapCenter}
                    zoom={15}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{ disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy' }}
                >
                    <MapPin
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -100%)',
                            color: 'hsl(var(--hid-primary))',
                            height: '40px',
                            width: '40px'
                        }}
                    />
                </GoogleMap>
            </div>
        </div>
    );
}

// -- Shipping Map Modal ---

interface ShippingMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    origin: LocationPoint | null;
    destination: LocationPoint | null;
    isMapsLoaded: boolean;
}

export function ShippingMapModal({ isOpen, onClose, origin, destination, isMapsLoaded }: ShippingMapModalProps) {
    
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
        if (origin) return { lat: origin.lat, lng: origin.lng };
        if (destination) return { lat: destination.lat, lng: destination.lng };
        return { lat: 19.4326, lng: -99.1332 }; // Default fallback
    }, [origin, destination]);

    const mapBounds = useMemo(() => {
        if (!isMapsLoaded || !origin || !destination || typeof window === 'undefined') return undefined;
        
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: origin.lat, lng: origin.lng });
        bounds.extend({ lat: destination.lat, lng: destination.lng });
        return bounds;
    }, [origin, destination, isMapsLoaded]);


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">Visualización de Ruta</DialogTitle>
                    <DialogDescription>
                        Ubicación de origen y destino del envío.
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
                            {origin && (
                                <MarkerF position={origin} label="O" title={origin.address}/>
                            )}
                             {destination && (
                                <MarkerF position={destination} label="D" title={destination.address}/>
                            )}
                            {origin && destination && (
                                <PolylineF
                                    path={[origin, destination]}
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

// --- Shipping Summary ---
interface ShippingInfo {
    distance: number;
    duration: string;
    cost: number;
}

const useShippingCalculation = (origin: LocationPoint | null, destination: LocationPoint | null, isMapsLoaded: boolean): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: settings, isLoading: isLoadingSettings } = api.settings.useGet();

    useEffect(() => {
        if (origin && destination && settings) {
            setIsLoading(true);
            setError(null);
            
            try {
                const distanceInKm = getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
                const RIDER_BASE_FEE_PLACEHOLDER = 30;

                let cost = RIDER_BASE_FEE_PLACEHOLDER;
                if (distanceInKm > settings.min_distance_km) {
                    const extraKm = distanceInKm - settings.min_distance_km;
                    cost += extraKm * settings.cost_per_extra_km;
                }

                setShippingInfo({
                    distance: distanceInKm,
                    duration: estimateDuration(distanceInKm),
                    cost: Math.max(cost, settings.min_shipping_amount)
                });
            } catch(e) {
                setError("No se pudo calcular la distancia.");
                setShippingInfo(null);
            } finally {
                setIsLoading(false);
            }
        } else {
            setShippingInfo(null);
            setError(null);
        }
    }, [origin, destination, settings]);

    return { shippingInfo, isLoading: isLoading || isLoadingSettings, error };
}

interface ShippingSummaryProps {
    origin: LocationPoint | null;
    destination: LocationPoint | null;
    packageDescription: string;
    isMapsLoaded: boolean;
}

export function ShippingSummary({ origin, destination, packageDescription, isMapsLoaded }: ShippingSummaryProps) {
    const { shippingInfo, isLoading: isLoadingShipping, error: shippingError } = useShippingCalculation(origin, destination, isMapsLoaded);

    return (
        <Card className="lg:sticky top-6">
            <CardHeader>
                <CardTitle className="text-xl">4. Resumen del Envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Building className="h-5 w-5 text-slate-500 mt-1" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Origen</p>
                            <p className="font-medium">{origin?.address || 'No seleccionado'}</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Home className="h-5 w-5 text-slate-500 mt-1" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Destino</p>
                            <p className="font-medium">{destination?.address || 'No seleccionado'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-slate-500 mt-1" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Contenido</p>
                            <p className="font-medium">{packageDescription || 'No descrito'}</p>
                        </div>
                    </div>
                 </div>

                <div className="space-y-4">
                    <Separator />
                    <h4 className="font-semibold text-base">Costo de Envío</h4>
                    {origin && destination ? (
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
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t text-lg">
                                        <span className="font-semibold">Costo de envío</span>
                                        <span className="font-bold text-primary">{formatCurrency(shippingInfo.cost)}</span>
                                    </div>
                                </>
                             ) : null}
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            Selecciona un origen y un destino para calcular el envío.
                        </div>
                    )}
                </div>
                
                <Button size="lg" className="w-full text-lg h-12" disabled={!origin || !destination || !packageDescription}>
                    Crear Envío
                </Button>
            </CardContent>
        </Card>
    )
}

