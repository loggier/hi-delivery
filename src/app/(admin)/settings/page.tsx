"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const settingsSchema = z.object({
  minShippingAmount: z.coerce
    .number()
    .min(0, "Debe ser un valor positivo"),
  minDistanceKm: z.coerce.number().min(0, "Debe ser un valor positivo"),
  maxDistanceKm: z.coerce.number().min(0, "Debe ser un valor positivo"),
  costPerExtraKm: z.coerce.number().min(0, "Debe ser un valor positivo"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// Mock data, en una app real esto vendría de una API
const currentSettings = {
    minShippingAmount: 50,
    minDistanceKm: 3,
    maxDistanceKm: 15,
    costPerExtraKm: 8,
}

export default function SettingsPage() {
  const { toast } = useToast();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: currentSettings, // Cargar valores iniciales
  });

  const onSubmit = (data: SettingsFormValues) => {
    // Aquí iría la lógica para guardar en el backend (e.g., useMutation)
    console.log("Valores guardados:", data);
    toast({
      title: "Configuración Guardada",
      description: "Los valores del sistema han sido actualizados.",
      variant: "success",
    });
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configuración del Sistema"
        description="Ajusta los parámetros globales de la operación de envíos."
      />
      <Card>
        <CardHeader>
          <CardTitle>Parámetros de Envío</CardTitle>
          <CardDescription>
            Estos valores afectan cómo se calculan los costos y la viabilidad
            de los envíos en toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="minShippingAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Mínimo de Pedido</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ej. 50"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Monto mínimo para que un pedido califique para envío.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="minDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distancia Base (KM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ej. 3"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Distancia en km incluida en la tarifa base de envío.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distancia Máxima de Envío (KM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ej. 15"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Distancia máxima que un repartidor puede recorrer para una entrega.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costPerExtraKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo por KM Adicional</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ej. 8"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Costo que se agrega por cada km que exceda la distancia base.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
