"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import placeholderImages from "@/lib/placeholder-images.json";
import { ArrowRight, Store } from "lucide-react";

export function Hero() {
  return (
    <section className="relative h-[80vh] min-h-[500px] w-full">
        <Image
          src={placeholderImages.heroRider.src}
          alt={placeholderImages.heroRider.alt}
          fill
          style={{objectFit:"cover"}}
          className="brightness-50"
          data-ai-hint="motorcycle delivery city"
        />
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
            Conviértete en Repartidor y Gana a tu Ritmo
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-200">
            Únete a la red de repartidores de Hi! Delivery. Disfruta de horarios flexibles, ganancias competitivas y la libertad de ser tu propio jefe.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/site/deliveryman/apply">
                Regístrate como Repartidor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="/site/store/apply">
                <Store className="mr-2 h-5 w-5" />
                Soy un Negocio
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
