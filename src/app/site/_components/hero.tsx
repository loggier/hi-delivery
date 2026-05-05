"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

export function Hero() {
  const { scrollYProgress } = useScroll();
  const videoY = useTransform(scrollYProgress, [0, 0.25], [0, 40]);
  const contentY = useTransform(scrollYProgress, [0, 0.25], [0, -18]);

  return (
    <section className="relative h-[80vh] min-h-[500px] w-full">
        <motion.video
          className="absolute inset-0 h-full w-full object-cover object-center brightness-50 scale-[1.03]"
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
      <div className="relative z-10 flex h-full items-center justify-center">
        <motion.div
          className="container mx-auto px-4 text-center text-white"
          style={{ y: contentY }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-4xl font-extrabold tracking-tight lg:text-6xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
          >
            Conviértete en Repartidor y Gana a tu Ritmo
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl mx-auto text-lg text-slate-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7, ease: "easeOut" }}
          >
            Únete a la red de repartidores de Hi! Delivery en Culiacán. Disfruta de horarios flexibles, ganancias competitivas y la libertad de ser tu propio jefe.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.7, ease: "easeOut" }}
          >
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
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
