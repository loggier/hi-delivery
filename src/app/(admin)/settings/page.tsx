
"use client";

import React, { useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const settingsSchema = z.object({
  id: z.number().optional(),
  min_shipping_amount: z.coerce
    .number()
    .min(0, "Debe ser un valor positivo"),
  min_distance_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  max_distance_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  cost_per_extra_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  dispatch_algorithm: z.enum(["batch", "sequential"]),
  dispatch_candidate_radius_km: z.coerce.number().positive("Debe ser mayor a 0"),
  dispatch_batch_size: z.coerce.number().int().min(1, "Debe ser al menos 1"),
  dispatch_decision_window_seconds: z.coerce.number().int().min(5, "Debe ser al menos 5 segundos"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const SettingsSkeleton = () => (
    <Card>
        <CardHeader>
          <CardTitle>Parámetros de Envío</CardTitle>
          <CardDescription>
            Estos valores afectan cómo se calculan los costos y la viabilidad
            de los envíos en toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function SettingsPage() {
  const { data: currentSettings, isLoading } = api.settings.useGet();
  const updateMutation = api.settings.useUpdate();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        min_shipping_amount: 0,
        min_distance_km: 0,
        max_distance_km: 0,
        cost_per_extra_km: 0,
        dispatch_algorithm: "batch",
        dispatch_candidate_radius_km: 3,
        dispatch_batch_size: 3,
        dispatch_decision_window_seconds: 60,
    }
  });
  
  useEffect(() => {
    if (currentSettings) {
        form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate({ ...data, id: currentSettings!.id });
  };

  const isPending = form.formState.isSubmitting || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Configuración del Sistema"
          description="Ajusta los parámetros globales de la operación de envíos."
        />
        <SettingsSkeleton />
      </div>
    );
  }

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
                  name="min_shipping_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Mínimo de Pedido</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
                  name="min_distance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distancia Base (KM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
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
                  name="max_distance_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distancia Máxima de Envío (KM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
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
                  name="cost_per_extra_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo por KM Adicional</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold">Configuración de Dispatch</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajusta cómo se seleccionan y notifican los repartidores para nuevos despachos.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="dispatch_algorithm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Algoritmo de Notificación</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el algoritmo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="batch">Por lotes</SelectItem>
                            <SelectItem value="sequential">Secuencial</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          `Por lotes` notifica a varios repartidores a la vez. `Secuencial` lo hace uno por uno.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dispatch_candidate_radius_km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Radio de Búsqueda (KM)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ej. 3"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Distancia máxima desde el negocio para considerar candidatos al despacho.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dispatch_batch_size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamaño del Lote</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="Ej. 3"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Cuántos riders se notifican al mismo tiempo en el modo por lotes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dispatch_decision_window_seconds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ventana de Decisión (segundos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            placeholder="Ej. 60"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Tiempo máximo para aceptar antes de pasar al siguiente intento o escalar a revisión manual.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
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
