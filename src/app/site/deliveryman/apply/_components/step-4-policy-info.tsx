"use client";

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { riderApplicationBaseSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FormInput, FormFutureDatePicker, FormFileUpload } from '@/app/site/apply/_components/form-components';
import { Skeleton } from '@/components/ui/skeleton';

const policyInfoSchema = riderApplicationBaseSchema.pick({
  insurer: true,
  policyNumber: true,
  policyValidUntil: true,
  policyFirstPageUrl: true,
});

type PolicyInfoFormValues = z.infer<typeof policyInfoSchema>;

export function Step4_PolicyInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const riderId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const methods = useForm<PolicyInfoFormValues>({
    resolver: zodResolver(policyInfoSchema),
    mode: 'onChange',
    defaultValues: {
      insurer: '',
      policyNumber: '',
      policyValidUntil: undefined,
      policyFirstPageUrl: null,
    }
  });

  useEffect(() => {
    async function fetchRiderData() {
      if (!riderId) {
        toast({ title: "Error de ID", description: "No se encontró el ID del repartidor. Por favor, vuelve al paso 1.", variant: "destructive" });
        router.push('/site/deliveryman/apply');
        return;
      }
      setIsFetchingData(true);
      try {
        const supabase = createClient();
        const { data: riderData, error } = await supabase
          .from('riders')
          .select('insurer, policy_number, policy_valid_until')
          .eq('id', riderId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
            throw new Error("No se pudo recuperar tu información. Por favor, intenta de nuevo.");
        }
        
        if (riderData) {
          methods.reset({
            insurer: riderData.insurer || '',
            policyNumber: riderData.policy_number || '',
            policyValidUntil: riderData.policy_valid_until ? new Date(riderData.policy_valid_until) : undefined,
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

  const onSubmit = async (data: PolicyInfoFormValues) => {
    if (!riderId) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para continuar.", variant: "destructive" });
      router.push('/site/deliveryman/apply');
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
            formData.append(key, value);
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
      
      toast({ title: "Póliza Guardada", variant: "success" });
      router.push(`/site/deliveryman/apply/extras?id=${riderId}`);

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
              {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 w-full"/>)}
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
                <FormInput name="insurer" label="Aseguradora" placeholder="Ej. Quálitas, GNP, AXA..." />
                <FormInput name="policyNumber" label="Número de Póliza" placeholder="Ej. 9876543210" />
                <FormFutureDatePicker name="policyValidUntil" label="Vigencia de la Póliza" />
                <FormFileUpload name="policyFirstPageUrl" label="Carátula de la Póliza" description="Sube la primera página o carátula de tu póliza de seguro vigente."/>
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
