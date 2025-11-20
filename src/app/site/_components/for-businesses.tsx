"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import placeholderImages from "@/lib/placeholder-images.json";

export function ForBusinesses() {
  return (
    <section id="for-businesses" className="py-12 lg:py-24 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Para Negocios
            </span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Potencia tus entregas y llega a más clientes
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Con Hi! Delivery, obtienes acceso a una red de repartidores confiables listos para llevar tus productos directamente a la puerta de tus clientes. Olvídate de la logística de entrega y concéntrate en lo que mejor sabes hacer.
            </p>
            <ul className="mt-6 space-y-2 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">✓ Tarifas competitivas y transparentes.</li>
              <li className="flex items-center gap-2">✓ Seguimiento de pedidos en tiempo real.</li>
              <li className="flex items-center gap-2">✓ Aumenta tu área de cobertura.</li>
            </ul>
            <Button asChild size="lg" className="mt-8">
              <Link href="/site/store/apply">Registra tu Negocio</Link>
            </Button>
          </div>
          <div className="order-1 md:order-2">
             <Image
              src={placeholderImages.businessCollage.src}
              alt={placeholderImages.businessCollage.alt}
              width={600}
              height={450}
              className="rounded-lg shadow-xl"
              data-ai-hint="happy business owner restaurant"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
