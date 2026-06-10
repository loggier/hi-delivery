"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bike, Clock, Smartphone, Wallet } from "lucide-react";

const benefits = [
  {
    icon: Wallet,
    title: "Gana dinero extra",
    description: "Tarifas claras, pagos semanales y visibilidad de tus ganancias desde la app.",
  },
  {
    icon: Clock,
    title: "Horarios flexibles",
    description: "Conéctate cuando quieras y trabaja en los horarios que mejor encajan contigo.",
  },
  {
    icon: Bike,
    title: "Muévete en tu zona",
    description: "Recibe solicitudes cercanas y optimiza tus rutas con una operación local.",
  },
  {
    icon: Smartphone,
    title: "App fácil de usar",
    description: "Acepta pedidos, navega y confirma entregas con una experiencia simple y rápida.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="relative overflow-hidden bg-gradient-to-b from-white via-sky-50/70 to-white py-20 lg:py-28">
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="overflow-hidden rounded-[2rem] bg-white p-3 shadow-2xl shadow-blue-950/10"
          >
            <Image
              src="/benefits-hid.png"
              alt="Beneficios de trabajar con Hi! Delivery"
              width={1672}
              height={941}
              sizes="(max-width: 1024px) 100vw, 46vw"
              className="h-auto w-full rounded-[1.5rem] object-cover"
            />
          </motion.div>

          <div>
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700"
            >
              Repartidores asociados
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.05, duration: 0.55 }}
              className="mt-5 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl"
            >
              Ventajas reales para moverte mejor y ganar más.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="mt-5 text-lg leading-8 text-slate-600"
            >
              Una plataforma local, flexible y transparente para repartidores que quieren generar ingresos sin complicarse.
            </motion.p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: index * 0.06, duration: 0.45 }}
                  className="rounded-3xl border border-blue-100 bg-white p-6 shadow-lg shadow-blue-950/5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-blue-950">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
