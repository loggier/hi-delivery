"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Bike, Store, Wallet } from "lucide-react";

const heroStats = [
  { label: "Pagos semanales", icon: Wallet },
  { label: "Rutas en tu zona", icon: Bike },
  { label: "Soporte operativo", icon: BadgeCheck },
];

export function Hero() {
  const { scrollYProgress } = useScroll();
  const videoY = useTransform(scrollYProgress, [0, 0.25], [0, 36]);
  const contentY = useTransform(scrollYProgress, [0, 0.25], [0, -16]);

  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-[#071a33] text-white">
      <motion.video
        className="absolute inset-0 h-full w-full scale-[1.04] object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/banner-site-hid.png"
        aria-hidden="true"
        style={{ y: videoY }}
      >
        <source src="/banner-site-hid.mp4" type="video/mp4" />
      </motion.video>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,18,42,0.92)_0%,rgba(5,35,79,0.82)_42%,rgba(5,35,79,0.42)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/70 to-transparent" />
      <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-sky-400/25 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-orange-400/15 blur-3xl" />

      <div className="relative z-10 flex min-h-[88vh] items-center pt-10">
        <motion.div
          className="container mx-auto grid items-center gap-10 px-4 py-20 lg:grid-cols-[1fr_420px]"
          style={{ y: contentY }}
        >
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-blue-950/20 backdrop-blur-md"
            >
              <Image src="/logo-hid.png" alt="Hi! Delivery" width={24} height={24} className="h-6 w-6" />
              Repartidores asociados en Culiacán
            </motion.div>

            <motion.h1
              className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-white drop-shadow-2xl sm:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.65, ease: "easeOut" }}
            >
              Conviértete en repartidor y gana a tu ritmo.
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-lg leading-8 text-blue-50/90 sm:text-xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.65, ease: "easeOut" }}
            >
              Únete a la red de Hi! Delivery. Recibe pedidos cerca de ti,
              administra tus horarios y entrega con una plataforma local hecha
              para moverte mejor.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.65, ease: "easeOut" }}
            >
              <Button asChild size="lg" className="h-14 rounded-full bg-orange-500 px-8 text-base font-bold text-white shadow-2xl shadow-orange-600/30 hover:bg-orange-600">
                <Link href="/site/deliveryman/apply">
                  Regístrate como Repartidor
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-14 rounded-full bg-white px-8 text-base font-bold text-blue-950 shadow-2xl hover:bg-blue-50">
                <Link href="/site/store/apply">
                  <Store className="mr-2 h-5 w-5" />
                  Soy un Negocio
                </Link>
              </Button>
            </motion.div>

            <motion.div
              className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.65, ease: "easeOut" }}
            >
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/15 bg-white/12 p-4 shadow-xl shadow-blue-950/20 backdrop-blur-md">
                  <item.icon className="mb-3 h-5 w-5 text-orange-300" />
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: 40, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ delay: 0.35, duration: 0.75, ease: "easeOut" }}
          >
            <div className="rounded-[2rem] border border-white/20 bg-white/14 p-4 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
              <Image
                src="/repartidor.png"
                alt="Repartidor Hi! Delivery"
                width={600}
                height={600}
                className="h-auto w-full rounded-[1.5rem] object-cover"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
