"use client";

import React from 'react';
import { FormImageUpload } from './form-components';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, ShieldCheck } from 'lucide-react';

export function Step6_Submit({ isPending }: { isPending: boolean }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">6. Foto de Perfil y Envío</h2>
       <Alert>
          <ShieldCheck className="h-4 w-4"/>
          <AlertTitle>¡Casi terminas!</AlertTitle>
          <AlertDescription>
            Sube tu foto de perfil y revisa que toda tu información sea correcta antes de enviar la solicitud.
          </AlertDescription>
       </Alert>
      <div className="max-w-xs mx-auto">
        <FormImageUpload
          name="avatar1x1Url"
          label="Foto de Perfil (1:1)"
          description="Una foto clara de tu rostro, sin lentes de sol ni gorra."
        />
      </div>

       <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold mb-2">Antes de enviar, confirma que:</h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Toda la información es correcta y verídica.</li>
                <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Las fotos y documentos son claros y legibles.</li>
                <li className="flex items-start"><Check className="h-4 w-4 mr-2 mt-0.5 text-primary shrink-0"/>Aceptas los términos y condiciones del servicio.</li>
            </ul>
        </div>
    </div>
  );
}
