"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

export function Hero() {
  return (
    <section className="relative h-[80vh] min-h-[500px] w-full">
        <video
          className="absolute inset-0 h-full w-full object-cover brightness-50 scale-[1.2]"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/banner-site-hid.png"
          aria-hidden="true"
        >
          <source src="/banner-site-hid.mp4" type="video/mp4" />
        </video>
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
            Conviértete en Repartidor y Gana a tu Ritmo
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-200">
            Únete a la red de repartidores de Hi! Delivery en Culiacán. Disfruta de horarios flexibles, ganancias competitivas y la libertad de ser tu propio jefe.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/deliveryman/apply">
                Regístrate como Repartidor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link href="/store/apply">
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
