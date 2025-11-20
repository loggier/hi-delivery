

"use client";

import React, { useMemo, useEffect } from "react";
import { useForm, useWatch, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2, MapPin } from "lucide-react";
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
import { FormImageUpload, FormFileUpload } from "@/app/deliveryman/apply/_components/form-components";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type BusinessFormValues = z.infer<typeof businessSchema>;

interface BusinessFormProps {
  categories: BusinessCategory[];
  zones: Zone[];
}

const libraries: ('places')[] = ['places'];

const BusinessMap = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });
    
    const { control, setValue } = useFormContext();

    const lat = useWatch({ control, name: 'latitude' });
    const lng = useWatch({ control, name: 'longitude' });

    const mapCenter = React.useMemo(() => ({ lat: lat || 19.4326, lng: lng || -99.1332 }), [lat, lng]);

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
                setValue('latitude', lat);
                setValue('longitude', lng);
                
                let address = '';
                let neighborhood = '';
                let city = '';
                let state = '';
                let postalCode = '';

                place.address_components?.forEach(component => {
                    const types = component.types;
                    if (types.includes('street_number')) address = `${address} ${component.long_name}`;
                    if (types.includes('route')) address = `${component.long_name}${address ? ' ' + address : ''}`;
                    if (types.includes('sublocality_level_1') || types.includes('neighborhood')) neighborhood = component.long_name;
                    if (types.includes('locality')) city = component.long_name;
                    if (types.includes('administrative_area_level_1')) state = component.short_name;
                    if (types.includes('postal_code')) postalCode = component.long_name;
                });

                setValue('address_line', address.trim());
                setValue('neighborhood', neighborhood);
                setValue('city', city);
                setValue('state', state);
                setValue('zip_code', postalCode);

                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(15);
            }
        }
    };
    
    const onMapClick = (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            setValue('latitude', e.latLng.lat());
            setValue('longitude', e.latLng.lng());
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
                 <input type="text" placeholder="Buscar dirección para ubicar en el mapa..." className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                )} />
            </GoogleAutocomplete>
            <GoogleMap
                mapContainerClassName="h-80 w-full rounded-md"
                center={mapCenter}
                zoom={15}
                onLoad={onMapLoad}
                onClick={onMapClick}
                 options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {lat && lng && <Marker position={{ lat, lng }} />}
            </GoogleMap>
        </div>
    );
};

