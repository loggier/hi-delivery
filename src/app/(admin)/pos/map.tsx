
"use client";

import React, { useRef, useMemo } from 'react';
import { useLoadScript, GoogleMap } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const libraries: ('places')[] = ['places'];
const WOOSMAP_AUTOCOMPLETE_URL = 'https://api.woosmap.com/localities/autocomplete/';
const WOOSMAP_DETAILS_URL = 'https://api.woosmap.com/localities/details';
const WOOSMAP_API_KEY = process.env.NEXT_PUBLIC_WOOSMAP_KEY || '';
const NOMINATIM_BASE_URL = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.vemontech.com';
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const NOMINATIM_REVERSE_URL = `${NOMINATIM_BASE_URL}/reverse`;

type WoosmapSuggestion = {
    public_id: string;
    description: string;
};

function extractCoordinates(detailsData: any, fallbackLat: number, fallbackLng: number) {
    const geometry = detailsData?.geometry || {};
    const location = geometry?.location || {};
    const coordinates = geometry?.coordinates;

    if (typeof location?.lat === 'number' && typeof location?.lng === 'number') {
        return { lat: location.lat, lng: location.lng };
    }
    if (typeof geometry?.lat === 'number' && typeof geometry?.lng === 'number') {
        return { lat: geometry.lat, lng: geometry.lng };
    }
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
        const [lng, lat] = coordinates;
        if (typeof lat === 'number' && typeof lng === 'number') {
            return { lat, lng };
        }
    }
    return { lat: fallbackLat, lng: fallbackLng };
}

function normalizeNominatimAddress(data: any) {
    const address = data?.address || {};
    const city = address.city || address.town || address.village || '';
    const state = address.state || '';
    const zip_code = address.postcode || '';
    const street = address.road || '';
    const house_number = address.house_number || '';
    const neighborhood = address.suburb || address.neighbourhood || '';
    const formattedAddress =
        data?.display_name ||
        [street, house_number, neighborhood, city, state].filter(Boolean).join(', ');

    return {
        address: formattedAddress || '',
        city,
        state,
        zip_code,
        neighborhood,
        street,
        house_number,
    };
}

async function reverseGeocodeNominatim(lat: number, lng: number, fallbackAddress = '') {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);
    const result = await response.json();
    const normalized = normalizeNominatimAddress(result);
    const finalAddress = normalized.address || fallbackAddress || `Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return {
        ...normalized,
        address: finalAddress,
    };
}

async function searchCoordinatesNominatim(query: string) {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        countrycodes: 'mx',
        limit: '1',
    });
    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`);
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
}

interface LocationMapProps {
    onLocationSelect: (location: { address: string, lat: number, lng: number, city: string, state: string, zip_code: string, neighborhood: string, street?: string, house_number?: string }) => void;
    initialCenter?: { lat: number; lng: number };
    initialQuery?: string;
}

