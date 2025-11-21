

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
import { Textarea } from "@/components/ui/textarea";

import { type Product as ProductType, type Business, type Category } from "@/types";
import { productSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { FormImageUpload } from "@/app/site/apply/_components/form-components";
import { Loader2 } from "lucide-react";

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: ProductType | null;
  businesses: Business[];
  categories: Category[];
}

export function ProductForm({ initialData, businesses, categories }: ProductFormProps) {
  const router = useRouter();
  const createMutation = api.products.useCreateWithFormData();
  const updateMutation = api.products.useUpdateWithFormData();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear producto";

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData ? {
      ...initialData,
      description: initialData.description || '',
      sku: initialData.sku || '',
      image_url: initialData.image_url || null,
    } : {
      name: "",
      description: "",
      sku: "",
      price: 0,
      status: "ACTIVE",
      business_id: "",
      category_id: "",
      image_url: null,
    },
  });

  const onSubmit = async (data: ProductFormValues) => {
    try {
      const formData = new FormData();
      const currentValues = form.getValues();

      // Handle file separately
      const imageUrlValue = currentValues.image_url;
      if (imageUrlValue instanceof File) {
          formData.append('image_url', imageUrlValue);
      } else if (isEditing && !imageUrlValue) {
        // If image was removed on edit, send empty string to signal removal
        formData.append('image_url', '');
      }
      
      // Append all other fields from the schema
      Object.keys(productSchema.shape).forEach(key => {
        const fieldKey = key as keyof ProductFormValues;
        if (fieldKey !== 'image_url') {
            const value = currentValues[fieldKey];
            if (value !== null && value !== undefined) {
                formData.append(fieldKey, String(value));
            }
        }
      });
      
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ formData, id: initialData.id });
      } else {
        await createMutation.mutateAsync(formData);
      }
      router.push("/products");
      router.refresh();
    } catch (error) {
      // Errors are handled by the mutation hooks
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
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Describe tu producto..." {...field} disabled={isPending} className="resize-none"/>
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
                        name="business_id"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Negocio</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
                        name="category_id"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
                <FormImageUpload name="image_url" label="Imagen del Producto" aspectRatio="square" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isPending ? "Guardando..." : formAction}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
