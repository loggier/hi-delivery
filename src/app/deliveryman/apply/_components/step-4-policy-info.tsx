"use client";

import React from 'react';
import { FormInput, FormFutureDatePicker, FormFileUpload } from './form-components';

export function Step4_PolicyInfo() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">4. Póliza de Seguro</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput name="insurer" label="Aseguradora" placeholder="Ej. Quálitas, GNP, AXA..." />
        <FormInput name="policyNumber" label="Número de Póliza" placeholder="Ej. 9876543210" />
        <FormFutureDatePicker name="policyValidUntil" label="Vigencia de la Póliza" />
        <FormFileUpload name="policyFirstPageUrl" label="Carátula de la Póliza" description="Sube la primera página o carátula de tu póliza de seguro vigente."/>
      </div>
    </div>
  );
}
