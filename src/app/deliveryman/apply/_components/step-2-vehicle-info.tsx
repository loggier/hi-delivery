"use client";

import React from 'react';
import { useWatch } from 'react-hook-form';
import { FormInput, FormSelect, FormFutureDatePicker, FormFileUpload, FormMultiImageUpload } from './form-components';
import { vehicleBrands, vehicleYears } from '@/lib/constants';

export function Step2_VehicleInfo() {
  const brand = useWatch({ name: 'brand' });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">2. Información del Vehículo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          name="ownership"
          label="El vehículo es..."
          placeholder="Selecciona una opción"
          options={[
            { value: "propia", label: "Propio" },
            { value: "rentada", label: "Rentado" },
            { value: "prestada", label: "Prestado" },
          ]}
        />
        <div />

        <FormSelect name="brand" label="Marca de la Moto" placeholder="Selecciona la marca" options={vehicleBrands} />
        {brand === 'Otra' && (
            <FormInput name="brandOther" label="Especifica la marca" placeholder="Ej. BMW" />
        )}
        <FormSelect name="year" label="Año" placeholder="Selecciona el año" options={vehicleYears} />
        <FormInput name="model" label="Modelo" placeholder="Ej. N-Max" />
        <FormInput name="color" label="Color" placeholder="Ej. Negro" />
        <FormInput name="plate" label="Placa" placeholder="Ej. ABC-123-DE" />
        <div />

        <FormFileUpload name="licenseFrontUrl" label="Licencia de Conducir (Frente)" />
        <FormFileUpload name="licenseBackUrl" label="Licencia de Conducir (Reverso)" />
        <FormFutureDatePicker name="licenseValidUntil" label="Vigencia de la Licencia" />
        <div />
        
        <FormFileUpload name="circulationCardFrontUrl" label="Tarjeta de Circulación (Frente)" />
        <FormFileUpload name="circulationCardBackUrl" label="Tarjeta de Circulación (Reverso)" />
        
        <div className="md:col-span-2">
            <FormMultiImageUpload name="motoPhotos" label="Fotos de tu Moto (4)" description="Sube 4 fotos: frente, atrás, lado izquierdo y lado derecho." count={4}/>
        </div>
      </div>
    </div>
  );
}