function BusinessForm({ categories, zones }: BusinessFormProps) {
  const router = useRouter();
  const methods = useFormContext<BusinessFormValues>();
  const createMutation = api.businesses.useCreateWithFormData();
  const updateMutation = api.businesses.useUpdateWithFormData();
  
  const isEditing = !!methods.getValues("id");
  const formAction = isEditing ? "Guardar cambios" : "Crear negocio";

  const selectedType = useWatch({
    control: methods.control,
    name: 'type',
  });

  const availableCategories = React.useMemo(() => {
    return categories?.filter(c => c.type === selectedType && c.active) || [];
  }, [selectedType, categories]);

  React.useEffect(() => {
    const currentCategoryId = methods.getValues('category_id');
    if (currentCategoryId && !availableCategories.some(c => c.id === currentCategoryId)) {
        methods.setValue('category_id', '');
    }
  }, [selectedType, availableCategories, methods]);

  const onSubmit = async (data: BusinessFormValues) => {
    const isEditingMode = !!data.id;
    
    const formData = new FormData();
    
    const appendFormData = (key: string, value: any) => {
        if (value instanceof FileList && value.length > 0) {
            formData.append(key, value[0]);
        } else if (typeof value === 'boolean' || typeof value === 'number') {
            formData.append(key, String(value));
        } else if (value && typeof value !== 'object') {
            formData.append(key, value);
        }
    };
    
    // For updates, remove password fields if they are empty
    if (isEditingMode) {
        delete (data as Partial<BusinessFormValues>).password;
        delete (data as Partial<BusinessFormValues>).passwordConfirmation;
    }

    Object.keys(data).forEach(key => {
        const value = data[key as keyof BusinessFormValues];
        appendFormData(key, value);
    });

    try {
      if (isEditingMode) {
        await updateMutation.mutateAsync({ formData, id: data.id! });
      } else {
        if (!data.password) {
            methods.setError("password", { message: "La contraseña es requerida para nuevos negocios." });
            return;
        }
        await createMutation.mutateAsync(formData);
      }
      router.push("/businesses");
      router.refresh();
    } catch (error) {
      // The error is already handled by the mutation hook (it shows a toast)
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <FormField
                        control={methods.control}
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
                            control={methods.control}
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
                            control={methods.control}
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
                        control={methods.control}
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
                    <FormImageUpload name="logo_url" label="Logo" aspectRatio="square"/>
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
                        control={methods.control}
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
                        control={methods.control}
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
                        control={methods.control}
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
                                control={methods.control}
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
                                control={methods.control}
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
                <CardTitle>Detalles Operativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <FormLabel>Tiempo aprox. de entrega (min)</FormLabel>
                        <div className="flex items-center gap-2">
                            <FormField control={methods.control} name="delivery_time_min" render={({field}) => <FormItem className="flex-1"><FormControl><Input type="number" placeholder="Mín." {...field} /></FormControl><FormMessage /></FormItem>} />
                            <FormField control={methods.control} name="delivery_time_max" render={({field}) => <FormItem className="flex-1"><FormControl><Input type="number" placeholder="Máx." {...field} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                    </div>
                     <FormField control={methods.control} name="average_ticket" render={({field}) => <FormItem><FormLabel>Ticket promedio diario</FormLabel><FormControl><Input type="number" placeholder="Ej. 150.00" {...field} /></FormControl><FormMessage /></FormItem>} />
                     <FormField control={methods.control} name="weekly_demand" render={({field}) => <FormItem><FormLabel>Demanda semanal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="nuevo">Nuevo</SelectItem><SelectItem value="0-10">0-10</SelectItem><SelectItem value="11-50">11-50</SelectItem><SelectItem value="51-100">51-100</SelectItem><SelectItem value="101-200">101-200</SelectItem><SelectItem value="201-500">201-500</SelectItem><SelectItem value="mas de 500">Más de 500</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                     <FormField control={methods.control} name="has_delivery_service" render={({ field }) => (
                        <FormItem className="flex flex-col rounded-lg border p-3 shadow-sm justify-center">
                            <FormLabel>¿Servicio a domicilio propio?</FormLabel>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <FormImageUpload name="business_photo_facade_url" label="Foto de Fachada" aspectRatio="video" />
                    <FormImageUpload name="business_photo_interior_url" label="Foto de Interior" aspectRatio="video" />
                    <FormFileUpload name="digital_menu_url" label="Menú Digitalizado" description="Sube tu menú en PDF o imagen." accept="image/jpeg,image/png,application/pdf" />
                 </div>
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
                        <FormField control={methods.control} name="address_line" render={({ field }) => (<FormItem><FormLabel>Dirección (Calle y Número)</FormLabel><FormControl><Input placeholder="Av. Insurgentes Sur 123" {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={methods.control} name="neighborhood" render={({ field }) => (<FormItem><FormLabel>Colonia</FormLabel><FormControl><Input placeholder="Col. Roma Norte" {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-3 gap-6">
                            <FormField control={methods.control} name="city" render={({ field }) => (<FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={methods.control} name="state" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={methods.control} name="zip_code" render={({ field }) => (<FormItem><FormLabel>C.P.</FormLabel><FormControl><Input placeholder="06700" {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </div>
                     <div>
                        <FormLabel>Geolocalización</FormLabel>
                        <FormControl>
                             <BusinessMap />
                        </FormControl>
                        <FormField control={methods.control} name="latitude" render={() => <FormMessage />} />
                     </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Información Adicional y Fiscal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <FormField control={methods.control} name="tax_id" render={({ field }) => (<FormItem><FormLabel>RFC</FormLabel><FormControl><Input {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={methods.control} name="website" render={({ field }) => (<FormItem><FormLabel>Sitio Web</FormLabel><FormControl><Input type="url" placeholder="https://ejemplo.com" {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={methods.control} name="instagram" render={({ field }) => (<FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="@usuario" {...field} disabled={isPending}/></FormControl><FormMessage /></FormItem>)} />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                     <FormFileUpload name="owner_ine_front_url" label="INE del Propietario (Frente)" />
                     <FormFileUpload name="owner_ine_back_url" label="INE del Propietario (Reverso)" />
                     <FormFileUpload name="tax_situation_proof_url" label="Constancia de Situación Fiscal" accept="application/pdf" />
                 </div>
                 <FormField control={methods.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea placeholder="Anotaciones internas sobre el negocio." className="resize-none" {...field} disabled={isPending} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
        </Card>
        
        <div className="flex items-center justify-end gap-2">
            <FormField
                    control={methods.control}
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
  );
}


export function BusinessFormWrapper({ initialData, categories, zones }: { initialData?: Business | null; categories: BusinessCategory[]; zones: Zone[]; }) {
  const methods = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      id: '',
      name: '',
      type: '' as any,
      category_id: '',
      zone_id: '',
      email: '',
      owner_name: '',
      phone_whatsapp: '',
      address_line: '',
      neighborhood: '',
      city: "Ciudad de México",
      state: "CDMX",
      zip_code: '',
      latitude: 19.4326,
      longitude: -99.1332,
      tax_id: '',
      website: '',
      instagram: '',
      logo_url: undefined,
      notes: '',
      status: "ACTIVE",
      password: '',
      passwordConfirmation: '',
      delivery_time_min: undefined,
      delivery_time_max: undefined,
      has_delivery_service: true,
      average_ticket: undefined,
      weekly_demand: undefined,
      business_photo_facade_url: undefined,
      business_photo_interior_url: undefined,
      digital_menu_url: undefined,
      owner_ine_front_url: undefined,
      owner_ine_back_url: undefined,
      tax_situation_proof_url: undefined,
    },
  });

  useEffect(() => {
    if (initialData && zones.length > 0 && categories.length > 0) {
      methods.reset({
        ...initialData,
        id: initialData.id,
        type: initialData.type || '' as any,
        category_id: initialData.category_id || '',
        zone_id: initialData.zone_id || '',
        password: "",
        passwordConfirmation: "",
        notes: initialData.notes ?? "",
      });
    }
  }, [initialData, zones, categories, methods]);


  return (
    <FormProvider {...methods}>
      <BusinessForm categories={categories} zones={zones} />
    </FormProvider>
  )
}

    