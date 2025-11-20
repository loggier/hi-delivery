
"use client";
import { Suspense } from 'react';
import { Bike } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step6_Submit } from "../_components/step-6-submit";

function SubmitPageContent() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
              <Bike className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 6: Foto de Perfil y Envío</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
             ¡El último paso! Sube tu foto y envía tu solicitud para revisión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step6_Submit />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function SubmitPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SubmitPageContent />
        </Suspense>
    )
}
