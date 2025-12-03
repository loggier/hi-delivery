

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
  FormDescription,
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

import { type User } from "@/types";
import { userSchema, updateUserSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  initialData?: User | null;
}

export function UserForm({ initialData }: UserFormProps) {
  const router = useRouter();
  const createMutation = api["users"].useCreate();
  const updateMutation = api.users.useUpdate();
  const { data: roles, isLoading: isLoadingRoles } = api.roles.useGetAll();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear usuario";

  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditing ? updateUserSchema : userSchema),
    defaultValues: initialData ? {
        ...initialData,
        password: '',
        passwordConfirmation: '',
    } : {
      name: "",
      email: "",
      role_id: undefined,
      status: "ACTIVE",
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    if (isEditing && initialData) {
      await updateMutation.mutateAsync({ ...data, id: initialData.id });
    } else {
      await createMutation.mutateAsync(data);
    }
    router.push("/users");
    router.refresh();
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
                      <Input type="email" placeholder="ej., juan@example.com" {...field} disabled={isPending || isEditing}/>
                    </FormControl>
                    {isEditing && <FormDescription>El email no se puede cambiar.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending || isLoadingRoles}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles?.map(role => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
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
            <div className="space-y-2">
              <h3 className="text-md font-medium">Contraseña</h3>
               {isEditing && <p className="text-sm text-muted-foreground">Dejar en blanco para no cambiar la contraseña.</p>}
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>
                            {isEditing ? "Nueva Contraseña" : "Contraseña"}
                        </FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} disabled={isPending} />
                        </FormControl>
                         <FormDescription>Mínimo 8 caracteres y una mayúscula, un número o un símbolo.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="passwordConfirmation"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} disabled={isPending} />
                        </FormControl>
                        <FormMessage />
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
