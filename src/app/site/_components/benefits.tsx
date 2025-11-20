"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Wallet, Zap, Smartphone, Bike } from "lucide-react";

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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ventajas de ser un Repartidor Asociado</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Descubre por qué Hi! Delivery es la mejor opción para ti.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  {benefit.icon}
                </div>
                <CardTitle>{benefit.title}</CardTitle>
                <CardDescription className="pt-2">{benefit.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
