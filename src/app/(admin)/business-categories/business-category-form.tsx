"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { type BusinessCategory } from "@/types";
import { businessCategorySchema } from "@/lib/schemas";
import { api } from "@/lib/api";

type CategoryFormValues = z.infer<typeof businessCategorySchema>;

interface BusinessCategoryFormProps {
  initialData?: BusinessCategory | null;
}

export function BusinessCategoryForm({ initialData }: BusinessCategoryFormProps) {
  const router = useRouter();
  const createMutation = api["business_categories"].useCreate();
  const updateMutation = api["business_categories"].useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear categoría";

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(businessCategorySchema),
    defaultValues: initialData || {
      name: "",
      type: "restaurant",
      active: true,
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/business-categories");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar la categoría", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Categoría" : "Crear Nueva Categoría"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="ej., Pizzerías" {...field} disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Negocio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurante</SelectItem>
                        <SelectItem value="store">Tienda</SelectItem>
                        <SelectItem value="service">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Activa</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : formAction}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
