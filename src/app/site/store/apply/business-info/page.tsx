
"use client";
import { Suspense } from 'react';
import { Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step2_BusinessInfo } from "../_components/step-2-business-info";

function BusinessInfoPageContent() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
              <Store className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 2: Información del Negocio</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
             Completa los datos principales de tu negocio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step2_BusinessInfo />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function BusinessInfoPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <BusinessInfoPageContent />
    </Suspense>
  )
}
