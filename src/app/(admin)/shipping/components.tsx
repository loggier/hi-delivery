

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Loader2, Edit, AlertCircle, Timer, Building, Package, Route, Map } from 'lucide-react';
import { Customer, Business, CustomerAddress } from '@/types';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleMap, Autocomplete, MarkerF, Polyline } from '@react-google-maps/api';
import { api } from '@/lib/api';
import { newCustomerSchema, customerAddressSchema } from '@/lib/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationPoint } from './page';
import { Textarea } from '@/components/ui/textarea';

const libraries: ('places')[] = ['places'];
const OSRM_ROUTE_URL = process.env.NEXT_PUBLIC_OSRM_ROUTE_URL || 'https://nominatim.vemontech.com/route/v1/driving';

type LatLng = { lat: number; lng: number };

interface WoosmapRoutePath {
    provider: 'osrm';
    polyline: string;
    points: LatLng[];
    distance: number;
    duration_seconds: number;
}

function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += deltaLng;

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
}

function formatDurationFromSeconds(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.max(1, Math.round((totalSeconds % 3600) / 60));
    if (hours > 0) return `${hours} h ${minutes} min`;
    return `${minutes} min`;
}

function extractNumericValue(value: any): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === 'object') {
        return extractNumericValue(value.value ?? value.amount ?? value.distance ?? value.duration);
    }
    return 0;
}

function haversineDistanceMeters(a: LatLng, b: LatLng): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchOsrmRoute(origin: LatLng, destination: LatLng) {
    const url = `${OSRM_ROUTE_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline&steps=false`;
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok || payload?.code !== 'Ok' || !payload?.routes?.[0]) {
        throw new Error(payload?.message || 'OSRM route unavailable');
    }

    const route = payload.routes[0];
    const polyline = route.geometry || '';
    const points = polyline ? decodePolyline(polyline) : [origin, destination];
    return {
        polyline,
        points,
        distance: extractNumericValue(route.distance),
        durationSeconds: extractNumericValue(route.duration),
    };
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
    isMapsLoaded: boolean;
}

