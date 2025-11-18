"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { businessInfoSchema } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { FormInput, FormSelect, FormImageUpload } from './form-components';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

export function Step2_BusinessInfo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('id');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const { data: categories, isLoading: isLoadingCategories } = api.business_categories.useGetAll({ active: 'true' });

  const methods = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    mode: 'onChange',
    defaultValues: {
        name: '',
        type: undefined,
        category_id: '',
        logo_url: null
    }
  });

  const selectedType = useWatch({
    control: methods.control,
    name: 'type',
  });

  const availableCategories = useMemo(() => {
    return categories?.filter(c => c.type === selectedType && c.active) || [];
  }, [selectedType, categories]);
  
  const categoryOptions = availableCategories.map(cat => ({ value: cat.id, label: cat.name }));

  useEffect(() => {
    const currentCategoryId = methods.getValues('category_id');
    if (currentCategoryId && !availableCategories.some(c => c.id === currentCategoryId)) {
        methods.setValue('category_id', '');
    }
  }, [selectedType, availableCategories, methods]);

  useEffect(() => {
    async function fetchBusinessData() {
      if (!businessId) {
        toast({ title: "Error", description: "No se encontró el ID del negocio. Por favor, vuelve a empezar.", variant: "destructive" });
        router.push('/store/apply');
        return;
      };
      setIsFetchingData(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('businesses')
          .select('name, type, category_id, logo_url')
          .eq('id', businessId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw new Error("No se pudo recuperar tu información.");
        }
        
        if (data) {
          methods.reset({
            name: data.name || '',
            type: data.type || undefined,
            category_id: data.category_id || '',
            // logo_url is handled by preview, not by resetting the FileList
          });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Error al cargar datos", description: error instanceof Error ? error.message : "Ocurrió un error inesperado." });
      } finally {
        setIsFetchingData(false);
      }
    }
    fetchBusinessData();
  }, [businessId, methods, toast, router]);

  const onSubmit = async (data: BusinessInfoFormValues) => {
    if (!businessId) {
      toast({ title: "Error de sesión", description: "Inicia sesión para continuar.", variant: "destructive" });
      router.push('/store/apply');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
       Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value instanceof FileList && value.length > 0) formData.append(key.replace('_url', 'Url'), value[0]);
          else if (value) formData.append(key, value);
      });
      
      const response = await fetch(`/api/businesses?id=${businessId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al guardar tu información.");
      
      toast({ title: "Información Guardada", variant: "success" });
      router.push(`/store/apply/location?id=${businessId}`);

    } catch (error) {
      toast({ variant: "destructive", title: "Error al guardar", description: error instanceof Error ? error.message : "No se pudo guardar tu información." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingData || isLoadingCategories) {
      return (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              <Skeleton className="h-20 w-full"/>
              <Skeleton className="h-20 w-full"/>
              <Skeleton className="h-20 w-full"/>
            </div>
            <Skeleton className="aspect-square w-44"/>
          </div>
           <div className="flex justify-between"> <Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-44" /></div>
        </div>
      )
  }

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              <FormInput name="name" label="Nombre de tu Negocio" placeholder="Ej. Tacos El Tío" />
              <FormSelect
                name="type"
                label="Tipo de Negocio"
                placeholder="Selecciona un tipo"
                options={[
                    { value: "restaurant", label: "Restaurante" },
                    { value: "store", label: "Tienda" },
                    { value: "service", label: "Servicio" },
                ]}
                />
              <FormSelect
                name="category_id"
                label="Categoría Principal"
                placeholder={!selectedType ? "Selecciona un tipo primero" : "Selecciona una categoría"}
                options={categoryOptions}
                disabled={!selectedType || isLoadingCategories || availableCategories.length === 0}
                />
            </div>
            <FormImageUpload name="logo_url" label="Logo de tu Negocio" description="Recomendado: 400x400px, formato PNG o JPG."/>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push('/store/apply')} disabled={isSubmitting}> Anterior </Button>
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
