"use client";

import React from "react";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { type Role, type Permissions } from "@/types";
import { roleSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormProps {
  initialData?: Role | null;
}

const permissionLabels: Record<keyof Permissions, string> = {
    recolectarEfectivo: "Recolectar Efectivo",
    complemento: "Complementos",
    atributo: "Atributos",
    banner: "Banners",
    campaña: "Campañas",
    categoria: "Categorías",
    cupon: "Cupones",
    reembolso: "Reembolsos",
    gestionDeClientes: "Gestión de Clientes",
    repartidor: "Repartidores",
    proveerGanancias: "Proveer Ganancias",
    empleado: "Empleados",
    producto: "Productos",
    notificacion: "Notificaciones",
    pedido: "Pedidos",
    tienda: "Tiendas",
    reporte: "Reportes",
    configuraciones: "Configuraciones",
    listaDeRetiros: "Lista de Retiros",
    zona: "Zonas",
    modulo: "Módulos",
    paquete: "Paquetes",
    puntoDeVenta: "Punto de Venta",
    unidad: "Unidades",
    suscripcion: "Suscripciones",
};

const permissionGroups = {
    "Gestión General": ["tienda", "categoria", "producto", "banner", "campaña"],
    "Operaciones": ["pedido", "repartidor", "zona", "recolectarEfectivo"],
    "Finanzas": ["proveerGanancias", "listaDeRetiros", "reembolso", "reporte"],
    "Administración": ["empleado", "gestionDeClientes", "cupon", "notificacion"],
    "Sistema": ["configuraciones", "modulo", "paquete", "puntoDeVenta", "unidad", "suscripcion", "atributo", "complemento"],
}


export function RoleForm({ initialData }: RoleFormProps) {
  const router = useRouter();
  const createMutation = api.roles.useCreate();
  const updateMutation = api.roles.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear rol";

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: initialData || {
      name: "",
      permissions: {
        recolectarEfectivo: false, complemento: false, atributo: false, banner: false, campaña: false, categoria: false, cupon: false,
        reembolso: false, gestionDeClientes: false, repartidor: false, proveerGanancias: false, empleado: false, producto: false,
        notificacion: false, pedido: false, tienda: false, reporte: false, configuraciones: false, listaDeRetiros: false,
        zona: false, modulo: false, paquete: false, puntoDeVenta: false, unidad: false, suscripcion: false
      },
    },
  });

  const onSubmit = async (data: RoleFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/roles");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el rol", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
            <CardTitle>Permisos</CardTitle>
            <CardDescription>Selecciona los módulos a los que este rol tendrá acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                <div key={groupName}>
                    <h3 className="text-lg font-medium mb-2">{groupName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 rounded-md border p-4">
                    {(permissions as (keyof Permissions)[]).map((key) => (
                        <FormField
                            key={key}
                            control={form.control}
                            name={`permissions.${key}`}
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm gap-4">
                                <FormLabel className="text-sm font-normal">{permissionLabels[key]}</FormLabel>
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
                    ))}
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
            {isPending ? "Guardando..." : formAction}
          </Button>
        </div>
      </form>
    </Form>
  );
}
