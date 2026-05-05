"use client";

import Image from "next/image";
import { UserPlus, ClipboardList, Bike, PackageCheck } from "lucide-react";
import { MotionCard, MotionSection } from "@/components/site-motion";

const steps = [
    {
        icon: <UserPlus className="h-10 w-10 text-primary" />,
        title: "1. Regístrate",
        description: "Completa el formulario en línea con tu información personal, de tu vehículo y documentos. ¡Solo toma unos minutos!",
    },
    {
        icon: <ClipboardList className="h-10 w-10 text-primary" />,
        title: "2. Proceso de Validación",
        description: "Nuestro equipo revisará tu solicitud y documentos. Te notificaremos una vez que tu cuenta sea aprobada.",
    },
    {
        icon: <Bike className="h-10 w-10 text-primary" />,
        title: "3. Conéctate y Recibe Pedidos",
        description: "Descarga la app, inicia sesión y actívate. Empezarás a recibir pedidos de negocios cercanos a tu ubicación.",
    },
     {
        icon: <PackageCheck className="h-10 w-10 text-primary" />,
        title: "4. Entrega y Gana",
        description: "Sigue las instrucciones en la app para recolectar y entregar el pedido. ¡Recibirás tus ganancias cada semana!",
    },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 lg:py-24">
      <div className="container mx-auto px-4">
        <MotionSection className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Empezar es muy Fácil</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Sigue estos sencillos pasos para unirte a nuestra flota.
          </p>
        </MotionSection>
        <MotionSection className="mb-12 overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <Image
            src="/how-it-works-hid.png"
            alt="Flujo de entrega moderno de Hi! Delivery"
            width={1672}
            height={941}
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="h-auto w-full object-cover"
          />
        </MotionSection>
        <div className="relative">
             {/* Desktop Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2" />

            <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
                {steps.map((step, index) => (
                    <MotionCard key={index} className="relative flex flex-col items-center text-center">
                        <div className="z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 bg-white dark:bg-slate-900">
                             {step.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                    </MotionCard>
                ))}
            </div>
        </div>
      </div>
    </section>
  );
}
