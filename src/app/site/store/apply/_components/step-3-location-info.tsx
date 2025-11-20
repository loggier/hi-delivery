"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useLoadScript, GoogleMap, Autocomplete } from '@react-google-maps/api';

import { Form, FormControl, FormField, FormMessage, FormLabel } from '@/components/ui/form';
import { locationInfoSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { FormInput } from '@/app/store/apply/_components/form-components';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const libraries: ('places')[] = ['places'];
type LocationInfoFormValues = z.infer<typeof locationInfoSchema>;

export function Step3_LocationInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
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
        latitude: 19.4326, // Default to a central location
        longitude: -99.1332,
    }
  });
  
  const mapCenter = useMemo(() => {
    const lat = methods.watch('latitude');
    const lng = methods.watch('longitude');
    return lat && lng ? { lat, lng } : { lat: 19.4326, lng: -99.1332 };
  }, [methods.watch('latitude'), methods.watch('longitude')]);

  useEffect(() => {
    async function fetchBusinessData() {
      if (!businessId) {
        toast({ title: "Error", description: "No se encontró el ID del negocio. Por favor, vuelve a empezar.", variant: "destructive" });
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
          const resetData = {
            ...defaultData,
            ...data,
            phone_whatsapp: data.phone_whatsapp?.replace('+52', '') || '',
            latitude: data.latitude || defaultData.latitude,
            longitude: data.longitude || defaultData.longitude,
          };
          methods.reset(resetData);
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error al cargar datos", description: error instanceof Error ? error.message : "Ocurrió un error." });
      } finally {
        setIsFetchingData(false);
      }
    }
    fetchBusinessData();
  }, [businessId, methods, toast, router]);

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        methods.setValue('latitude', place.geometry.location.lat(), { shouldValidate: true });
        methods.setValue('longitude', place.geometry.location.lng(), { shouldValidate: true });
        
        let address = '';
        let neighborhood = '';
        let city = '';
        let state = '';
        let postalCode = '';

        place.address_components?.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) address = `${address} ${component.long_name}`;
            if (types.includes('route')) address = `${component.long_name}${address ? ' ' + address : ''}`;
            if (types.includes('sublocality_level_1') || types.includes('neighborhood')) neighborhood = component.long_name;
            if (types.includes('locality')) city = component.long_name;
            if (types.includes('administrative_area_level_1')) state = component.short_name;
            if (types.includes('postal_code')) postalCode = component.long_name;
        });

        methods.setValue('address_line', address.trim());
        methods.setValue('neighborhood', neighborhood);
        methods.setValue('city', city);
        methods.setValue('state', state);
        methods.setValue('zip_code', postalCode);
      }
    }
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
        methods.setValue('latitude', e.latLng.lat(), { shouldValidate: true });
        methods.setValue('longitude', e.latLng.lng(), { shouldValidate: true });
    }
  }

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
          if (value) formData.append(key, String(value));
      });
      
      const response = await fetch(`/api/businesses/${businessId}`, { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Error al guardar tu información.");
      
      toast({ title: "Ubicación Guardada", variant: "success" });
      router.push(`/site/store/apply/submit?id=${businessId}`);

    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar", description: error instanceof Error ? error.message : "No se pudo guardar tu información." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingData) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-20 w-full"/>)}
        </div>
        <Skeleton className="h-96 w-full" />
        <div className="flex justify-between"> <Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-44" /></div>
      </div>
    );
  }

  return (
     <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FormInput name="phone_whatsapp" label="Teléfono / WhatsApp de Contacto" placeholder="5512345678" type="tel" />
          </div>
          
          {isLoaded ? (
             <div>
                <FormLabel>Dirección</FormLabel>
                <div className="relative mt-2">
                    <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                        <Input type="text" placeholder="Busca tu dirección o arrastra el pin en el mapa" className="w-full" />
                    </Autocomplete>
                </div>
                <GoogleMap
                    mapContainerClassName="h-96 w-full rounded-md mt-4"
                    center={mapCenter}
                    zoom={15}
                    onClick={onMapClick}
                    onCenterChanged={() => {
                        const newCenter = methods.getValues();
                        if(newCenter.latitude && newCenter.longitude){
                            methods.setValue('latitude', newCenter.latitude);
                            methods.setValue('longitude', newCenter.longitude);
                        }
                    }}
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
                 <FormField name="latitude" render={({ field }) => <FormMessage />} />
            </div>
          ) : loadError ? (
            <div className="text-destructive">Error al cargar el mapa. Por favor, verifica tu clave de API de Google Maps.</div>
          ) : (
            <Skeleton className="h-96 w-full" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormInput name="address_line" label="Calle y Número"/>
            <FormInput name="neighborhood" label="Colonia"/>
            <FormInput name="city" label="Ciudad"/>
            <FormInput name="state" label="Estado"/>
            <FormInput name="zip_code" label="Código Postal"/>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push(`/site/store/apply/business-info?id=${businessId}`)} disabled={isSubmitting}>Anterior</Button>
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
