"use client";

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { FormInput, FormDatePicker, FormSelect, FormFileUpload } from './form-components';
import { api } from '@/lib/api';

const personalInfoSchema = riderApplicationSchema.pick({
  motherLastName: true,
  birthDate: true,
  zone_id: true,
  address: true,
  ineFrontUrl: true,
  ineBackUrl: true,
  proofOfAddressUrl: true,
});
type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

export function Step2_PersonalInfo() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { data: zones, isLoading: isLoadingZones } = api.zones.useGetAll({ status: 'ACTIVE' });
  
  const zoneOptions = zones?.map(zone => ({ value: zone.id, label: zone.name })) || [];

  const methods = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: PersonalInfoFormValues) => {
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
      
      toast({ title: "Información Guardada", variant: "success" });
      router.push('/deliveryman/apply/vehicle-info');

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput name="motherLastName" label="Apellido Materno (Opcional)" placeholder="Ej. García" />
            <FormDatePicker name="birthDate" label="Fecha de Nacimiento" />
            <FormSelect
              name="zone_id"
              label="Zona de Operación"
              placeholder={isLoadingZones ? "Cargando zonas..." : "Selecciona tu zona"}
              options={zoneOptions}
              disabled={isLoadingZones}
            />
            <FormInput name="address" label="Dirección Completa" placeholder="Calle, número, colonia, C.P." className="md:col-span-2" />
            <FormFileUpload name="ineFrontUrl" label="Frente de tu INE" description="Asegúrate que sea legible."/>
            <FormFileUpload name="ineBackUrl" label="Reverso de tu INE" description="Asegúrate que sea legible."/>
            <FormFileUpload name="proofOfAddressUrl" label="Comprobante de Domicilio" description="No mayor a 3 meses. (CFE, Agua, Teléfono)" />
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
