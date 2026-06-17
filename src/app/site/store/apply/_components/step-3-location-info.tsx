"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';

import { Form, FormField, FormControl, FormMessage, FormLabel } from '@/components/ui/form';
import { locationInfoSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search } from 'lucide-react';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LocationInfoFormValues = z.infer<typeof locationInfoSchema>;

const NOMINATIM_BASE_URL = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.vemontech.com';
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const NOMINATIM_REVERSE_URL = `${NOMINATIM_BASE_URL}/reverse`;

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

export function Step3_LocationInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    id: "hi-delivery-store-apply-google-maps",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const methods = useForm<LocationInfoFormValues>({
    resolver: zodResolver(locationInfoSchema),
    mode: 'onChange',
    defaultValues: {
      phone_whatsapp: '',
      address_line: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      latitude: 19.4326,
      longitude: -99.1332,
    },
  });

  const latitude = useWatch({ control: methods.control, name: 'latitude' });
  const longitude = useWatch({ control: methods.control, name: 'longitude' });

  const mapCenter = useMemo(() => {
    return latitude && longitude
      ? { lat: latitude, lng: longitude }
      : { lat: 19.4326, lng: -99.1332 };
  }, [latitude, longitude]);

  useEffect(() => {
    async function fetchBusinessData() {
      if (!businessId) {
        toast({
          title: "Error",
          description: "No se encontró el ID del negocio. Por favor, vuelve a empezar.",
          variant: "destructive",
        });
        router.push('/site/store/apply');
        return;
      }
      setIsFetchingData(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('businesses')
          .select('phone_whatsapp, address_line, neighborhood, city, state, zip_code, latitude, longitude')
          .eq('id', businessId)
          .single();

        if (error && error.code !== 'PGRST116') throw new Error("No se pudo recuperar tu información.");

        if (data) {
          const defaultData = methods.getValues();
          methods.reset({
            ...defaultData,
            ...data,
            phone_whatsapp: data.phone_whatsapp?.replace('+52', '') || '',
            latitude: data.latitude || defaultData.latitude,
            longitude: data.longitude || defaultData.longitude,
          });
          if (data.address_line) {
            setQuery(data.address_line);
          }
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al cargar datos",
          description: error instanceof Error ? error.message : "Ocurrió un error.",
        });
      } finally {
        setIsFetchingData(false);
      }
    }
    fetchBusinessData();
  }, [businessId, methods, toast, router]);

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

  const applyParsedAddress = (parsed: ParsedAddress) => {
    methods.setValue('latitude', parsed.lat, { shouldValidate: true });
    methods.setValue('longitude', parsed.lng, { shouldValidate: true });
    methods.setValue('address_line', parsed.address || '', { shouldValidate: true });
    methods.setValue('neighborhood', parsed.neighborhood || '', { shouldValidate: true });
    methods.setValue('city', parsed.city || '', { shouldValidate: true });
    methods.setValue('state', parsed.state || '', { shouldValidate: true });
    methods.setValue('zip_code', parsed.zip_code || '', { shouldValidate: true });
    if (mapRef.current) {
      mapRef.current.panTo({ lat: parsed.lat, lng: parsed.lng });
      mapRef.current.setZoom(15);
    }
  };

  const handleSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const parsed = parseNominatimSuggestion(suggestion);
    if (!parsed) return;

    setQuery(parsed.address);
    setSuggestions([]);
    setIsSuggestionsOpen(false);
    applyParsedAddress(parsed);
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      void (async () => {
        try {
          const parsed = await reverseGeocodeNominatim(lat, lng);
          setQuery(parsed.address);
          applyParsedAddress(parsed);
        } catch {
          methods.setValue('latitude', lat, { shouldValidate: true });
          methods.setValue('longitude', lng, { shouldValidate: true });
        }
      })();
    }
  };

  const onSubmit = async (data: LocationInfoFormValues) => {
    if (!businessId) {
      toast({ title: "Error de sesión", description: "Inicia sesión para continuar.", variant: "destructive" });
      router.push('/site/store/apply');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });

      const response = await fetch(`/api/businesses/${businessId}`, { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Error al guardar tu información.");

      toast({ title: "Ubicación Guardada", variant: "success" });
      router.push(`/site/store/apply/submit?id=${businessId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudo guardar tu información.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-44" />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormInput
              name="phone_whatsapp"
              label="Teléfono / WhatsApp de Contacto"
              placeholder="5512345678"
              type="tel"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              <MapPin className="inline h-4 w-4 mr-1" />
              Busca tu dirección o haz clic en el mapa
            </p>

            <div ref={searchContainerRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Busca tu dirección..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsSuggestionsOpen(true);
                  }}
                  className="w-full pl-9"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {isSuggestionsOpen && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">{suggestion.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isLoaded ? (
              <GoogleMap
                id="store-apply-location-map"
                mapContainerClassName="h-96 w-full rounded-md mt-4"
                center={mapCenter}
                zoom={15}
                onClick={onMapClick}
                onLoad={(map) => { mapRef.current = map; }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                }}
              >
                <MarkerF position={mapCenter} />
              </GoogleMap>
            ) : loadError ? (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
                Error al cargar el mapa. Ingresa latitud y longitud manualmente.
              </div>
            ) : (
              <Skeleton className="mt-4 h-96 w-full rounded-md" />
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <FormInput name="latitude" label="Latitud" />
              <FormInput name="longitude" label="Longitud" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormInput name="address_line" label="Calle y Número" />
            <FormInput name="neighborhood" label="Colonia" />
            <FormInput name="city" label="Ciudad" />
            <FormInput name="state" label="Estado" />
            <FormInput name="zip_code" label="Código Postal" />
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/site/store/apply/business-info?id=${businessId}`)}
              disabled={isSubmitting}
            >
              Anterior
            </Button>
            <Button type="submit" disabled={isSubmitting || !isLoaded}>
              {(isSubmitting || !isLoaded) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y Continuar
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
