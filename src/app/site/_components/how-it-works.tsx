"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bike, ClipboardList, PackageCheck, UserPlus } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Regístrate", description: "Completa tu solicitud con datos personales, vehículo y documentos." },
  { icon: ClipboardList, title: "Validamos tu perfil", description: "Revisamos tu información y te notificamos cuando estés aprobado." },
  { icon: Bike, title: "Conéctate", description: "Actívate desde la app y recibe pedidos cercanos a tu ubicación." },
  { icon: PackageCheck, title: "Entrega y gana", description: "Sigue la ruta, confirma la entrega y recibe tus ganancias." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-600"
          >
            Cómo funciona
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-5 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl"
          >
            Empezar es simple, operar es aún más fácil.
          </motion.h2>
          <p className="mt-4 text-lg text-slate-600">De tu registro al primer pedido en cuatro pasos claros.</p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="relative grid gap-5">
            <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-1 rounded-full bg-gradient-to-b from-blue-500 via-sky-400 to-orange-400 sm:block" />
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="relative rounded-3xl border border-blue-100 bg-white p-6 pl-6 shadow-xl shadow-blue-950/5 sm:pl-20"
              >
                <div className="absolute left-0 top-6 hidden h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 sm:flex">
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-black text-orange-500">0{index + 1}</span>
                <h3 className="mt-1 text-xl font-black text-blue-950">{step.title}</h3>
                <p className="mt-2 text-slate-600">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-blue-950 p-3 shadow-2xl shadow-blue-950/20"
          >
            <Image
              src="/how-it-works-hid.png"
              alt="Proceso de entrega de Hi! Delivery"
              width={1672}
              height={941}
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="h-auto w-full rounded-[1.5rem] object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
