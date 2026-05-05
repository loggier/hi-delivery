"use client";

import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Wallet, Zap, Smartphone, Bike } from "lucide-react";
import { MotionCard, MotionSection } from "@/components/site-motion";

const benefits = [
  {
    icon: <Wallet className="h-8 w-8 text-primary" />,
    title: "Gana Dinero Extra",
    description: "Genera ingresos semanales con tarifas competitivas y transparentes. Tus ganancias se depositan directamente en tu cuenta.",
  },
  {
    icon: <Clock className="h-8 w-8 text-primary" />,
    title: "Horarios Flexibles",
    description: "Tú decides cuándo y cuánto tiempo conectarte. Adapta los horarios de entrega a tu vida, no al revés.",
  },
  {
    icon: <Bike className="h-8 w-8 text-primary" />,
    title: "Tú Eres Tu Propio Jefe",
    description: "Disfruta de la libertad de ser un contratista independiente. Acepta los pedidos que quieras y gestiona tu tiempo.",
  },
  {
    icon: <Smartphone className="h-8 w-8 text-primary" />,
    title: "Tecnología Fácil de Usar",
    description: "Nuestra app para repartidores es intuitiva y te guía en cada paso, desde la aceptación del pedido hasta la entrega final.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="py-12 lg:py-24 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <MotionSection className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ventajas de ser un Repartidor Asociado</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Descubre por qué Hi! Delivery es la mejor opción para ti.
          </p>
        </MotionSection>
        <MotionSection className="mb-12 overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <Image
            src="/benefits-hid.png"
            alt="Repartidor usando la app de Hi! Delivery"
            width={1672}
            height={941}
            sizes="(max-width: 1024px) 100vw, 80vw"
            className="h-auto w-full object-cover"
          />
        </MotionSection>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <MotionCard key={index}>
              <Card className="text-center transition-shadow duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    {benefit.icon}
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription className="pt-2">{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}
