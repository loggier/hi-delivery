

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, PlusCircle, X, MapPin, User, Phone, Home, Loader2, Edit, AlertCircle, Timer, Building, Package, Route, Map, CheckCircle, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
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
import { GoogleMap, MarkerF, Polyline } from '@react-google-maps/api';
import { api } from '@/lib/api';
import { newCustomerSchema, customerAddressSchema } from '@/lib/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationPoint } from './page';
import { Textarea } from '@/components/ui/textarea';

const OSRM_ROUTE_URL = process.env.NEXT_PUBLIC_OSRM_ROUTE_URL || 'https://nominatim.vemontech.com/route/v1/driving';
const NOMINATIM_BASE_URL = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.vemontech.com';
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const NOMINATIM_REVERSE_URL = `${NOMINATIM_BASE_URL}/reverse`;

type LatLng = { lat: number; lng: number };

type NominatimSuggestion = {
    place_id: number | string;
    display_name: string;
    lat: string;
    lon: string;
    address?: Record<string, string | undefined>;
};

type ParsedAddress = {
    address: string;
    lat: number;
    lng: number;
    city: string;
    state: string;
    zip_code: string;
    neighborhood: string;
    street: string;
    house_number: string;
};

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

function normalizeNominatimAddress(data: Partial<NominatimSuggestion>, lat: number, lng: number): ParsedAddress {
    const address = data.address || {};
    const street = address.road || address.pedestrian || address.footway || '';
    const house_number = address.house_number || '';
    const neighborhood = address.suburb || address.neighbourhood || address.quarter || '';
    const city = address.city || address.town || address.village || address.municipality || '';
    const state = address.state || '';
    const zip_code = address.postcode || '';
    const formattedAddress =
        data.display_name ||
        [street, house_number, neighborhood, city, state].filter(Boolean).join(', ') ||
        `Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    return {
        address: formattedAddress,
        lat,
        lng,
        city,
        state,
        zip_code,
        neighborhood,
        street,
        house_number,
    };
}

function parseNominatimSuggestion(suggestion: NominatimSuggestion): ParsedAddress | null {
    const lat = Number(suggestion.lat);
    const lng = Number(suggestion.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return normalizeNominatimAddress(suggestion, lat, lng);
}

async function searchNominatim(query: string, limit = 6): Promise<NominatimSuggestion[]> {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        countrycodes: 'mx',
        limit: String(limit),
    });

    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Nominatim search unavailable');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<ParsedAddress> {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Nominatim reverse unavailable');
    const data = await response.json();
    return normalizeNominatimAddress(data, lat, lng);
}

// --- Location Selector ---
interface LocationSelectorProps {
    isLoaded: boolean;
    onLocationSelect: (location: LocationPoint) => void;
    title: string;
}

export function LocationSelector({ isLoaded, onLocationSelect, title }: LocationSelectorProps) {
    const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
    const [activeSuggestionId, setActiveSuggestionId] = useState<string | number | null>(null);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (searchContainerRef.current && target && !searchContainerRef.current.contains(target)) {
                setIsSuggestionsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, []);

    useEffect(() => {
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
                const results = await searchNominatim(trimmedQuery);
                setSuggestions(results);
                setIsSuggestionsOpen(true);
            } catch {
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

    const handleSuggestionSelect = (suggestion: NominatimSuggestion) => {
        const parsed = parseNominatimSuggestion(suggestion);
        if (!parsed) return;

        setActiveSuggestionId(suggestion.place_id);
        const location = { address: parsed.address, lat: parsed.lat, lng: parsed.lng };
        setSelectedLocation(location);
        setQuery(parsed.address);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
        setActiveSuggestionId(null);
    };
    
    if (!isLoaded) return <Skeleton className="h-20 w-full" />

    return (
        <div className="space-y-4">
            <label className="text-sm font-medium leading-none">{title}</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1" ref={searchContainerRef}>
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar dirección..."
                        className="w-full pl-10 h-12 text-base"
                        value={query}
                        onFocus={() => {
                            if (suggestions.length > 0) setIsSuggestionsOpen(true);
                        }}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelectedLocation(null);
                        }}
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
                                        key={suggestion.place_id}
                                        type="button"
                                        onClick={() => handleSuggestionSelect(suggestion)}
                                        disabled={activeSuggestionId === suggestion.place_id}
                                        className={cn(
                                            "w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent hover:text-accent-foreground",
                                            activeSuggestionId === suggestion.place_id && "cursor-wait opacity-60"
                                        )}
                                    >
                                        {suggestion.display_name}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
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
    orderAmount: string;
    onOrderAmountChange: (value: string) => void;
    readyInMinutes: string;
    onReadyInMinutesChange: (value: string) => void;
    ticketPhotos: File[];
    onTicketPhotosChange: (files: File[]) => void;
    onTicketPhotoProcessingChange?: (isProcessing: boolean) => void;
}

const ACCEPTED_TICKET_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TICKET_IMAGE_WIDTH = 1600;
const MAX_TICKET_IMAGE_HEIGHT = 1600;
const TICKET_IMAGE_QUALITY = 0.72;

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new window.Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo leer la imagen.'));
        };
        image.src = objectUrl;
    });
}

async function compressTicketImage(file: File): Promise<File> {
    const image = await loadImageFromFile(file);
    const scale = Math.min(
        1,
        MAX_TICKET_IMAGE_WIDTH / image.naturalWidth,
        MAX_TICKET_IMAGE_HEIGHT / image.naturalHeight
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('No se pudo preparar la imagen.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', TICKET_IMAGE_QUALITY);
    });

    if (!blob) {
        throw new Error('No se pudo comprimir la imagen.');
    }

    const originalName = file.name.replace(/\.[^.]+$/, '') || 'ticket';
    return new File([blob], `${originalName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    });
}

