"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

import { type User, type Permissions } from "@/types";
import { userSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: User | null;
}

const permissionList: { id: keyof Permissions, label: string }[] = [
    { id: 'recolectarEfectivo', label: 'Recolectar efectivo' },
    { id: 'complemento', label: 'Complemento' },
    { id: 'atributo', label: 'Atributo' },
    { id: 'banner', label: 'Banner' },
    { id: 'campaña', label: 'Campaña' },
    { id: 'categoria', label: 'Categoría' },
    { id: 'cupon', label: 'Cupón' },
    { id: 'reembolso', label: 'Reembolso' },
    { id: 'gestionDeClientes', label: 'Gestión de clientes' },
    { id: 'repartidor', label: 'Repartidor' },
    { id: 'proveerGanancias', label: 'Proveer ganancias al repartidor' },
    { id: 'empleado', label: 'Empleado' },
    { id: 'producto', label: 'Producto' },
    { id: 'notificacion', label: 'Notificación' },
    { id: 'pedido', label: 'Pedido' },
    { id: 'tienda', label: 'Tienda' },
    { id: 'reporte', label: 'Reporte' },
    { id: 'configuraciones', label: 'Configuraciones' },
    { id: 'listaDeRetiros', label: 'Lista de retiros' },
    { id: 'zona', label: 'Zona' },
    { id: 'modulo', label: 'Módulo' },
    { id: 'paquete', label: 'Paquete' },
    { id: 'puntoDeVenta', label: 'Punto de venta' },
    { id: 'unidad', label: 'Unidad' },
    { id: 'suscripcion', label: 'Suscripción' },
];


export function UserForm({ initialData }: UserFormProps) {
  const router = useRouter();
  const createMutation = api["users"].useCreate();
  const updateMutation = api["users"].useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear usuario";

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      role: "ADMIN",
      status: "ACTIVE",
      permissions: {
        recolectarEfectivo: false,
        complemento: false,
        atributo: false,
        banner: false,
        campaña: false,
        categoria: false,
        cupon: false,
        reembolso: false,
        gestionDeClientes: false,
        repartidor: false,
        proveerGanancias: false,
        empleado: false,
        producto: false,
        notificacion: false,
        pedido: false,
        tienda: false,
        reporte: false,
        configuraciones: false,
        listaDeRetiros: false,
        zona: false,
        modulo: false,
        paquete: false,
        puntoDeVenta: false,
        unidad: false,
        suscripcion: false,
      }
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/users");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el usuario", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Usuario" : "Crear Nuevo Usuario"}</CardTitle>
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
                      <Input placeholder="ej., Juan Pérez" {...field} disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ej., juan@example.com" {...field} disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                        <SelectItem value="RESTAURANT_OWNER">Dueño de Negocio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Activo</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "ACTIVE"}
                        onCheckedChange={(checked) => field.onChange(checked ? "ACTIVE" : "INACTIVE")}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Establecer Permisos</CardTitle>
                    <CardDescription>Selecciona los módulos a los que este usuario tendrá acceso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                            id="select-all"
                            onCheckedChange={(checked) => {
                                permissionList.forEach(p => {
                                    form.setValue(`permissions.${p.id}`, !!checked);
                                });
                            }}
                        />
                        <label
                            htmlFor="select-all"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Seleccionar todo
                        </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {permissionList.map(permission => (
                            <FormField
                                key={permission.id}
                                control={form.control}
                                name={`permissions.${permission.id}`}
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                            {permission.label}
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>


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
