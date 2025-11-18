"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2, Upload, MapPin } from "lucide-react";
import { useLoadScript, GoogleMap, Autocomplete as GoogleAutocomplete, Marker } from '@react-google-maps/api';

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

import { type Business, type BusinessCategory, type Zone } from "@/types";
import { businessSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type BusinessFormValues = z.infer<typeof businessSchema>;

interface BusinessFormProps {
  initialData?: Business | null;
  categories: BusinessCategory[];
  zones: Zone[];
}

const libraries: ('places')[] = ['places'];

const BusinessMap = ({ value, onChange }: { value: { lat: number, lng: number }, onChange: (coords: { lat: number, lng: number }) => void }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);
    const mapRef = React.useRef<google.maps.Map | null>(null);

    const onMapLoad = React.useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                onChange({ lat, lng });
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(15);
            }
        }
    };
    
    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
    }

    const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    if (loadError) return <div className="text-red-500">Error al cargar el mapa.</div>;
    if (!isLoaded) return <Skeleton className="h-96 w-full" />;

    return (
        <div className="space-y-4">
            <GoogleAutocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <Input type="text" placeholder="Buscar dirección para ubicar en el mapa..." className="w-full" />
            </GoogleAutocomplete>
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={value}
                zoom={15}
                onLoad={onMapLoad}
                onClick={onMapClick}
                 options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {value.lat && value.lng && <Marker position={value} />}
            </GoogleMap>
        </div>
    );
};


const ImageUpload = ({ value, onChange }: { value?: string, onChange: (value: any) => void }) => {
    const [preview, setPreview] = React.useState(value);

    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
        if (file) {
            onChange(event.target.files);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    return (
        <div className="flex items-center gap-4">
             <div className="w-24 h-24 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden border">
                {preview ? <img src={preview} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-500">Sin logo</span>}
            </div>
            <Input type="file" onChange={handleUpload} accept="image/*" className="hidden" ref={inputRef}/>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><Upload className="mr-2"/> Subir logo</Button>
        </div>
    )
}

export function BusinessForm({ initialData, categories, zones }: BusinessFormProps) {
  const router = useRouter();
  const createMutation = api.businesses.useCreate();
  const updateMutation = api.businesses.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear negocio";

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "", type: "restaurant", category_id: "", zone_id: "",
      email: "", owner_name: "", phone_whatsapp: "", address_line: "",
      neighborhood: "", city: "Ciudad de México", state: "CDMX",
      zip_code: "", tax_id: "", website: "", instagram: "", logo_url: "",
      notes: "", status: "ACTIVE", password: "", passwordConfirmation: "",
      latitude: 19.4326, longitude: -99.1332,
    },
  });
  
  React.useEffect(() => {
    if (initialData) {
        form.reset({
            ...initialData,
            category_id: initialData.category_id || "",
            zone_id: initialData.zone_id || "",
            tax_id: initialData.tax_id || "",
            website: initialData.website || "",
            instagram: initialData.instagram || "",
            logo_url: initialData.logo_url || "",
            notes: initialData.notes || "",
            latitude: initialData.latitude || 19.4326,
            longitude: initialData.longitude || -99.1332,
            password: "",
            passwordConfirmation: "",
        });
    }
  }, [initialData, form]);

  const selectedType = useWatch({
    control: form.control,
    name: 'type',
  });
  
  const [lat, lng] = useWatch({
    control: form.control,
    name: ['latitude', 'longitude']
  });

  const mapCenter = React.useMemo(() => ({ lat: lat || 19.4326, lng: lng || -99.1332 }), [lat, lng]);

  const availableCategories = React.useMemo(() => {
    return categories?.filter(c => c.type === selectedType && c.active) || [];
  }, [selectedType, categories]);

  React.useEffect(() => {
    const currentCategoryId = form.getValues('category_id');
    if (currentCategoryId && !availableCategories.some(c => c.id === currentCategoryId)) {
        form.setValue('category_id', '');
    }
  }, [selectedType, availableCategories, form]);

  const onSubmit = async (data: BusinessFormValues) => {
    try {
      if (isEditing && initialData) {
        const { password, passwordConfirmation, ...updateData } = data;
        await updateMutation.mutateAsync({ ...updateData, id: initialData.id });
      } else {
        if (!data.password) {
            form.setError("password", { message: "La contraseña es requerida para nuevos negocios." });
            return;
        }
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
                                <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
                            name="category_id"
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
                      <FormField
                        control={form.control}
                        name="zone_id"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Zona de Operación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isPending || !zones}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecciona una zona" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {zones?.filter(z => z.status === 'ACTIVE').map(zone => (
                                    <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormDescription>La zona donde operará principalmente el negocio.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <div className="lg:row-span-2">
                    <FormField
                        control={form.control}
                        name="logo_url"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logo</FormLabel>
                            <FormControl>
                               <ImageUpload value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Información de Contacto y Propietario</CardTitle>
                <CardDescription>Estos datos se usarán para crear la cuenta de usuario del propietario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField
                        control={form.control}
                        name="owner_name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Propietario</FormLabel>
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
                            <FormLabel>Email del Propietario</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="contacto@ejemplo.com" {...field} disabled={isPending || isEditing}/>
                            </FormControl>
                             {isEditing && <FormDescription>El email no se puede cambiar.</FormDescription>}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="phone_whatsapp"
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
                 {!isEditing && (
                    <>
                        <Separator />
                        <h3 className="text-md font-medium text-slate-800">Crear Contraseña para el Propietario</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña</FormLabel>
                                    <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} disabled={isPending}/>
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
                                    <Input type="password" placeholder="••••••••" {...field} disabled={isPending}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                         </div>
                    </>
                 )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Ubicación</CardTitle>
                <CardDescription>Busca la dirección o arrastra el marcador para definir la ubicación exacta de tu negocio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="address_line"
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
                            name="neighborhood"
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
                                name="city"
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
                                name="state"
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
                                name="zip_code"
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
                             <BusinessMap 
                                value={mapCenter} 
                                onChange={(coords) => {
                                    form.setValue('latitude', coords.lat, { shouldValidate: true });
                                    form.setValue('longitude', coords.lng, { shouldValidate: true });
                                }}
                            />
                        </FormControl>
                        <FormField
                            control={form.control}
                            name="latitude"
                            render={() => <FormMessage />}
                        />
                     </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Información Adicional (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField
                        control={form.control}
                        name="tax_id"
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isPending ? "Guardando..." : formAction}
            </Button>
        </div>
      </form>
    </Form>
  );
}
