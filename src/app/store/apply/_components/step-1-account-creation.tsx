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
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import { Form } from '@/components/ui/form';

type AccountCreationFormValues = z.infer<typeof businessAccountCreationSchema>;

export function Step1_AccountCreation() {
  const router = useRouter();
  const { toast } = useToast();
  const { loginBusiness } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ocurrió un error al crear la cuenta.');
      }
      
      loginBusiness(result.user, result.businessId);
      toast({
        title: "Cuenta Creada Exitosamente",
        description: "Ahora completa el perfil de tu negocio.",
        variant: "success",
      });
      router.push('/store/apply/business-info');

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al crear la cuenta",
        description: error instanceof Error ? error.message : "No se pudo crear tu cuenta.",
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
              <FormInput name="owner_name" label="Tu Nombre Completo" placeholder="Ej. Juan Pérez" />
              <FormInput name="email" label="Email de Contacto" type="email" placeholder="tu.email@ejemplo.com" />
              <FormInput name="password" label="Contraseña" type="password" placeholder="********" description="Mínimo 8 caracteres y una mayúscula, un número o un símbolo."/>
              <FormInput name="passwordConfirmation" label="Confirmar Contraseña" type="password" placeholder="********" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creando cuenta..." : "Crear Cuenta y Continuar"}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  );
}
