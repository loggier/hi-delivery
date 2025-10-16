"use client";

import React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Upload } from "lucide-react";

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

import { type Business, type BusinessType } from "@/types";
import { businessSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type BusinessFormValues = z.infer<typeof businessSchema>;

interface BusinessFormProps {
  initialData?: Business | null;
}

const GHMapStub = ({ onChange }: { onChange: (coords: {lat: number, lng: number}) => void }) => (
    <div className="h-full min-h-[200px] w-full bg-slate-200 rounded-md flex items-center justify-center">
        <Button type="button" variant="outline" onClick={() => onChange({ lat: 19.4326, lng: -99.1332 })}>
            Simular selección de mapa
        </Button>
    </div>
);

const ImageUpload = ({ value, onChange }: { value?: string, onChange: (value: string) => void }) => {
    const [preview, setPreview] = React.useState(value);

    const handleUpload = () => {
        // Mock upload logic
        const mockImageUrl = "https://picsum.photos/seed/newlogo/200/200";
        setPreview(mockImageUrl);
        onChange(mockImageUrl);
    }
    
    return (
        <div className="flex items-center gap-4">
             <div className="w-24 h-24 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden">
                {preview ? <img src={preview} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-500">Logo</span>}
            </div>
            <Button type="button" variant="outline" onClick={handleUpload}><Upload className="mr-2"/> Subir logo</Button>
        </div>
    )
}

export function BusinessForm({ initialData }: BusinessFormProps) {
  const router = useRouter();
  const createMutation = api.businesses.useCreate();
  const updateMutation = api.businesses.useUpdate();
  const { data: categories } = api.business_categories.useGetAll();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear negocio";

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: initialData || {
      name: "",
      type: "restaurant",
      categoryId: "",
      email: "",
      ownerName: "",
      phoneWhatsApp: "",
      location: {
        addressLine: "",
        neighborhood: "",
        city: "Ciudad de México",
        state: "CDMX",
        zip: "",
      },
      taxId: "",
      website: "",
      instagram: "",
      logoUrl: "",
      notes: "",
      status: "ACTIVE",
    },
  });

  const selectedType = useWatch({
    control: form.control,
    name: 'type',
  });

  const availableCategories = React.useMemo(() => {
    return categories?.filter(c => c.type === selectedType && c.active) || [];
  }, [selectedType, categories]);

  React.useEffect(() => {
    // Reset category if type changes and current category is not valid for the new type
    const currentCategoryId = form.getValues('categoryId');
    if (currentCategoryId && !availableCategories.some(c => c.id === currentCategoryId)) {
        form.setValue('categoryId', '');
    }
  }, [selectedType, availableCategories, form]);

  const onSubmit = async (data: BusinessFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/businesses");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar el negocio", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Negocio</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej. Tacos El Tío" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo</FormLabel>
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
                            name="categoryId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isPending || availableCategories.length === 0}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {availableCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>
                </div>
                <div className="lg:row-span-2">
                    <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <FormControl>
                               <ImageUpload {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="pt-6 space-y-6">
                <h3 className="text-lg font-medium">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField
                        control={form.control}
                        name="ownerName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Contacto</FormLabel>
                            <FormControl>
                            <Input placeholder="Ej. Juan Pérez" {...field} disabled={isPending}/>
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
                            <Input type="email" placeholder="contacto@ejemplo.com" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phoneWhatsApp"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Teléfono / WhatsApp</FormLabel>
                            <FormControl>
                            <Input placeholder="5512345678" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormDescription>Se formateará a +52XXXXXXXXXX.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="pt-6 space-y-6">
                 <h3 className="text-lg font-medium">Ubicación</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="location.addressLine"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dirección (Calle y Número)</FormLabel>
                                <FormControl>
                                <Input placeholder="Av. Insurgentes Sur 123" {...field} disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="location.neighborhood"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Colonia</FormLabel>
                                <FormControl>
                                <Input placeholder="Col. Roma Norte" {...field} disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="location.city"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ciudad</FormLabel>
                                    <FormControl>
                                    <Input {...field} disabled={isPending}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="location.state"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <FormControl>
                                    <Input {...field} disabled={isPending}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="location.zip"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>C.P.</FormLabel>
                                    <FormControl>
                                    <Input placeholder="06700" {...field} disabled={isPending}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                     <div>
                        <FormLabel>Geolocalización</FormLabel>
                        <FormControl>
                            <GHMapStub onChange={(coords) => {
                                form.setValue('location.lat', coords.lat);
                                form.setValue('location.lng', coords.lng);
                            }} />
                        </FormControl>
                     </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardContent className="pt-6 space-y-6">
                 <h3 className="text-lg font-medium">Información Adicional (Opcional)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>RFC</FormLabel>
                            <FormControl>
                            <Input {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sitio Web</FormLabel>
                            <FormControl>
                            <Input type="url" placeholder="https://ejemplo.com" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                            <Input placeholder="@usuario" {...field} disabled={isPending}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                 </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Anotaciones internas sobre el negocio."
                            className="resize-none"
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

        <Separator />
        
        <div className="flex items-center justify-end gap-2">
            <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem className="w-48">
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Activo</SelectItem>
                            <SelectItem value="INACTIVE">Inactivo</SelectItem>
                            <SelectItem value="PENDING_REVIEW">Pendiente de Revisión</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
