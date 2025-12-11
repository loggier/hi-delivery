
"use client";

import React, { useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GeofenceMap } from './geofence-map';
import { areaSchema } from '@/lib/schemas';
import { type Area } from '@/types';
import { api } from '@/lib/api';

type AreaFormValues = z.infer<typeof areaSchema>;

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneId: string;
  initialData?: Area | null;
}

export function AreaFormModal({ isOpen, onClose, zoneId, initialData }: AreaFormModalProps) {
  const createMutation = api.areas.useCreate();
  const updateMutation = api.areas.useUpdate();
  
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        zone_id: zoneId,
      });
    } else {
      form.reset({
        zone_id: zoneId,
        name: '',
        status: 'ACTIVE',
        geofence: undefined,
      });
    }
  }, [initialData, zoneId, form, isOpen]);

  const onSubmit = async (data: AreaFormValues) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync({ ...data, id: initialData.id });
      } else {
        await createMutation.mutateAsync(data as any);
      }
      onClose();
    } catch (error) {
      // Error is handled by the mutation hook's toast
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Área' : 'Crear Nueva Área'}</DialogTitle>
          <DialogDescription>
            Define un nombre y un polígono en el mapa para esta sub-zona.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Área</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Cuadrante Centro" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>
            <FormField
              control={form.control}
              name="geofence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geocerca del Área</FormLabel>
                  <FormControl>
                    <GeofenceMap {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Guardando...' : 'Guardar Área'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
