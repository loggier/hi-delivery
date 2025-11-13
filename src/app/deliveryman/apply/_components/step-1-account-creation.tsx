"use client";

import React from 'react';
import { FormInput } from './form-components';

export function Step1_AccountCreation() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">1. Crea tu Cuenta</h2>
      <p className="text-sm text-slate-600">
        Comienza con tu información básica. Podrás guardar y continuar más tarde si lo necesitas.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput name="firstName" label="Nombre(s)" placeholder="Ej. Juan" />
        <FormInput name="lastName" label="Apellido Paterno" placeholder="Ej. Pérez" />
        <FormInput name="email" label="Email" type="email" placeholder="tu.email@ejemplo.com" />
        <FormInput name="phoneE164" label="Teléfono Celular (10 dígitos)" type="tel" placeholder="Ej. 5512345678" description="Se usará para notificaciones y contacto."/>
        <FormInput name="password" label="Contraseña" type="password" placeholder="********" description="Mínimo 8 caracteres y una mayúscula, un número o un símbolo."/>
        <FormInput name="passwordConfirmation" label="Confirmar Contraseña" type="password" placeholder="********" />
      </div>
    </div>
  );
}
