"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useLoadScript, GoogleMap, MarkerF } from '@react-google-maps/api';

import { Form, FormControl, FormField, FormMessage, FormLabel } from '@/components/ui/form';
import { locationInfoSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { Skeleton } from '@/components/ui/skeleton';

type LocationInfoFormValues = z.infer<typeof locationInfoSchema>;

export function Step3_LocationInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);

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

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      methods.setValue('latitude', e.latLng.lat(), { shouldValidate: true });
      methods.setValue('longitude', e.latLng.lng(), { shouldValidate: true });
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
              Haz clic en el mapa para ubicar tu negocio
            </p>
            {isLoaded ? (
              <GoogleMap
                id="store-apply-location-map"
                mapContainerClassName="h-96 w-full rounded-md"
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
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-6 text-center text-sm text-destructive">
                Error al cargar el mapa. Ingresa latitud y longitud manualmente.
              </div>
            ) : (
              <Skeleton className="h-96 w-full rounded-md" />
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
