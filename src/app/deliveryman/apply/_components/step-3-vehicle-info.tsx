"use client";

import React from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { riderApplicationSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FormInput, FormSelect, FormFutureDatePicker, FormFileUpload, FormMultiImageUpload } from './form-components';
import { vehicleBrands, vehicleYears } from '@/lib/constants';

const vehicleInfoSchema = riderApplicationSchema.pick({
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
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const methods = useForm<VehicleInfoFormValues>({
    resolver: zodResolver(vehicleInfoSchema),
    mode: 'onChange',
  });
  
  const brand = useWatch({ control: methods.control, name: 'brand' });

  const onSubmit = async (data: VehicleInfoFormValues) => {
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para continuar.", variant: "destructive" });
      router.push('/deliveryman/apply');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      const { data: rider, error: riderError } = await supabase.from('riders').select('id').eq('user_id', user.id).single();

      if (riderError || !rider) {
        throw new Error("No se encontró tu perfil de repartidor. Por favor, vuelve al paso anterior.");
      }

      const formData = new FormData();
      Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value instanceof FileList && value.length > 0) {
            formData.append(key, value[0]);
          } else if (value instanceof Date) {
            formData.append(key, value.toISOString());
          } else if (value) {
            formData.append(key, value);
          }
      });
      
      const response = await fetch(`/api/riders/${rider.id}`, {
        method: 'PATCH',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al guardar tu información.");
      }
      
      toast({ title: "Información de Vehículo Guardada", variant: "success" });
      router.push('/deliveryman/apply/policy-info');

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

                <FormSelect name="brand" label="Marca de la Moto" placeholder="Selecciona la marca" options={vehicleBrands} />
                {brand === 'Otra' && (
                    <FormInput name="brandOther" label="Especifica la marca" placeholder="Ej. BMW" />
                )}
                <FormSelect name="year" label="Año" placeholder="Selecciona el año" options={vehicleYears} />
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
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Anterior
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar y Continuar
              </Button>
            </div>
        </form>
        </Form>
    </FormProvider>
  );
}
