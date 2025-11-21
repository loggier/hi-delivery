"use client";

import React, { useRef, useMemo } from 'react';
import { useLoadScript, GoogleMap, Autocomplete } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FormLabel } from '@/components/ui/form';

const libraries: ('places')[] = ['places'];

interface LocationMapProps {
    onLocationSelect: (location: { address: string }) => void;
}

export function LocationMap({ onLocationSelect }: LocationMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const [location, setLocation] = React.useState<{ lat: number, lng: number }>({ lat: 19.4326, lng: -99.1332 });
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const mapCenter = useMemo(() => location, [location]);

    const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setLocation({ lat, lng });
                onLocationSelect({ address: place.formatted_address || '' });
            }
        }
    };

    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setLocation({ lat, lng });
            // You might need a geocoding service here to get address from lat/lng
             onLocationSelect({ address: `Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
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
