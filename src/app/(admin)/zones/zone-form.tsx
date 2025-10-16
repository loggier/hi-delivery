
"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useLoadScript, GoogleMap, DrawingManager, Autocomplete, Polygon } from '@react-google-maps/api';
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { type Zone } from "@/types";
import { zoneSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ZoneFormValues = z.infer<typeof zoneSchema>;

interface ZoneFormProps {
  initialData?: Zone | null;
}

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const GeofenceMap = ({ value, onChange }: { value?: any; onChange: (value: any) => void; }) => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries,
    });
    
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [mapTypeId, setMapTypeId] = useState<google.maps.MapTypeId>('roadmap');
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);
    const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

    const center = useMemo(() => {
        if (value && value.length > 0 && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            value.forEach((coord: { lat: number, lng: number }) => bounds.extend(coord));
            return bounds.getCenter().toJSON();
        }
        return { lat: 19.4326, lng: -99.1332 }; // Mexico City
    }, [value]);

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);
    }, []);

    const onPolygonComplete = useCallback((polygon: google.maps.Polygon) => {
        const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        polygon.setMap(null); 
        onChange(path);
        
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
        }
    }, [onChange]);


    const clearGeofence = () => {
        if (polygonRef.current) {
            polygonRef.current.setMap(null);
        }
        onChange(undefined);
    }
    
     const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current && map) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry?.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else if (place.geometry?.location) {
                map.setCenter(place.geometry.location);
                map.setZoom(12); 
            }
        }
    };
    
    useEffect(() => {
        return () => {
            listenersRef.current.forEach(listener => listener.remove());
        };
    }, []);

    const onPolygonLoad = (polygon: google.maps.Polygon) => {
        polygonRef.current = polygon;
        const path = polygon.getPath();
        listenersRef.current.push(
            path.addListener('set_at', () => {
                const newPath = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                onChange(newPath);
            }),
            path.addListener('insert_at', () => {
                const newPath = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                onChange(newPath);
            }),
             path.addListener('remove_at', () => {
                const newPath = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                onChange(newPath);
            })
        );
    }

    const onPolygonUnmount = () => {
        listenersRef.current.forEach(listener => listener.remove());
        polygonRef.current = null;
    }
    
    if (loadError) return <div>Error cargando el mapa. Por favor, revisa la API Key de Google Maps.</div>;
    if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

    return (
        <div className="relative">
            <GoogleMap
                mapContainerStyle={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
                center={center}
                zoom={12}
                onLoad={onMapLoad}
                mapTypeId={mapTypeId}
                options={{
                    mapTypeControl: false,
                    streetViewControl: false,
                }}
            >
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-80">
                    <Autocomplete
                        onLoad={onAutocompleteLoad}
                        onPlaceChanged={onPlaceChanged}
                    >
                        <Input
                            type="text"
                            placeholder="Buscar una ubicación..."
                            className="shadow-md"
                        />
                    </Autocomplete>
                </div>
                
                <div className="absolute top-3 left-3 z-10 flex rounded-md shadow-md bg-white">
                    <Button type="button" onClick={() => setMapTypeId('roadmap')} variant="ghost" className={cn("rounded-r-none", mapTypeId === 'roadmap' && 'bg-slate-200')}>Mapa</Button>
                    <Separator orientation="vertical" className="h-auto"/>
                    <Button type="button" onClick={() => setMapTypeId('satellite')} variant="ghost" className={cn("rounded-l-none", mapTypeId === 'satellite' && 'bg-slate-200')}>Satélite</Button>
                </div>

                
                {isLoaded && (
                    <DrawingManager
                        onPolygonComplete={onPolygonComplete}
                        options={{
                          drawingControl: true,
                          drawingControlOptions: {
                              position: window.google.maps.ControlPosition.TOP_CENTER,
                              drawingModes: [
                                  window.google.maps.drawing.DrawingMode.POLYGON,
                              ],
                          },
                          polygonOptions: {
                              fillColor: "hsl(var(--gh-primary))",
                              fillOpacity: 0.2,
                              strokeColor: "hsl(var(--gh-primary))",
                              strokeWeight: 2,
                              editable: false,
                              draggable: false,
                          },
                        }}
                    />
                )}

                {value && (
                    <Polygon
                        paths={value}
                        editable
                        draggable
                        onLoad={onPolygonLoad}
                        onUnmount={onPolygonUnmount}
                         onMouseUp={() => {
                            if (polygonRef.current) {
                                const newPath = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                                onChange(newPath);
                            }
                        }}
                         onDragEnd={() => {
                            if (polygonRef.current) {
                                const newPath = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
                                onChange(newPath);
                            }
                        }}
                        options={{
                            fillColor: "hsl(var(--gh-primary))",
                            fillOpacity: 0.2,
                            strokeColor: "hsl(var(--gh-primary))",
                            strokeWeight: 2,
                        }}
                    />
                )}
            </GoogleMap>
            {value && (
                <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
                    onClick={clearGeofence}
                    >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar Geocerca
                </Button>
            )}
        </div>
    );
};


export function ZoneForm({ initialData }: ZoneFormProps) {
  const router = useRouter();
  const createMutation = api.zones.useCreate();
  const updateMutation = api.zones.useUpdate();

  const isEditing = !!initialData;
  const formAction = isEditing ? "Guardar cambios" : "Crear zona";

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: initialData || {
      name: "",
      status: "ACTIVE",
      geofence: undefined,
    },
  });


  const onSubmit = async (data: ZoneFormValues) => {
    try {
      if (isEditing && initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data);
      }
      router.push("/zones");
      router.refresh();
    } catch (error) {
      console.error("No se pudo guardar la zona", error);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles de la Zona</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre de la Zona</FormLabel>
                                <FormControl>
                                <Input placeholder="Ej. San Pedro Garza García" {...field} disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Activo</SelectItem>
                                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Geocerca</CardTitle>
                        <CardDescription>Dibuja el polígono que delimita el área de operación de esta zona en el mapa.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <FormField
                            control={form.control}
                            name="geofence"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <GeofenceMap {...field} />
                                    </FormControl>
                                    <FormMessage className="mt-2"/>
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
        
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
