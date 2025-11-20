"use client";

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { riderApplicationBaseSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FormInput, FormSelect, FormFutureDatePicker, FormFileUpload, FormMultiImageUpload } from './form-components';
import { vehicleBrands, vehicleYears } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

const vehicleInfoSchema = riderApplicationBaseSchema.pick({
  ownership: true,
  brand: true,
  brandOther: true,
  year: true,
  model: true,
  color: true,
  plate: true,
  licenseFrontUrl: true,
  licenseBackUrl: true,
  licenseValidUntil: true,
  circulationCardFrontUrl: true,
  circulationCardBackUrl: true,
  motoPhotoFront: true,
  motoPhotoBack: true,
  motoPhotoLeft: true,
  motoPhotoRight: true,
});

type VehicleInfoFormValues = z.infer<typeof vehicleInfoSchema>;

export function Step3_VehicleInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const riderId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const methods = useForm<VehicleInfoFormValues>({
    resolver: zodResolver(vehicleInfoSchema),
    mode: 'onChange',
    defaultValues: {
        ownership: undefined,
        brand: undefined,
        brandOther: '',
        year: undefined,
        model: '',
        color: '',
        plate: '',
        licenseFrontUrl: null,
        licenseBackUrl: null,
        licenseValidUntil: undefined,
        circulationCardFrontUrl: null,
        circulationCardBackUrl: null,
        motoPhotoFront: null,
        motoPhotoBack: null,
        motoPhotoLeft: null,
        motoPhotoRight: null,
    }
  });
  
  useEffect(() => {
    async function fetchRiderData() {
      if (!riderId) {
        toast({ title: "Error de ID", description: "No se encontró el ID del repartidor. Por favor, vuelve al paso 1.", variant: "destructive" });
        router.push('/deliveryman/apply');
        return;
      }
      setIsFetchingData(true);
      try {
        const supabase = createClient();
        const { data: riderData, error } = await supabase
          .from('riders')
          .select('ownership, brand, year, model, color, plate, license_valid_until')
          .eq('id', riderId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw new Error("No se pudo recuperar tu información. Por favor, intenta de nuevo.");
        }

        if (riderData) {
          methods.reset({
            ownership: riderData.ownership || undefined,
            brand: vehicleBrands.includes(riderData.brand as any) ? riderData.brand : 'Otra',
            brandOther: !vehicleBrands.includes(riderData.brand as any) ? riderData.brand : '',
            year: riderData.year || undefined,
            model: riderData.model || '',
            color: riderData.color || '',
            plate: riderData.plate || '',
            licenseValidUntil: riderData.license_valid_until ? new Date(riderData.license_valid_until) : undefined,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al cargar datos",
          description: error instanceof Error ? error.message : "Ocurrió un error inesperado."
        });
      } finally {
        setIsFetchingData(false);
      }
    }
    fetchRiderData();
  }, [riderId, methods, toast, router]);

  const brand = useWatch({ control: methods.control, name: 'brand' });

  const onSubmit = async (data: VehicleInfoFormValues) => {
    if (!riderId) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para continuar.", variant: "destructive" });
      router.push('/deliveryman/apply');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value instanceof FileList && value.length > 0) {
            formData.append(key, value[0]);
          } else if (value instanceof Date) {
            formData.append(key, value.toISOString().split('T')[0]);
          } else if (value) {
            if (key === 'brand' && value === 'Otra') {
              formData.append('brand', data.brandOther || 'Otra');
            } else if (key !== 'brandOther') {
              formData.append(key, value);
            }
          }
      });
      
      const response = await fetch(`/api/riders/${riderId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al guardar tu información.");
      }
      
      toast({ title: "Información de Vehículo Guardada", variant: "success" });
      router.push(`/deliveryman/apply/policy-info?id=${riderId}`);

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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({length: 11}).map((_, i) => <Skeleton key={i} className="h-20 w-full"/>)}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-32 w-full"/>)}
                  </div>
                </div>
              </div>
            </div>
             <div className="flex justify-between">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-44" />
            </div>
        </div>
      )
  }

  return (
     <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormSelect
                  name="ownership"
                  label="El vehículo es..."
                  placeholder="Selecciona una opción"
                  options={[
                    { value: "propia", label: "Propio" },
                    { value: "rentada", label: "Rentado" },
                    { value: "prestada", label: "Prestado" },
                  ]}
                />
                <div />

                <FormSelect name="brand" label="Marca de la Moto" placeholder="Selecciona la marca" options={vehicleBrands.map(b => ({value: b, label: b}))} />
                {brand === 'Otra' && (
                    <FormInput name="brandOther" label="Especifica la marca" placeholder="Ej. BMW" />
                )}
                <FormSelect name="year" label="Año" placeholder="Selecciona el año" options={vehicleYears.map(y => ({value: y, label: y}))} />
                <FormInput name="model" label="Modelo" placeholder="Ej. N-Max" />
                <FormInput name="color" label="Color" placeholder="Ej. Negro" />
                <FormInput name="plate" label="Placa" placeholder="Ej. ABC-123-DE" />
                <div />

                <FormFileUpload name="licenseFrontUrl" label="Licencia de Conducir (Frente)" />
                <FormFileUpload name="licenseBackUrl" label="Licencia de Conducir (Reverso)" />
                <FormFutureDatePicker name="licenseValidUntil" label="Vigencia de la Licencia" />
                <div />
                
                <FormFileUpload name="circulationCardFrontUrl" label="Tarjeta de Circulación (Frente)" />
                <FormFileUpload name="circulationCardBackUrl" label="Tarjeta de Circulación (Reverso)" />
                
                <div className="md:col-span-2">
                    <FormMultiImageUpload 
                        label="Fotos de tu Moto" 
                        description="Sube 4 fotos: frente, atrás, lado izquierdo y lado derecho." 
                    />
                </div>
              </div>
            </div>
             <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isFetchingData}>
                Anterior
              </Button>
              <Button type="submit" disabled={isSubmitting || isFetchingData}>
                {(isSubmitting || isFetchingData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar y Continuar
              </Button>
            </div>
        </form>
        </Form>
    </FormProvider>
  );
}
