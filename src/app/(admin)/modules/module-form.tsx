"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

import { type Module } from "@/types";
import { api } from "@/lib/api";

const moduleSchema = z.object({
  id: z.string().min(2, { message: "El ID debe tener al menos 2 caracteres." }).regex(/^[a-z0-9_]+$/, { message: "El ID solo puede contener letras minúsculas, números y guiones bajos." }),
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  description: z.string().optional(),
});


type ModuleFormValues = z.infer<typeof moduleSchema>;

interface ModuleFormProps {
  initialData?: Module | null;
}

export function ModuleForm({ initialData }: ModuleFormProps) {
  const router = useRouter();
  const createMutation = api.modules.useCreate();
  const updateMutation = api.modules.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear módulo";

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: initialData || {
      id: "",
      name: "",
      description: "",
    },
  });

  const { watch, setValue } = form;
  const watchedName = watch("name");
  
  React.useEffect(() => {
    if (!isEditing) {
        setValue("id", slugify(watchedName).replace(/-/g, '_'));
    }
  }, [watchedName, setValue, isEditing]);

  const onSubmit = async (data: ModuleFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/modules");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el módulo", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Módulo" : "Crear Nuevo Módulo"}</CardTitle>
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
                    <FormLabel>Nombre del Módulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Facturación" {...field} disabled={isPending}/>
                    </FormControl>
                    <FormDescription>El nombre legible que verán los usuarios.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID del Módulo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. facturacion" {...field} disabled={isPending || isEditing}/>
                    </FormControl>
                     <FormDescription>Identificador único en minúsculas y guiones bajos.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe para qué sirve este módulo..." {...field} disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
