
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
import { Loader2, Check, ShieldCheck, CheckCircle } from 'lucide-react';
import { FormImageUpload } from './form-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const submitSchema = riderApplicationBaseSchema.pick({
  avatar1x1Url: true,
});

type SubmitFormValues = z.infer<typeof submitSchema>;

export function Step6_Submit() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const methods = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    mode: 'onChange',
    defaultValues: {
        avatar1x1Url: null,
    }
  });

  useEffect(() => {
    async function fetchRiderData() {
      if (!user) return;
      // No need to fetch data for this step as file inputs cannot be pre-filled
      // but we keep the structure for consistency.
      setIsFetchingData(false);
    }
    fetchRiderData();
  }, [user]);

  const onSubmit = async (data: SubmitFormValues) => {
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
      if(data.avatar1x1Url && data.avatar1x1Url.length > 0) {
        formData.append('avatar1x1Url', data.avatar1x1Url[0]);
      }
      // Also update status to 'pending_review'
      formData.append('status', 'pending_review');
      
      const response = await fetch(`/api/riders/${rider.id}`, {
        method: 'PATCH',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al guardar tu información.");
      }
      
      setIsSuccess(true);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al enviar la solicitud",
        description: error instanceof Error ? error.message : "No se pudo enviar tu solicitud.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
        <div className="text-center py-16">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500"/>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">¡Solicitud Enviada!</h2>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                Hemos recibido tu información correctamente. Revisaremos tu solicitud y nos pondremos en contacto contigo pronto.
            </p>
            <Button asChild className="mt-8">
                <Link href="/">Volver al inicio</Link>
            </Button>
        </div>
    )
  }

  if (isFetchingData) {
      return (
          <div className="space-y-8">
            <Skeleton className="h-16 w-full" />
            <div className="max-w-xs mx-auto">
                <Skeleton className="aspect-square w-full" />
            </div>
            <Skeleton className="h-36 w-full" />
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
           <Alert>
              <ShieldCheck className="h-4 w-4"/>
              <AlertTitle>¡Casi terminas!</AlertTitle>
              <AlertDescription>
                Sube tu foto de perfil y revisa que toda tu información sea correcta antes de enviar la solicitud.
              </AlertDescription>
           </Alert>
            <div className="max-w-xs mx-auto">
                <FormImageUpload
                name="avatar1x1Url"
                label="Foto de Perfil (1:1)"
                description="Una foto clara de tu rostro, sin lentes de sol ni gorra."
                />
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-2">Antes de enviar, confirma que:</h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Toda la información es correcta y verídica.</li>
                    <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Las fotos y documentos son claros y legibles.</li>
                    <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Aceptas los términos y condiciones del servicio.</li>
                </ul>
            </div>
             <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isFetchingData}>
                Anterior
              </Button>
              <Button type="submit" disabled={isSubmitting || isFetchingData}>
                {(isSubmitting || isFetchingData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Solicitud
              </Button>
            </div>
        </form>
      </Form>
    </FormProvider>
  );
}
