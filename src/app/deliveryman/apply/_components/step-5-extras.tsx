"use client";

import React from 'react';
import { FormField, FormControl } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const ExtraCheckbox = ({ name, label }: { name: string, label: string }) => (
    <FormField
        name={name}
        render={({ field }) => (
             <div className="flex items-center space-x-3 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                        id={name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
                <Label htmlFor={name} className="font-normal">
                    {label}
                </Label>
            </div>
        )}
    />
);

export function Step5_Extras() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">5. Equipo Adicional</h2>
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
