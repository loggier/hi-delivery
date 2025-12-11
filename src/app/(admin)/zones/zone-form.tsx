
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type Zone } from "@/types";
import { zoneSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GeofenceMap } from "./geofence-map";

type ZoneFormValues = z.infer<typeof zoneSchema>;
interface ZoneFormProps { initialData?: Zone | null; }

export function ZoneForm({ initialData }: ZoneFormProps) {
  const router = useRouter();
  const createMutation = api.zones.useCreate();
  const updateMutation = api.zones.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear zona";

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: initialData || { name: "", status: "ACTIVE", geofence: undefined },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        geofence: initialData.geofence || undefined,
      });
    } else {
       form.reset({ name: "", status: "ACTIVE", geofence: undefined });
    }
  }, [initialData, form]);

  const onSubmit = async (data: ZoneFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/zones");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar la zona", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader><CardTitle>Detalles de la Zona</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Zona</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. San Pedro Garza García" {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Activo</SelectItem>
                          <SelectItem value="INACTIVE">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Geocerca</CardTitle>
                <CardDescription>Dibuja el polígono que delimita el área de operación de esta zona en el mapa.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="geofence"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <GeofenceMap {...field} />
                      </FormControl>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : formAction}</Button>
        </div>
      </form>
    </Form>
  );
}