export function AddressFormModal({ isOpen, onClose, customerId, addressToEdit, isMapsLoaded }: AddressFormModalProps) {
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
                                    isMapsLoaded={isMapsLoaded}
                                    onLocationSelect={({ address, lat, lng, city, state, zip_code, neighborhood }) => {
                                        methods.setValue('address', address, { shouldValidate: true });
                                        methods.setValue('latitude', lat, { shouldValidate: true });
                                        methods.setValue('longitude', lng, { shouldValidate: true });
                                        if (city) methods.setValue('city', city, { shouldValidate: true });
                                        if (state) methods.setValue('state', state, { shouldValidate: true });
                                        if (zip_code) methods.setValue('zip_code', zip_code, { shouldValidate: true });
                                        if (neighborhood) methods.setValue('neighborhood', neighborhood, { shouldValidate: true });
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
    isMapsLoaded: boolean;
    onLocationSelect: (location: { address: string, lat: number, lng: number, city: string, state: string, zip_code: string, neighborhood: string }) => void;
}

export function LocationMap({ isMapsLoaded, onLocationSelect }: LocationMapProps) {
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

    if (!isMapsLoaded) return <Skeleton className="h-96 w-full" />;

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
    shippingInfo: ShippingInfo | null;
}

export function ShippingMapModal({ isOpen, onClose, origin, destination, isMapsLoaded, shippingInfo }: ShippingMapModalProps) {
    
    const [isModalReady, setIsModalReady] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const [osrmRoutePoints, setOsrmRoutePoints] = useState<LatLng[]>([]);

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
        if (!isMapsLoaded || typeof window === 'undefined') return undefined;

        const bounds = new window.google.maps.LatLngBounds();
        const routePoints = shippingInfo?.routePath?.points?.length
            ? shippingInfo.routePath.points
            : osrmRoutePoints;

        if (routePoints.length > 0) {
            routePoints.forEach((point) => bounds.extend(point));
            return bounds;
        }

        if (origin) bounds.extend({ lat: origin.lat, lng: origin.lng });
        if (destination) bounds.extend({ lat: destination.lat, lng: destination.lng });

        if (bounds.isEmpty()) return undefined;
        return bounds;
    }, [origin, destination, shippingInfo?.routePath?.points, osrmRoutePoints, isMapsLoaded]);

    useEffect(() => {
        if (isModalReady && mapRef.current && mapBounds) {
            mapRef.current.fitBounds(mapBounds);
        }
    }, [isModalReady, mapBounds]);

    useEffect(() => {
        if (!isOpen) {
            setOsrmRoutePoints([]);
            return;
        }
        if (shippingInfo?.routePath?.points?.length) return;
        if (!origin || !destination) return;

        let cancelled = false;
        void (async () => {
            try {
                const osrm = await fetchOsrmRoute(origin, destination);
                if (!cancelled) {
                    setOsrmRoutePoints(osrm.points);
                }
            } catch {
                if (!cancelled) {
                    setOsrmRoutePoints([origin, destination]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, shippingInfo?.routePath?.points, origin, destination]);

    const displayedRoutePoints = shippingInfo?.routePath?.points?.length ? shippingInfo.routePath.points : osrmRoutePoints;


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
                                mapRef.current = map;
                                if (mapBounds) map.fitBounds(mapBounds);
                            }}
                            options={{
                                disableDefaultUI: true,
                                zoomControl: true,
                            }}
                        >
                            {displayedRoutePoints.length > 0 ? (
                                <>
                                    <Polyline
                                        path={displayedRoutePoints}
                                        options={{ strokeColor: '#ffffff', strokeOpacity: 1, strokeWeight: 8, zIndex: 1 }}
                                    />
                                    <Polyline
                                        path={displayedRoutePoints}
                                        options={{
                                            strokeColor: '#0b3a8f',
                                            strokeOpacity: 0,
                                            strokeWeight: 3,
                                            zIndex: 2,
                                            icons: [
                                                {
                                                    icon: {
                                                        path: 'M 0,-1 0,1',
                                                        strokeOpacity: 1,
                                                        strokeColor: '#0b3a8f',
                                                        strokeWeight: 3,
                                                        scale: 3,
                                                    },
                                                    offset: '0',
                                                    repeat: '14px',
                                                },
                                            ],
                                        }}
                                    />
                                    {origin && <MarkerF position={{ lat: origin.lat, lng: origin.lng }} label="O" />}
                                    {destination && <MarkerF position={{ lat: destination.lat, lng: destination.lng }} label="D" />}
                                </>
                            ) : (
                                <>
                                    {origin && <MarkerF position={{ lat: origin.lat, lng: origin.lng }} label="O" />}
                                    {destination && <MarkerF position={{ lat: destination.lat, lng: destination.lng }} label="D" />}
                                </>
                            )}
                        </GoogleMap>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

// --- Shipping Summary ---
export interface ShippingInfo {
    distance: number; // in meters
    duration: string;
    durationSeconds: number;
    cost: number;
    directions: google.maps.DirectionsResult | null;
    routePath: WoosmapRoutePath | null;
}

export const useShippingCalculation = (
    business: Pick<Business, 'id' | 'plan_id'> | null,
    origin: LocationPoint | null,
    destination: LocationPoint | null,
    isMapsLoaded: boolean
): { shippingInfo: ShippingInfo | null, isLoading: boolean, error: string | null } => {
    const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: plan, isLoading: isLoadingPlan } = api.plans.useGetOne(business?.plan_id || '', {
        enabled: !!business?.plan_id,
    });

    useEffect(() => {
        if (isMapsLoaded && origin && destination && plan) {
            setIsLoading(true);
            setError(null);
            let isCancelled = false;

            (async () => {
                try {
                    let distanceInMeters = 0;
                    let durationSeconds = 0;
                    let encodedPolyline = '';

                    try {
                        const osrm = await fetchOsrmRoute(origin, destination);
                        encodedPolyline = osrm.polyline;
                        distanceInMeters = osrm.distance;
                        durationSeconds = osrm.durationSeconds;
                    } catch (osrmError) {
                        // Keep graceful fallback below
                    }

                    if (distanceInMeters <= 0) {
                        distanceInMeters = haversineDistanceMeters(origin, destination);
                    }
                    if (durationSeconds <= 0) {
                        const avgUrbanSpeedKmh = 28;
                        durationSeconds = Math.max(60, Math.round((distanceInMeters / 1000 / avgUrbanSpeedKmh) * 3600));
                    }

                    const distanceInKm = distanceInMeters / 1000;
                    let cost = plan.rider_fee;
                    if (distanceInKm > plan.min_distance) {
                        const extraKm = distanceInKm - plan.min_distance;
                        cost += extraKm * plan.fee_per_km;
                    }

                    const routePath: WoosmapRoutePath = {
                        provider: 'osrm',
                        polyline: encodedPolyline,
                        points: encodedPolyline ? decodePolyline(encodedPolyline) : [origin, destination],
                        distance: distanceInMeters,
                        duration_seconds: durationSeconds,
                    };

                    if (!isCancelled) {
                        setShippingInfo({
                            distance: distanceInMeters,
                            duration: formatDurationFromSeconds(durationSeconds),
                            durationSeconds,
                            cost: Math.max(cost, plan.min_shipping_fee),
                            directions: null,
                            routePath,
                        });
                    }
                } catch (calcError) {
                    if (!isCancelled) {
                        setError("No se pudo calcular la ruta.");
                        setShippingInfo(null);
                    }
                } finally {
                    if (!isCancelled) setIsLoading(false);
                }
            })();

            return () => {
                isCancelled = true;
            };
        } else {
            setShippingInfo(null);
            setError(
                !business
                    ? "Debes seleccionar un negocio para calcular el envío."
                    : !plan && !isLoadingPlan && business?.plan_id
                      ? "El negocio no tiene un plan válido para calcular el envío."
                      : null
            );
        }
    }, [business, origin, destination, plan, isMapsLoaded, isLoadingPlan]);

    return { shippingInfo, isLoading: isLoading || isLoadingPlan, error };
}

interface ShippingSummaryProps {
    business: Business | null;
    customer: Customer | null;
    origin: LocationPoint | null;
    destination: LocationPoint | null;
    packageDescription: string;
    isMapsLoaded: boolean;
    onCreateShipping: (payload: { shippingInfo: ShippingInfo }) => void;
    isCreating: boolean;
    onOpenMap: (shippingInfo: ShippingInfo) => void;
}

export function ShippingSummary({
    business,
    customer,
    origin,
    destination,
    packageDescription,
    isMapsLoaded,
    onCreateShipping,
    isCreating,
    onOpenMap,
}: ShippingSummaryProps) {
    const { shippingInfo, isLoading: isLoadingShipping, error: shippingError } = useShippingCalculation(
        business ? { id: business.id, plan_id: business.plan_id } : null,
        origin,
        destination,
        isMapsLoaded
    );

    const isReadyToCreate =
        !!business &&
        !!customer &&
        !!origin &&
        !!destination &&
        !!packageDescription.trim() &&
        !!shippingInfo &&
        !isLoadingShipping &&
        !isCreating;

    return (
        <Card className="lg:sticky top-6">
            <CardHeader>
                <CardTitle className="text-xl">5. Resumen del Envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <Building className="h-5 w-5 text-slate-500 mt-1" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Negocio</p>
                            <p className="font-medium">{business?.name || 'No seleccionado'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-slate-500 mt-1" />
                        <div>
                            <p className="text-sm font-medium text-slate-500">Cliente</p>
                            <p className="font-medium">
                                {customer ? `${customer.first_name} ${customer.last_name}` : 'No seleccionado'}
                            </p>
                        </div>
                    </div>
                 </div>

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
                                        <span className="font-semibold">{(shippingInfo.distance / 1000).toFixed(2)} km</span>
                                    </div>
                                     <div className="flex justify-between items-center mt-1">
                                        <div className="flex items-center gap-1"><Timer className="h-4 w-4"/>Tiempo estimado</div>
                                        <span className="font-semibold">{shippingInfo.duration}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t text-lg">
                                        <span className="font-semibold">Costo de envío</span>
                                        <span className="font-bold text-primary">{formatCurrency(shippingInfo.cost)}</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-3 w-full"
                                        onClick={() => shippingInfo && onOpenMap(shippingInfo)}
                                    >
                                        <Route className="mr-2 h-4 w-4" />
                                        Ver ruta
                                    </Button>
                                </>
                             ) : null}
                        </div>
                    ) : (
                        <div className="text-muted-foreground text-sm">
                            Selecciona un origen y un destino para calcular el envío.
                        </div>
                    )}
                </div>
                
                <Button
                    size="lg"
                    className="w-full text-lg h-12"
                    disabled={!isReadyToCreate}
                    onClick={() => shippingInfo && onCreateShipping({ shippingInfo })}
                >
                    {isCreating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Crear Envío
                </Button>
            </CardContent>
        </Card>
    )
}