export function PackageDetails({
    value,
    onValueChange,
    orderAmount,
    onOrderAmountChange,
    readyInMinutes,
    onReadyInMinutesChange,
    ticketPhotos,
    onTicketPhotosChange,
    onTicketPhotoProcessingChange,
}: PackageDetailsProps) {
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [ticketPhotoError, setTicketPhotoError] = useState<string | null>(null);
    const [isCompressingTicket, setIsCompressingTicket] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!ticketPhotos || ticketPhotos.length === 0) {
            setPreviewUrls([]);
            return;
        }

        const objectUrls = ticketPhotos.map((file) => URL.createObjectURL(file));
        setPreviewUrls(objectUrls);
        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [ticketPhotos]);

    const handleTicketPhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        setTicketPhotoError(null);

        if (files.length === 0) return;

        const validFiles = files.filter((file) => file.type.startsWith('image/') && ACCEPTED_TICKET_IMAGE_TYPES.includes(file.type));
        if (validFiles.length === 0) {
            onTicketPhotosChange([]);
            setTicketPhotoError('Sube una imagen JPG, PNG o WebP.');
            return;
        }

        const remainingSlots = Math.max(0, 5 - ticketPhotos.length);
        const filesToProcess = validFiles.slice(0, remainingSlots);
        if (filesToProcess.length === 0) {
            setTicketPhotoError('Solo puedes subir hasta 5 imágenes.');
            return;
        }

        if (validFiles.length > filesToProcess.length) {
            setTicketPhotoError('Solo puedes subir hasta 5 imágenes.');
        }

        setIsCompressingTicket(true);
        onTicketPhotoProcessingChange?.(true);
        try {
            const compressedFiles = await Promise.all(
                filesToProcess.map(async (file) => {
                    try {
                        return await compressTicketImage(file);
                    } catch {
                        setTicketPhotoError('No se pudo comprimir una imagen; se usará el archivo original.');
                        return file;
                    }
                }),
            );
            onTicketPhotosChange([...ticketPhotos, ...compressedFiles].slice(0, 5));
        } catch {
            onTicketPhotosChange([...ticketPhotos, ...filesToProcess].slice(0, 5));
        } finally {
            setIsCompressingTicket(false);
            onTicketPhotoProcessingChange?.(false);
        }
    };

    const handleRemoveTicketPhoto = (indexToRemove?: number) => {
        if (typeof indexToRemove === 'number') {
            onTicketPhotosChange(ticketPhotos.filter((_, index) => index !== indexToRemove));
        } else {
            onTicketPhotosChange([]);
        }
        setTicketPhotoError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="package-description" className="text-sm font-medium leading-none">Descripción del pedido</label>
                <Textarea
                    id="package-description"
                    placeholder="Ej. Documentos importantes, una caja de zapatos, llaves, etc."
                    value={value}
                    onChange={(e) => onValueChange(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="order-amount" className="text-sm font-medium leading-none">Monto del pedido (opcional)</label>
                    <Input
                        id="order-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={orderAmount}
                        onChange={(e) => onOrderAmountChange(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="ready-in-minutes" className="text-sm font-medium leading-none">Listo para recorrer en</label>
                    <Input
                        id="ready-in-minutes"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Ej. 15"
                        value={readyInMinutes}
                        onChange={(e) => onReadyInMinutesChange(e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label htmlFor="ticket-photo" className="text-sm font-medium leading-none">Fotos del ticket</label>
                <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                    {previewUrls.length > 0 ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {previewUrls.map((previewUrl, index) => (
                                    <div key={previewUrl} className="space-y-2 rounded-md border bg-white p-2">
                                        <div className="relative overflow-hidden rounded-md border bg-white">
                                            <Image
                                                src={previewUrl}
                                                alt={`Vista previa del ticket ${index + 1}`}
                                                width={900}
                                                height={520}
                                                unoptimized
                                                className="max-h-56 w-full object-contain"
                                            />
                                        </div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 text-xs text-muted-foreground">
                                                <p className="truncate font-medium text-foreground">{ticketPhotos[index]?.name}</p>
                                                <p>Imagen comprimida antes de guardar · {ticketPhotos[index] ? formatFileSize(ticketPhotos[index].size) : ''}</p>
                                            </div>
                                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => handleRemoveTicketPhoto(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isCompressingTicket || ticketPhotos.length >= 5}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Agregar otra imagen
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveTicketPhoto()} disabled={ticketPhotos.length === 0}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Limpiar todas
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-5 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                                {isCompressingTicket ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : (
                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium">Sube una o varias fotos del ticket</p>
                                <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Se comprimirá antes de guardar.</p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isCompressingTicket || ticketPhotos.length >= 5}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Seleccionar imágenes
                            </Button>
                        </div>
                    )}
                    <Input
                        ref={fileInputRef}
                        id="ticket-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={handleTicketPhotoSelect}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Puedes subir hasta 5 imágenes.</p>
                {ticketPhotoError && <p className={cn("text-xs", ticketPhotoError.startsWith('No se pudo') ? "text-amber-600" : "text-destructive")}>{ticketPhotoError}</p>}
            </div>
        </div>
    )
}

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
                                    <div>
                                        <p className="text-sm">{addr.address}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {[
                                                addr.street ? `Calle: ${addr.street}` : null,
                                                addr.house_number ? `Número: ${addr.house_number}` : null,
                                                addr.reference ? `Referencia: ${addr.reference}` : null,
                                            ].filter(Boolean).join(' · ') || 'Sin detalles adicionales'}
                                        </p>
                                    </div>
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
                 <Button variant="outline" onClick={onAddNewCustomer} disabled={disabled}>
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
    businessId: string;
    onCustomerCreated: (customer: Customer) => void;
}

export function CustomerFormModal({ isOpen, onClose, businessId, onCustomerCreated }: CustomerFormModalProps) {
    const createCustomerMutation = api.customers.useCreate<NewCustomerFormValues>();
    
    const methods = useForm<NewCustomerFormValues>({
        resolver: zodResolver(newCustomerSchema),
        defaultValues: {
            business_id: businessId,
            first_name: '',
            last_name: '',
            phone: '',
            email: ''
        },
    });

    useEffect(() => {
        methods.setValue('business_id', businessId);
    }, [businessId, methods]);

    const onSubmit = async (data: NewCustomerFormValues) => {
        try {
            const newCustomer = await createCustomerMutation.mutateAsync({ ...data, business_id: businessId });
            if(newCustomer) {
                methods.reset();
                onCustomerCreated(newCustomer);
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
    onSaved?: () => void;
}

export function AddressFormModal({ isOpen, onClose, customerId, addressToEdit, isMapsLoaded, onSaved }: AddressFormModalProps) {
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
            onSaved?.();
            onClose();
        } catch (error) {
            // Error is handled by useMutation hook
        }
    };
    
    const isSubmitting = createAddressMutation.isPending || updateAddressMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[800px] max-h-[calc(100dvh-1rem)] overflow-hidden p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{addressToEdit ? "Editar Dirección" : "Nueva Dirección"}</DialogTitle>
                </DialogHeader>
                <FormProvider {...methods}>
                    <Form {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-4 pt-2">
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                <LocationMap
                                    isMapsLoaded={isMapsLoaded}
                                    onLocationSelect={({ address, lat, lng, city, state, zip_code, neighborhood, street, house_number }) => {
                                        methods.setValue('address', address, { shouldValidate: true });
                                        methods.setValue('street', street || '', { shouldValidate: true });
                                        methods.setValue('house_number', house_number || '', { shouldValidate: true });
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
                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormInput name="street" label="Calle" placeholder="Ej. Av. Insurgentes Sur" />
                                    <FormInput name="house_number" label="Número" placeholder="Ej. 123-A" />
                                </div>
                            </div>
                            <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
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
    onLocationSelect: (location: ParsedAddress) => void;
}

export function LocationMap({ isMapsLoaded, onLocationSelect }: LocationMapProps) {
    const [location, setLocation] = React.useState<{ lat: number, lng: number }>({ lat: 19.4326, lng: -99.1332 });
    const [query, setQuery] = React.useState('');
    const [suggestions, setSuggestions] = React.useState<NominatimSuggestion[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);
    const [activeSuggestionId, setActiveSuggestionId] = React.useState<string | number | null>(null);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);

    const mapCenter = useMemo(() => location, [location]);

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
                const results = await searchNominatim(trimmedQuery);
                setSuggestions(results);
                setIsSuggestionsOpen(true);
            } catch {
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

    const applyLocation = (parsed: ParsedAddress) => {
        const nextLocation = { lat: parsed.lat, lng: parsed.lng };
        setLocation(nextLocation);
        setQuery(parsed.address);
        onLocationSelect(parsed);
        if (mapRef.current) {
            mapRef.current.panTo(nextLocation);
            mapRef.current.setZoom(15);
        }
    };

    const handleSuggestionSelect = (suggestion: NominatimSuggestion) => {
        const parsed = parseNominatimSuggestion(suggestion);
        if (!parsed) return;

        setActiveSuggestionId(suggestion.place_id);
        setSuggestions([]);
        setIsSuggestionsOpen(false);
        applyLocation(parsed);
        setActiveSuggestionId(null);
    };
    
    const onMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
    }

    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setLocation({ lat, lng });
            void (async () => {
                try {
                    const parsed = await reverseGeocodeNominatim(lat, lng);
                    applyLocation(parsed);
                } catch {
                    applyLocation({
                        address: `Coords: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
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

    if (!isMapsLoaded) return <Skeleton className="h-72 w-full" />;

    return (
        <div className="space-y-4">
             <FormLabel>Buscar Dirección</FormLabel>
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
                                    key={suggestion.place_id}
                                    type="button"
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    disabled={activeSuggestionId === suggestion.place_id}
                                    className={cn(
                                        "w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent hover:text-accent-foreground",
                                        activeSuggestionId === suggestion.place_id && "cursor-wait opacity-60"
                                    )}
                                >
                                    {suggestion.display_name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
            <div className="relative h-64 w-full md:h-80">
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
            <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-4xl max-h-[calc(100dvh-1rem)] overflow-hidden p-4 sm:p-6">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">Visualización de Ruta</DialogTitle>
                    <DialogDescription>
                        Ubicación de origen y destino del envío.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 h-[56dvh] md:h-[60vh]">
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
    orderAmount: number;
    readyInMinutes: number | null;
    isTicketPhotoProcessing?: boolean;
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
    orderAmount,
    readyInMinutes,
    isTicketPhotoProcessing = false,
    isMapsLoaded,
    onCreateShipping,
    isCreating,
    onOpenMap,
}: ShippingSummaryProps) {
    const shippingBusiness = useMemo(
        () => (business ? { id: business.id, plan_id: business.plan_id } : null),
        [business]
    );

    const { shippingInfo, isLoading: isLoadingShipping, error: shippingError } = useShippingCalculation(
        shippingBusiness,
        origin,
        destination,
        isMapsLoaded
    );

    const orderTotal = orderAmount + (shippingInfo?.cost || 0);

    const isReadyToCreate =
        !!business &&
        !!customer &&
        !!origin &&
        !!destination &&
        !!packageDescription.trim() &&
        readyInMinutes !== null &&
        readyInMinutes > 0 &&
        !!shippingInfo &&
        !isLoadingShipping &&
        !isTicketPhotoProcessing &&
        !isCreating;

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
                            <p className="text-sm font-medium text-slate-500">Detalle del pedido</p>
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

                <div className="space-y-2 text-lg">
                    <Separator />
                    <div className="flex justify-between">
                        <span>Monto del pedido</span>
                        <span>{formatCurrency(orderAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Costo de envío</span>
                        <span>{formatCurrency(shippingInfo?.cost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Listo para recorrer en</span>
                        <span>{readyInMinutes ? `${readyInMinutes} min` : 'N/A'}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-2xl font-bold text-primary">
                        <span>Total</span>
                        <span>{formatCurrency(orderTotal)}</span>
                    </div>
                </div>
                
                <Button
                    size="lg"
                    className="w-full text-lg h-12"
                    disabled={!isReadyToCreate}
                    onClick={() => shippingInfo && onCreateShipping({ shippingInfo })}
                >
                    {isCreating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isTicketPhotoProcessing ? 'Comprimiendo imagen...' : 'Crear Envío'}
                </Button>
            </CardContent>
        </Card>
    )
}
