
"use client";
import { Suspense } from 'react';
import { Store } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step3_LocationInfo } from "../_components/step-3-location-info";

function LocationInfoPageContent() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
              <Store className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 3: Ubicación y Contacto</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
             Define dónde se encuentra tu negocio y cómo te pueden contactar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step3_LocationInfo />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}


export default function LocationInfoPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LocationInfoPageContent />
    </Suspense>
  )
}

