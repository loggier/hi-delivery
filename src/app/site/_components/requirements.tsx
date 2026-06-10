"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const requirementsList = [
  "Ser mayor de 18 años",
  "Tener una motocicleta propia o rentada",
  "Licencia de conducir vigente",
  "Tarjeta de circulación y placa en regla",
  "Póliza de seguro de moto vigente",
  "Smartphone con plan de datos",
  "INE/IFE vigente",
  "Comprobante de domicilio",
];

export function Requirements() {
  return (
    <section id="requirements" className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-sky-900 py-20 text-white lg:py-28">
      <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-64 w-full bg-gradient-to-t from-blue-950/70 to-transparent" />
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-orange-200 ring-1 ring-white/15"
            >
              Requisitos
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-5 text-4xl font-black tracking-tight sm:text-5xl"
            >
              Ten listo lo necesario y empieza sin vueltas.
            </motion.h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100/85">
              Reunimos lo indispensable para validar tu perfil y conectar tu cuenta con la operación.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {requirementsList.map((req, index) => (
                <motion.div
                  key={req}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-md"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-blue-950">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-white">{req}</span>
                </motion.div>
              ))}
            </div>

            <Button asChild size="lg" className="mt-9 h-14 rounded-full bg-orange-500 px-8 font-bold text-white shadow-xl shadow-orange-600/25 hover:bg-orange-600">
              <Link href="/site/deliveryman/apply">Comenzar mi Solicitud</Link>
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-lg overflow-hidden rounded-[2rem] bg-white/12 p-3 shadow-2xl shadow-blue-950/30 ring-1 ring-white/15 backdrop-blur-md"
          >
            <Image
              src="/requirements-hid.png"
              alt="Requisitos para repartidores Hi! Delivery"
              width={1122}
              height={1402}
              sizes="(max-width: 1024px) 100vw, 38vw"
              className="h-auto w-full rounded-[1.5rem] object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
