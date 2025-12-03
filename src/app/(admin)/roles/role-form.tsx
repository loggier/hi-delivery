"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type Role, type Module } from "@/types";
import { roleSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData?: Role | null;
}

const PermissionSwitch = ({ module, action, label }: { module: Module; action: "can_create" | "can_read" | "can_update" | "can_delete", label: string; }) => (
    <FormField
        name={`permissions.${module.id}.${action}`}
        render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm gap-4">
            <FormLabel className="text-sm font-normal">{label}</FormLabel>
            <FormControl>
                <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
            </FormControl>
        </FormItem>
        )}
    />
);


export function RoleForm({ initialData }: RoleFormProps) {
  const router = useRouter();
  const { data: modules, isLoading: isLoadingModules } = api.modules.useGetAll();
  const createMutation = api.roles.useCreate();
  const updateMutation = api.roles.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear rol";

  const defaultPermissions = useMemo(() => {
    if (!modules) return {};
    const perms: Record<string, { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean; }> = {};
    modules.forEach(module => {
        const existingPerm = initialData?.role_permissions.find(p => p.module_id === module.id);
        perms[module.id] = {
            can_create: existingPerm?.can_create || false,
            can_read: existingPerm?.can_read || false,
            can_update: existingPerm?.can_update || false,
            can_delete: existingPerm?.can_delete || false,
        };
    });
    return perms;
  }, [modules, initialData]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
        name: initialData?.name || "",
        permissions: defaultPermissions,
    }
  });
  
  useEffect(() => {
    form.reset({
        name: initialData?.name || "",
        permissions: defaultPermissions,
    });
  }, [initialData, defaultPermissions, form]);

  const onSubmit = async (data: RoleFormValues) => {
    const payload = {
        role_id: initialData?.id, // undefined para creación
        name: data.name,
        permissions: Object.entries(data.permissions).map(([module_id, actions]) => ({
            module_id,
            ...actions,
        }))
    };

    if (isEditing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
    router.push("/roles");
    router.refresh();
  };

  const isPending = createMutation.isPending || updateMutation.isPending || isLoadingModules;

  if (isLoadingModules) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Rol" : "Crear Nuevo Rol"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="max-w-md">
                  <FormLabel>Nombre del Rol</FormLabel>
                  <FormControl>
                    <Input placeholder="ej., Gerente de Operaciones" {...field} disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Permisos del Rol</CardTitle>
            <CardDescription>Selecciona las acciones que este rol podrá realizar en cada módulo del sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {modules?.map(module => (
                <div key={module.id}>
                    <h3 className="text-lg font-medium mb-2">{module.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <PermissionSwitch module={module} action="can_read" label="Ver" />
                        <PermissionSwitch module={module} action="can_create" label="Crear" />
                        <PermissionSwitch module={module} action="can_update" label="Editar" />
                        <PermissionSwitch module={module} action="can_delete" label="Borrar" />
                    </div>
                </div>
            ))}
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPending ? "Guardando..." : formAction}
          </Button>
        </div>
      </form>
    </Form>
  );
}
