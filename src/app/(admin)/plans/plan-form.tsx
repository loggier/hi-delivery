"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { type Plan } from "@/types";
import { planSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type PlanFormValues = z.infer<typeof planSchema>;

interface PlanFormProps {
  initialData?: Plan | null;
}

export function PlanForm({ initialData }: PlanFormProps) {
  const router = useRouter();
  const createMutation = api.plans.useCreate();
  const updateMutation = api.plans.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear plan";

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: initialData || {
      name: "",
      price: 0,
      validity: "mensual",
      riderFee: 0,
      feePerKm: 0,
      minShippingFee: 0,
      minDistance: 0,
      details: "",
    },
  });

  const onSubmit = async (data: PlanFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/plans");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el plan", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Detalles del Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Plan</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej. Plan Básico" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio (MXN)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="299.00" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="validity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Validez</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un periodo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="quincenal">Quincenal</SelectItem>
                                <SelectItem value="mensual">Mensual</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="details"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Detalles del plan u observación</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Describe las características principales de este plan..."
                            className="resize-y"
                            {...field}
                            disabled={isPending}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Tarifas de Envío</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                    control={form.control}
                    name="riderFee"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuota de Repartidor</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="35.00" {...field} disabled={isPending}/>
                        </FormControl>
                        <FormDescription>Tarifa base para el repartidor.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="feePerKm"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuota por KM</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="8.00" {...field} disabled={isPending}/>
                        </FormControl>
                         <FormDescription>Costo por KM recorrido.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="minShippingFee"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuota Mínima de Envío</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="40.00" {...field} disabled={isPending}/>
                        </FormControl>
                         <FormDescription>Tarifa mínima cobrada al cliente.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="minDistance"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Distancia Mínima (KM)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="3" {...field} disabled={isPending}/>
                        </FormControl>
                         <FormDescription>KM incluidos en la tarifa base.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </CardContent>
        </Card>
        
        <Separator />
        
        <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
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
