"use client";

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { submitBusinessSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ShieldCheck, CheckCircle } from 'lucide-react';
import { FormInput } from './form-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

type SubmitFormValues = z.infer<typeof submitBusinessSchema>;

export function Step4_Submit() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const methods = useForm<SubmitFormValues>({
    resolver: zodResolver(submitBusinessSchema),
    mode: 'onChange',
    defaultValues: {
        tax_id: '',
        website: '',
        instagram: '',
    }
  });

  useEffect(() => {
    if (!businessId) {
        toast({ title: "Error de sesión", description: "No se encontró el ID del negocio. Por favor, inicia sesión de nuevo.", variant: "destructive" });
        router.push('/store/apply');
        return;
    }
    async function fetchBusinessData() {
        setIsFetchingData(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.from('businesses').select('tax_id, website, instagram').eq('id', businessId).single();
            if (error && error.code !== 'PGRST116') throw new Error("No se pudo recuperar tu información.");
            if (data) {
              const resetData = {
                tax_id: data.tax_id || '',
                website: data.website || '',
                instagram: data.instagram || '',
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
  }, [businessId, router, toast, methods]);

  const onSubmit = async (data: SubmitFormValues) => {
    if (!businessId) {
      toast({ title: "Error de autenticación", description: "Inicia sesión para continuar.", variant: "destructive" });
      router.push('/store/apply');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if(value) formData.append(key, String(value));
      });
      formData.append('final_submission', 'true');
      
      const response = await fetch(`/api/businesses?id=${businessId}`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al enviar tu solicitud.");
      
      setIsSuccess(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('businessId');
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Error al enviar la solicitud", description: error instanceof Error ? error.message : "No se pudo enviar tu solicitud." });
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
                Hemos recibido la información de tu negocio. Revisaremos tu solicitud y nos pondremos en contacto contigo pronto.
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
            <Skeleton className="h-36 w-full" />
            <div className="flex justify-between"> <Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-44" /> </div>
        </div>
      )
  }

  return (
    <FormProvider {...methods}>
       <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
           <Alert>
              <ShieldCheck className="h-4 w-4"/>
              <AlertTitle>¡Estás a un paso de terminar!</AlertTitle>
              <AlertDescription>
                Esta información es opcional, pero nos ayuda a conocer mejor tu negocio.
              </AlertDescription>
           </Alert>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormInput name="tax_id" label="RFC (Opcional)" placeholder="Tu Registro Federal de Contribuyentes"/>
                <FormInput name="website" label="Sitio Web (Opcional)" type="url" placeholder="https://tunegocio.com"/>
                <FormInput name="instagram" label="Instagram (Opcional)" placeholder="@tu_negocio"/>
           </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold mb-2">Antes de enviar, confirma que:</h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Toda la información es correcta y verídica.</li>
                    <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Aceptas los términos y condiciones del servicio.</li>
                </ul>
            </div>
             <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => router.push(`/store/apply/location?id=${businessId}`)} disabled={isSubmitting}>Anterior</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Solicitud
              </Button>
            </div>
        </form>
      </Form>
    </FormProvider>
  );
}
