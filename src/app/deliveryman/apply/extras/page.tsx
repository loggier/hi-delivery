
"use client";
import { Suspense } from 'react';
import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step5_Extras } from "../_components/step-5-extras";

function ExtrasPageContent() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
              <Icons.Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 5: Equipo Adicional</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
             Indícanos si ya cuentas con equipo de reparto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step5_Extras />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ExtrasPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ExtrasPageContent />
        </Suspense>
    )
}
