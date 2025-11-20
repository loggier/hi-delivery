"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import placeholderImages from "@/lib/placeholder-images.json";

const requirementsList = [
    "Ser mayor de 18 años",
    "Tener una motocicleta propia o rentada",
    "Contar con Licencia de Conducir vigente",
    "Tarjeta de circulación y placa en regla",
    "Póliza de seguro de moto vigente",
    "Smartphone (iOS o Android) con plan de datos",
    "INE/IFE vigente",
    "Comprobante de domicilio",
];

export function Requirements() {
  return (
    <section id="requirements" className="py-12 lg:py-24 bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Qué necesitas para empezar?
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Asegúrate de tener todo listo para que tu proceso de registro sea rápido y sin contratiempos.
            </p>
            <ul className="mt-8 space-y-4">
              {requirementsList.map((req, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white mr-3 mt-1 flex-shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300">{req}</span>
                </li>
              ))}
            </ul>
             <Button asChild size="lg" className="mt-8">
              <Link href="/site/deliveryman/apply">Comenzar mi Solicitud</Link>
            </Button>
          </div>
          <div className="flex justify-center">
            <Image
              src={placeholderImages.riderDocuments.src}
              alt={placeholderImages.riderDocuments.alt}
              width={500}
              height={500}
              className="rounded-lg shadow-xl object-cover"
              data-ai-hint="motorcycle gear documents"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
