
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { riderApplicationBaseSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { FormInput, FormDatePicker, FormSelect, FormFileUpload } from './form-components';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const personalInfoSchema = riderApplicationBaseSchema.pick({
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const { data: zones, isLoading: isLoadingZones } = api.zones.useGetAll({ status: 'ACTIVE' });
  
  const zoneOptions = zones?.map(zone => ({ value: zone.id, label: zone.name })) || [];

  const methods = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onChange',
    defaultValues: {
      motherLastName: '',
      address: '',
      zone_id: '',
      ineFrontUrl: null,
      ineBackUrl: null,
      proofOfAddressUrl: null,
    }
  });

  useEffect(() => {
    async function fetchRiderData() {
      if (!user) {
        setIsFetchingData(false);
        return;
      };
      setIsFetchingData(true);
      try {
        const supabase = createClient();
        const { data: riderData, error } = await supabase
          .from('riders')
          .select('mother_last_name, birth_date, zone_id, address')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error if profile is empty
          throw new Error("No se pudo recuperar tu información. Por favor, intenta de nuevo.");
        }
        
        if (riderData) {
          methods.reset({
            motherLastName: riderData.mother_last_name || '',
            birthDate: riderData.birth_date ? new Date(riderData.birth_date) : undefined,
            zone_id: riderData.zone_id || '',
            address: riderData.address || '',
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
  }, [user, methods, toast]);

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
            formData.append(key, value.toISOString().split('T')[0]); // Send as YYYY-MM-DD
          } else if (value) {
            formData.append(key, value);
          }
      });
      
      const response = await fetch(`/api/riders?id=${rider.id}`, {
        method: 'POST',
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

  if (isFetchingData) {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-20 w-full"/>)}
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
