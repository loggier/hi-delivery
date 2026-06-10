"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const businessBenefits = [
  "Tarifas competitivas y transparentes",
  "Seguimiento de pedidos en tiempo real",
  "Mayor cobertura sin contratar flota propia",
];

export function ForBusinesses() {
  return (
    <section id="for-businesses" className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50 to-white py-20 lg:py-28">
      <div className="absolute -right-24 top-28 h-80 w-80 rounded-full bg-sky-100 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-blue-700">
              Para negocios
            </span>
            <h2 className="mt-5 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
              Potencia tus entregas y llega a más clientes.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Con Hi! Delivery conectas tu negocio con repartidores confiables y tecnología operativa para entregar más rápido.
            </p>

            <div className="mt-8 grid gap-4">
              {businessBenefits.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-lg shadow-blue-950/5"
                >
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  <span className="font-semibold text-blue-950">{item}</span>
                </motion.div>
              ))}
            </div>

            <Button asChild size="lg" className="mt-9 h-14 rounded-full bg-blue-600 px-8 font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">
              <Link href="/site/store/apply">
                Registra tu negocio
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden rounded-[2rem] bg-white p-3 shadow-2xl shadow-blue-950/10"
          >
            <Image
              src="/businesses-hid.png"
              alt="Negocio potenciando sus entregas con Hi! Delivery"
              width={1536}
              height={1024}
              sizes="(max-width: 1024px) 100vw, 44vw"
              className="h-auto w-full rounded-[1.5rem] object-cover transition-transform duration-700 hover:scale-[1.025]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
