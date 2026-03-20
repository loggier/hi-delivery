

"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2, Save, Trash, X, PlusCircle, Pencil } from "lucide-react";
import { useLoadScript } from '@react-google-maps/api';
import { faker } from "@faker-js/faker";


import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { type Zone, type Area } from "@/types";
import { zoneSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { GeofenceMap } from "./geofence-map";
import { useConfirm } from "@/hooks/use-confirm";
import { areaColors } from "@/lib/constants";

const libraries: ('drawing' | 'places')[] = ['drawing', 'places'];
type ZoneFormValues = z.infer<typeof zoneSchema>;

export function ZoneForm({ initialData }: { initialData?: Zone | null }) {
  const router = useRouter();
  const createZoneMutation = api.zones.useCreate();
  const updateZoneMutation = api.zones.useUpdate();
  const createAreaMutation = api.areas.useCreate();
  const updateAreaMutation = api.areas.useUpdate();
  const deleteAreaMutation = api.areas.useDelete();
  const [ConfirmationDialog, confirm] = useConfirm();

  const [isDrawingArea, setIsDrawingArea] = useState(false);
  const [newAreaGeofence, setNewAreaGeofence] = useState<{ lat: number; lng: number }[] | null>(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaColor, setNewAreaColor] = useState(areaColors[0]);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");
  const [editingAreaColor, setEditingAreaColor] = useState(areaColors[0]);
  const [editingAreaGeofence, setEditingAreaGeofence] = useState<{ lat: number; lng: number }[] | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | undefined>();
  const [mapZoom, setMapZoom] = useState(12);

   const { isLoaded, loadError } = useLoadScript({
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      libraries,
  });

  const isEditing = !!initialData;

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: initialData || { id: `zone-${faker.string.uuid()}`, name: '', status: 'INACTIVE', geofence: [] },
  });

   useEffect(() => {
    if (isLoaded && initialData?.geofence && initialData.geofence.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        initialData.geofence.forEach(coord => bounds.extend(coord));
        setMapCenter(bounds.getCenter().toJSON());
    } else if (isLoaded) {
        setMapCenter({ lat: 19.4326, lng: -99.1332 });
    }
  }, [initialData, isLoaded]);

  const onZoneSubmit = async (data: ZoneFormValues) => {
    if (isEditing) {
      await updateZoneMutation.mutateAsync({ ...data, id: initialData.id });
       router.push('/zones');
       router.refresh();
    } else {
      await createZoneMutation.mutateAsync(data, {
        onSuccess: (newZone) => {
          router.push(`/zones/${newZone.id}/edit`);
        }
      });
    }
  };

  const handleSaveNewArea = async () => {
    if (!newAreaName || !newAreaGeofence || !initialData) {
      alert("Por favor, asigna un nombre y dibuja la geocerca para la nueva área.");
      return;
    }

    await createAreaMutation.mutateAsync({
        id: `area-${faker.string.uuid()}`,
        zone_id: initialData.id,
        name: newAreaName,
        status: 'ACTIVE',
        geofence: newAreaGeofence,
        color: newAreaColor,
    });

    setNewAreaName("");
    setNewAreaGeofence(null);
    setNewAreaColor(areaColors[0]);
    setIsDrawingArea(false);
  };

  const handleStartEditArea = (area: Area) => {
    setIsDrawingArea(false);
    setNewAreaGeofence(null);
    setNewAreaName("");
    setEditingArea(area);
    setEditingAreaName(area.name);
    setEditingAreaColor(area.color || areaColors[0]);
    setEditingAreaGeofence(area.geofence || []);
  };

  const handleCancelEditArea = () => {
    setEditingArea(null);
    setEditingAreaName("");
    setEditingAreaColor(areaColors[0]);
    setEditingAreaGeofence(null);
  };

  const handleSaveEditedArea = async () => {
    if (!editingArea || !editingAreaName || !editingAreaGeofence) {
      return;
    }

    await updateAreaMutation.mutateAsync({
      id: editingArea.id,
      name: editingAreaName,
      color: editingAreaColor,
      geofence: editingAreaGeofence,
    });

    handleCancelEditArea();
  };
  
  const handleDeleteArea = async (areaId: string, areaName: string) => {
      const ok = await confirm({
          title: `¿Eliminar Área "${areaName}"?`,
          description: "Esta acción es irreversible.",
          confirmVariant: "destructive",
          confirmText: "Eliminar"
      });
      if (ok) {
          deleteAreaMutation.mutate(areaId);
      }
  }

  const handleMapStateChange = useCallback(() => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      if (center) setMapCenter(center.toJSON());
      if (zoom) setMapZoom(zoom);
    }
  }, []);
  
  const isPending = updateZoneMutation.isPending || createAreaMutation.isPending || updateAreaMutation.isPending || createZoneMutation.isPending;

  return (
    <>
      <ConfirmationDialog />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onZoneSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Zona</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Zona</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
               <div className="flex items-end">
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2"/>}
                        {isEditing ? "Guardar Cambios" : "Crear y Continuar"}
                    </Button>
               </div>
            </CardContent>
          </Card>

          {isEditing && (
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Áreas de Operación</CardTitle>
                    <CardDescription>Define cuadrantes o sub-zonas para una mejor logística.</CardDescription>
                </div>
                <Button type="button" variant={isDrawingArea ? "secondary" : "outline"} onClick={() => {
                    setIsDrawingArea(!isDrawingArea);
                    setNewAreaGeofence(null);
                    if (!isDrawingArea) {
                      handleCancelEditArea();
                      const existingAreasCount = initialData?.areas?.length || 0;
                      setNewAreaColor(areaColors[existingAreasCount % areaColors.length]);
                    }
                    }}>
                    {isDrawingArea ? <X className="mr-2"/> : <PlusCircle className="mr-2" />}
                    {isDrawingArea ? "Cancelar Creación" : "Añadir Nueva Área"}
                </Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {initialData?.areas && initialData.areas.length > 0 ? (
                        initialData.areas.map((area: Area) => (
                        <TableRow key={area.id}>
                            <TableCell>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: area.color || '#CCCCCC' }}/>
                                {area.name}
                            </div>
                            </TableCell>
                            <TableCell><Badge variant={area.status === 'ACTIVE' ? 'success' : 'outline'}>{area.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleStartEditArea(area)}>
                                    <Pencil className="h-4 w-4"/>
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteArea(area.id, area.name)}>
                                    <Trash className="text-destructive"/>
                                </Button>
                              </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={3} className="text-center h-24">No hay áreas definidas.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
                {isDrawingArea && (
                    <CardContent className="border-t pt-6 bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-grow">
                            <Label>Nombre de la Nueva Área</Label>
                            <Input value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} placeholder="Ej. Cuadrante Centro"/>
                        </div>
                        <div className="w-full sm:w-52">
                            <Label>Color</Label>
                            <Select value={newAreaColor} onValueChange={setNewAreaColor}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {areaColors.map((color) => (
                                        <SelectItem key={color} value={color}>
                                            <div className="flex items-center gap-2">
                                                <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: color }} />
                                                {color}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" onClick={handleSaveNewArea} disabled={!newAreaName || !newAreaGeofence || isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2"/> Guardar Área
                            </Button>
                        </div>
                    </div>
                    </CardContent>
                )}
                {editingArea && (
                    <CardContent className="border-t pt-6 bg-slate-50 dark:bg-slate-900">
                      <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                          <div className="flex-grow">
                            <Label>Nombre del Área</Label>
                            <Input value={editingAreaName} onChange={(e) => setEditingAreaName(e.target.value)} placeholder="Ej. Cuadrante Centro" />
                          </div>
                          <div className="w-full lg:w-52">
                            <Label>Color</Label>
                            <Select value={editingAreaColor} onValueChange={setEditingAreaColor}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {areaColors.map((color) => (
                                        <SelectItem key={color} value={color}>
                                            <div className="flex items-center gap-2">
                                                <span className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: color }} />
                                                {color}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={handleCancelEditArea}>
                              Cancelar
                            </Button>
                            <Button type="button" onClick={handleSaveEditedArea} disabled={!editingAreaName || !editingAreaGeofence || isPending}>
                              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                              <Save className="mr-2"/> Guardar Área
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Puedes editar el nombre, cambiar el color y ajustar el polígono directamente en el mapa arrastrando sus vértices.
                        </p>
                      </div>
                    </CardContent>
                )}
            </Card>
          )}
          
          <Separator />

          <FormField
            control={form.control}
            name="geofence"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xl font-bold">Geocerca de la Zona Principal</FormLabel>
                <FormDescription>
                  Dibuja el polígono principal de la zona. Puedes editarlo arrastrando sus puntos. Las áreas (sub-zonas) se mostrarán en otro color.
                </FormDescription>
                <FormControl>
                    <GeofenceMap
                        isLoaded={isLoaded}
                        loadError={loadError}
                        mainGeofence={field.value}
                        onMainGeofenceChange={field.onChange}
                        subGeofences={initialData?.areas}
                        isDrawing={isDrawingArea}
                        isCreatingZone={!isEditing}
                        newAreaPath={newAreaGeofence}
                        onDrawingComplete={(path) => {
                            setNewAreaGeofence(path);
                        }}
                        editableArea={editingArea && editingAreaGeofence ? {
                          id: editingArea.id,
                          geofence: editingAreaGeofence,
                          color: editingAreaColor,
                        } : null}
                        onEditableAreaChange={setEditingAreaGeofence}
                        onMapLoad={map => (mapRef.current = map)}
                        onMapDragEnd={handleMapStateChange}
                        onMapZoomChanged={handleMapStateChange}
                        mapCenter={mapCenter}
                        mapZoom={mapZoom}
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </FormProvider>
    </>
  );
}
