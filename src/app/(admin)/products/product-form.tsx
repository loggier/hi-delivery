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

import { type Product, type Business, type Category } from "@/types";
import { productSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { FormImageUpload } from "@/app/site/apply/_components/form-components";

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  businesses: Business[];
  categories: Category[];
}

export function ProductForm({ initialData, businesses, categories }: ProductFormProps) {
  const router = useRouter();
  const createMutation = api.products.useCreate();
  const updateMutation = api.products.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear producto";

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: "",
      sku: "",
      price: 0,
      status: "ACTIVE",
      businessId: "",
      categoryId: "",
      imageUrl: undefined,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    // Here you would handle file uploads if imageUrl is a FileList
    // For this mock, we assume it's just a URL string for now.
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el producto", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="md:col-span-2 space-y-8">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre del Producto</FormLabel>
                        <FormControl>
                        <Input placeholder="ej., Pizza Hawaiana Grande" {...field} disabled={isPending}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Precio</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="0.00" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>SKU (Opcional)</FormLabel>
                            <FormControl>
                            <Input placeholder="ej., PIZ-HAW-G" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="businessId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Negocio</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona un negocio" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm max-w-xs">
                        <div className="space-y-0.5">
                        <FormLabel>Activo</FormLabel>
                        <FormMessage />
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value === 'ACTIVE'}
                            onCheckedChange={(checked) => field.onChange(checked ? "ACTIVE" : "INACTIVE")}
                            disabled={isPending}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
              </div>
              <div className="md:col-span-1">
                <FormImageUpload name="imageUrl" label="Imagen del Producto" aspectRatio="square" />
              </div>
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
