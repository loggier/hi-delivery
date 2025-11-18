"use client";

import React from 'react';
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { businessAccountCreationSchema } from '@/lib/schemas';
import { FormInput } from './form-components';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { api } from '@/lib/api';

type AccountCreationFormValues = z.infer<typeof businessAccountCreationSchema>;

export function Step1_AccountCreation() {
  const router = useRouter();
  const { toast } = useToast();
  const createBusinessMutation = api.businesses.useCreateWithFormData();

  const methods = useForm<AccountCreationFormValues>({
    resolver: zodResolver(businessAccountCreationSchema),
    defaultValues: {
      owner_name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (data: AccountCreationFormValues) => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
          formData.append(key, value);
      });

      const result = await createBusinessMutation.mutateAsync(formData as any);
      
      if (result && result.businessId) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('businessId', result.businessId);
        }
        toast({
          title: "Cuenta Creada Exitosamente",
          description: "Ahora completa el perfil de tu negocio.",
          variant: "success",
        });
        router.push(`/store/apply/business-info?id=${result.businessId}`);
      } else {
        throw new Error("No se pudo obtener el ID del negocio creado.");
      }
    } catch (error) {
      // The onError in useMutation will handle the toast
    }
  };

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput name="owner_name" label="Tu Nombre Completo" placeholder="Ej. Juan Pérez" />
              <FormInput name="email" label="Email de Contacto" type="email" placeholder="tu.email@ejemplo.com" />
              <FormInput name="password" label="Contraseña" type="password" placeholder="********" description="Mínimo 8 caracteres y una mayúscula, un número o un símbolo."/>
              <FormInput name="passwordConfirmation" label="Confirmar Contraseña" type="password" placeholder="********" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={createBusinessMutation.isPending}>
              {createBusinessMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createBusinessMutation.isPending ? "Creando cuenta..." : "Crear Cuenta y Continuar"}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
