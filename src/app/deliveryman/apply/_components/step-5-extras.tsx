
"use client";

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Form, FormField, FormControl } from '@/components/ui/form';
import { riderApplicationBaseSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const extrasSchema = riderApplicationBaseSchema.pick({
  hasHelmet: true,
  hasUniform: true,
  hasBox: true,
});

type ExtrasFormValues = z.infer<typeof extrasSchema>;

const ExtraCheckbox = ({ name, label }: { name: keyof ExtrasFormValues, label: string }) => (
    <FormField
        name={name}
        render={({ field }) => (
             <div className="flex items-center space-x-3 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                        id={name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
                <Label htmlFor={name} className="font-normal">
                    {label}
                </Label>
            </div>
        )}
    />
);


export function Step5_Extras() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const methods = useForm<ExtrasFormValues>({
    resolver: zodResolver(extrasSchema),
    mode: 'onChange',
    defaultValues: {
      hasHelmet: false,
      hasUniform: false,
      hasBox: false,
    }
  });

  const onSubmit = async (data: ExtrasFormValues) => {
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
      Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
      });
      
      const response = await fetch(`/api/riders/${rider.id}`, {
        method: 'PATCH',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Error al guardar tu información.");
      }
      
      toast({ title: "Extras Guardados", variant: "success" });
      router.push('/deliveryman/apply/submit');

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
            <div className="space-y-4">
                <ExtraCheckbox name="hasHelmet" label="Cuento con casco de seguridad" />
                <ExtraCheckbox name="hasUniform" label="Cuento con uniforme (propio o de Hi! Delivery)" />
                <ExtraCheckbox name="hasBox" label="Cuento con caja de reparto" />
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
