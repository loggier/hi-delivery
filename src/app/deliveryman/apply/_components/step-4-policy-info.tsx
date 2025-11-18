
"use client";

import React from 'react';
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
import { Loader2 } from 'lucide-react';
import { FormInput, FormFutureDatePicker, FormFileUpload } from './form-components';

const policyInfoSchema = riderApplicationBaseSchema.pick({
  insurer: true,
  policyNumber: true,
  policyValidUntil: true,
  policyFirstPageUrl: true,
});

type PolicyInfoFormValues = z.infer<typeof policyInfoSchema>;

export function Step4_PolicyInfo() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const methods = useForm<PolicyInfoFormValues>({
    resolver: zodResolver(policyInfoSchema),
    mode: 'onChange',
    defaultValues: {
      insurer: '',
      policyNumber: '',
      policyFirstPageUrl: null,
    }
  });

  const onSubmit = async (data: PolicyInfoFormValues) => {
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
      
      toast({ title: "Póliza Guardada", variant: "success" });
      router.push('/deliveryman/apply/extras');

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
                <FormInput name="insurer" label="Aseguradora" placeholder="Ej. Quálitas, GNP, AXA..." />
                <FormInput name="policyNumber" label="Número de Póliza" placeholder="Ej. 9876543210" />
                <FormFutureDatePicker name="policyValidUntil" label="Vigencia de la Póliza" />
                <FormFileUpload name="policyFirstPageUrl" label="Carátula de la Póliza" description="Sube la primera página o carátula de tu póliza de seguro vigente."/>
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
