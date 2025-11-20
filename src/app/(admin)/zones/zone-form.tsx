"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useLoadScript, GoogleMap, DrawingManager, Autocomplete, Polygon } from '@react-google-maps/api';
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { type Zone } from "@/types";
import { zoneSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ZoneFormValues = z.infer<typeof zoneSchema>;
interface ZoneFormProps { initialData?: Zone | null; }

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];

const GeofenceMap = ({ value, onChange }: { value?: any; onChange: (value: any) => void; }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    const roadmapMapType = new google.maps.ImageMapType({
      getTileUrl: function (coord, zoom) {
        if (!coord || zoom === undefined) return null;
        const tilesPerGlobe = 1 << zoom;
        let x = coord.x % tilesPerGlobe;
        if (x < 0) x = tilesPerGlobe + x;
        return `https://mt0.google.com/vt/lyrs=m&x=${x}&y=${coord.y}&z=${zoom}&s=Ga`;
      },
      tileSize: new google.maps.Size(256, 256),
      name: "Roadmap",
      maxZoom: 22
    });

    const satelliteMapType = new google.maps.ImageMapType({
      getTileUrl: function (coord, zoom) {
        if (!coord || zoom === undefined) return null;
        const tilesPerGlobe = 1 << zoom;
        let x = coord.x % tilesPerGlobe;
        if (x < 0) x = tilesPerGlobe + x;
        const subdomain = ['mt0', 'mt1', 'mt2', 'mt3'][coord.x % 4];
        return `https://${subdomain}.google.com/vt/lyrs=y&x=${x}&y=${coord.y}&z=${zoom}&s=Ga`;
      },
      tileSize: new google.maps.Size(256, 256),
      name: 'Satellite',
      maxZoom: 22
    });

    mapInstance.mapTypes.set("roadmap", roadmapMapType);
    mapInstance.mapTypes.set("satellite", satelliteMapType);

    setMap(mapInstance);
  }, []);

  useEffect(() => {
    if (map) map.setMapTypeId(mapTypeId);
  }, [map, mapTypeId]);

  const onPolygonComplete = useCallback((poly: google.maps.Polygon) => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
    }
    polygonRef.current = poly;
    const path = poly.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    onChange(path);

    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  }, [onChange]);

  const onDrawingManagerLoad = useCallback((dm: google.maps.drawing.DrawingManager) => {
    // Si hubiera uno previo (StrictMode o remount), desmontar antes
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
    }
    drawingManagerRef.current = dm;
  }, []);

  const onDrawingManagerUnmount = useCallback(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
      drawingManagerRef.current = null;
    }
  }, []);

  const clearGeofence = () => {
    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }
    onChange(undefined);
  };

  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current && map) {
      const place = autocompleteRef.current.getPlace();
      if (place?.geometry?.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else if (place?.geometry?.location) {
        map.setCenter(place.geometry.location);
        map.setZoom(12);
      }
    }
  };

  const onPolygonEdit = () => {
    if (polygonRef.current) {
      const newPath = polygonRef.current.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
      onChange(newPath);
    }
  };

  // ⚠️ Memoriza las opciones para evitar recrear controles en cada render
  const drawingOptions = useMemo(() => {
    if (!isLoaded || !window.google) return undefined;
    return {
      drawingControl: true,
      drawingControlOptions: {
        position: window.google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ["polygon"] as google.maps.drawing.OverlayType[],
      },
      polygonOptions: {
        fillColor: "#04AAF1",
        fillOpacity: 0.35,
        strokeColor: "#E33739",
        strokeWeight: 2,
        clickable: true,
        editable: true,
        zIndex: 1,
      },
    } as google.maps.drawing.DrawingManagerOptions;
  }, [isLoaded]);

  if (loadError) return <div>Error cargando el mapa. Por favor, revisa la API Key de Google Maps.</div>;
  if (!isLoaded) return <Skeleton className="h-[500px] w-full" />;

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{ height: '500px', width: '100%', borderRadius: '0.5rem' }}
        center={value?.[0] || { lat: 25.738, lng: -100.45 }}
        zoom={12}
        onLoad={onMapLoad}
        options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: true }}
      >
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col gap-4 items-center">
          <div className="w-80">
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
                <input
                    type="text"
                    placeholder="Buscar una ubicación..."
                    className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                        "shadow-md"
                    )}
                />
            </Autocomplete>
          </div>
          <div className="flex rounded-md shadow-md bg-white">
            <Button type="button" onClick={() => setMapTypeId('roadmap')} variant="ghost" className={cn("rounded-r-none", mapTypeId === 'roadmap' && 'bg-slate-200')}>Mapa</Button>
            <Separator orientation="vertical" className="h-auto" />
            <Button type="button" onClick={() => setMapTypeId('satellite')} variant="ghost" className={cn("rounded-l-none", mapTypeId === 'satellite' && 'bg-slate-200')}>Satélite</Button>
          </div>
        </div>

        {map && drawingOptions && (
          <DrawingManager
            onLoad={onDrawingManagerLoad}
            onUnmount={onDrawingManagerUnmount}
            onPolygonComplete={onPolygonComplete}
            options={drawingOptions}
          />
        )}

        {value && (
          <Polygon
            paths={value}
            editable
            draggable
            onMouseUp={onPolygonEdit}
            onDragEnd={onPolygonEdit}
            onLoad={(p) => (polygonRef.current = p)}
            onUnmount={() => (polygonRef.current = null)}
            options={{
              fillColor: "#04AAF1",
              fillOpacity: 0.2,
              strokeColor: "#E33739",
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
          className="absolute top-4 right-4 z-10"
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
    defaultValues: initialData || { name: "", status: "ACTIVE", geofence: undefined },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        geofence: initialData.geofence || undefined,
      });
    }
  }, [initialData, form]);

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
              <CardHeader><CardTitle>Detalles de la Zona</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Zona</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. San Pedro Garza García" {...field} disabled={isPending} />
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
                          <SelectTrigger><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
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
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : formAction}</Button>
        </div>
      </form>
    </Form>
  );
}
