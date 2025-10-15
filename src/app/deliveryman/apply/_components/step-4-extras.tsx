"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

const ExtraCheckbox = ({ name, label }: { name: string, label: string }) => (
    <FormField
        name={name}
        render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
                <div className="space-y-1 leading-none">
                    <FormLabel>{label}</FormLabel>
                </div>
            </FormItem>
        )}
    />
);

export function Step4_Extras() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">4. Equipo Adicional</h2>
      <p className="text-sm text-slate-600">
        Marca el equipo con el que ya cuentas. Esto es opcional pero puede ayudarte en tu proceso.
      </p>
      <div className="space-y-4">
        <ExtraCheckbox name="hasHelmet" label="Cuento con casco de seguridad" />
        <ExtraCheckbox name="hasUniform" label="Cuento con uniforme (propio o de Hubs)" />
        <ExtraCheckbox name="hasBox" label="Cuento con caja de reparto" />
      </div>
    </div>
  );
}
