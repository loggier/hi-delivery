"use client";

import React from 'react';
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { riderAccountCreationSchema } from '@/lib/schemas';
import { FormInput } from '@/app/deliveryman/apply/_components/form-components';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Form } from '@/components/ui/form';

type AccountCreationFormValues = z.infer<typeof riderAccountCreationSchema>;

export function Step1_AccountCreation() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const methods = useForm<AccountCreationFormValues>({
    resolver: zodResolver(riderAccountCreationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneE164: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (data: AccountCreationFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ocurrió un error al crear la cuenta.');
      }
      
      toast({
        title: "Cuenta Creada Exitosamente",
        description: "Ahora completa el resto de tu información.",
        variant: "success",
      });
      router.push(`/site/deliveryman/apply/personal-info?id=${result.riderId}`);

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
              <FormInput name="firstName" label="Nombre(s)" placeholder="Ej. Juan" />
              <FormInput name="lastName" label="Apellido Paterno" placeholder="Ej. Pérez" />
              <FormInput name="email" label="Email" type="email" placeholder="tu.email@ejemplo.com" />
              <FormInput name="phoneE164" label="Teléfono Celular (10 dígitos)" type="tel" placeholder="Ej. 5512345678" description="Se usará para notificaciones y contacto."/>
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