export function LocationMap({ onLocationSelect, initialCenter, initialQuery = '' }: LocationMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const [location, setLocation] = React.useState<{ lat: number, lng: number }>(
        initialCenter || { lat: 19.4326, lng: -99.1332 }
    );
    const [query, setQuery] = React.useState(initialQuery);
    const [suggestions, setSuggestions] = React.useState<WoosmapSuggestion[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [activeSuggestionId, setActiveSuggestionId] = React.useState<string | null>(null);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const mapCenter = useMemo(() => location, [location]);
    
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
    };

    React.useEffect(() => {
        if (!initialCenter) return;
        setLocation(initialCenter);
        setQuery(initialQuery);
        if (mapRef.current) {
            mapRef.current.panTo(initialCenter);
            mapRef.current.setZoom(15);
        }
    }, [initialCenter, initialQuery]);

    React.useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (searchContainerRef.current && target && !searchContainerRef.current.contains(target)) {
                setIsSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, []);

    React.useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        const trimmedQuery = query.trim();
        if (trimmedQuery.length < 3) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        searchDebounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const params = new URLSearchParams({
                    input: trimmedQuery,
                    key: WOOSMAP_API_KEY,
                    language: 'es',
                    types: 'address|locality',
                    components: 'country:mx',
                });
                const response = await fetch(`${WOOSMAP_AUTOCOMPLETE_URL}?${params.toString()}`);
                const data = await response.json();
                const localities = (data?.localities || data?.predictions || []) as WoosmapSuggestion[];
                setSuggestions(localities);
                setIsSuggestionsOpen(true);
            } catch (error) {
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        }, 280);

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [query]);

    const handleSuggestionSelect = async (suggestion: WoosmapSuggestion) => {
        setActiveSuggestionId(suggestion.public_id);
        setIsSuggestionsOpen(false);
        try {
            let coordinates: { lat: number; lng: number } | null = null;
            const detailsParams = new URLSearchParams({
                public_id: suggestion.public_id,
                key: WOOSMAP_API_KEY,
                fields: 'geometry|address_components',
                language: 'es',
            });
            try {
                const response = await fetch(`${WOOSMAP_DETAILS_URL}?${detailsParams.toString()}`);
                const payload = await response.json();
                const detailsData = payload?.result || payload || {};
                const extracted = extractCoordinates(detailsData, NaN, NaN);
                if (Number.isFinite(extracted.lat) && Number.isFinite(extracted.lng)) {
                    coordinates = extracted;
                }
            } catch {
                // fallback below
            }

            if (!coordinates) {
                coordinates = await searchCoordinatesNominatim(suggestion.description);
            }
            if (!coordinates) {
                throw new Error('No coordinates found for suggestion');
            }

            const parsedAddress = await reverseGeocodeNominatim(coordinates.lat, coordinates.lng, suggestion.description);

            setLocation(coordinates);
            setQuery(parsedAddress.address);
            setSuggestions([]);
            onLocationSelect({
                address: parsedAddress.address,
                lat: coordinates.lat,
                lng: coordinates.lng,
                city: parsedAddress.city,
                state: parsedAddress.state,
                zip_code: parsedAddress.zip_code,
                neighborhood: parsedAddress.neighborhood,
                street: parsedAddress.street,
                house_number: parsedAddress.house_number,
            });

            if (mapRef.current) {
                mapRef.current.panTo(coordinates);
                mapRef.current.setZoom(15);
            }
        } catch (error) {
            setSuggestions([]);
            setIsSuggestionsOpen(false);
        } finally {
            setActiveSuggestionId(null);
        }
    };

    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setLocation({ lat, lng });
            void (async () => {
                try {
                    const parsedAddress = await reverseGeocodeNominatim(lat, lng);
                    setQuery(parsedAddress.address);
                    onLocationSelect({
                        address: parsedAddress.address,
                        lat,
                        lng,
                        city: parsedAddress.city,
                        state: parsedAddress.state,
                        zip_code: parsedAddress.zip_code,
                        neighborhood: parsedAddress.neighborhood,
                        street: parsedAddress.street,
                        house_number: parsedAddress.house_number,
                    });
                } catch (error) {
                    const fallbackAddress = `Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    setQuery(fallbackAddress);
                    onLocationSelect({
                        address: fallbackAddress,
                        lat,
                        lng,
                        city: '',
                        state: '',
                        zip_code: '',
                        neighborhood: '',
                        street: '',
                        house_number: '',
                    });
                }
            })();
        }
    };

    if (loadError) return <div className="text-destructive">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-4">
            <label className="text-sm font-medium leading-none">Buscar Dirección</label>
            <div className="relative" ref={searchContainerRef}>
                <Input
                    type="text"
                    placeholder="Busca la dirección o arrastra el pin en el mapa"
                    className="w-full"
                    value={query}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsSuggestionsOpen(true);
                    }}
                    onChange={(event) => setQuery(event.target.value)}
                />
                {isSuggestionsOpen && (suggestions.length > 0 || isSearching) && (
                    <div className="absolute z-[90] mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
                        {isSearching ? (
                            <button type="button" disabled className="w-full px-3 py-2 text-left text-sm text-muted-foreground">
                                Buscando direcciones...
                            </button>
                        ) : (
                            suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.public_id}
                                    type="button"
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    disabled={activeSuggestionId === suggestion.public_id}
                                    className={cn(
                                        "w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent hover:text-accent-foreground",
                                        activeSuggestionId === suggestion.public_id && "cursor-wait opacity-60"
                                    )}
                                >
                                    {suggestion.description}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            <div className="relative h-80 w-full">
                <GoogleMap
                    mapContainerClassName="h-full w-full rounded-md"
                    center={mapCenter}
                    zoom={15}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: true,
                        mapTypeControl: true,
                        gestureHandling: 'greedy',
                    }}
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
