"use client";

import React from 'react';
import { FormInput, FormDatePicker, FormSelect, FormFileUpload } from './form-components';

export function Step1_PersonalInfo() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">1. Información Personal</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput name="firstName" label="Nombre(s)" placeholder="Ej. Juan" />
        <FormInput name="lastName" label="Apellido Paterno" placeholder="Ej. Pérez" />
        <FormInput name="motherLastName" label="Apellido Materno (Opcional)" placeholder="Ej. García" />
        <FormDatePicker name="birthDate" label="Fecha de Nacimiento" />
        <FormSelect
          name="zone"
          label="Zona de Operación"
          placeholder="Selecciona tu zona"
          options={['Monterrey', 'Culiacan', 'Mazatlan']}
        />
        <FormInput name="address" label="Dirección Completa" placeholder="Calle, número, colonia, C.P." className="md:col-span-2" />
        <FormFileUpload name="ineFrontUrl" label="Frente de tu INE" description="Asegúrate que sea legible."/>
        <FormFileUpload name="ineBackUrl" label="Reverso de tu INE" description="Asegúrate que sea legible."/>
        <FormFileUpload name="proofOfAddressUrl" label="Comprobante de Domicilio" description="No mayor a 3 meses. (CFE, Agua, Teléfono)" />
      </div>
    </div>
  );
}
