"use client";

import { motion } from "framer-motion";
import { Wallet, Clock, Bike, Smartphone } from "lucide-react";

const benefits = [
  {
    icon: Wallet,
    title: "Gana Dinero Extra",
    description:
      "Genera ingresos semanales con tarifas competitivas y transparentes.",
    iconBg: "bg-[#00d4ff]/20",
    iconColor: "text-[#00d4ff]",
  },
  {
    icon: Clock,
    title: "Horarios Flexibles",
    description:
      "Tú decides cuándo y cuánto tiempo conectar. Adapta los horarios a tu vida.",
    iconBg: "bg-[#ff6b00]/20",
    iconColor: "text-[#ff6b00]",
  },
  {
    icon: Bike,
    title: "Tú Eres Tu Propio Jefe",
    description:
      "Disfruta de la libertad de ser un contratista independiente.",
    iconBg: "bg-[#00ff88]/20",
    iconColor: "text-[#00ff88]",
  },
  {
    icon: Smartphone,
    title: "Tecnología Fácil de Usar",
    description:
      "Nuestra app te guía en cada paso, desde la aceptación hasta la entrega.",
    iconBg: "bg-[#8b5cf6]/20",
    iconColor: "text-[#8b5cf6]",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Benefits() {
  return (
    <section id="benefits" className="relative py-24 lg:py-32 bg-[#0a0a0f] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial opacity-50 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        {/* Placeholder image area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl p-[1px] bg-gradient-to-r from-[#00d4ff]/30 to-[#ff6b00]/30 mb-16"
        >
          <div className="w-full h-64 md:h-80 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center">
            <span className="text-[#64748b] text-lg font-medium">
              Imagen de repartidor sonriente — próximamente
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-gradient">
            Ventajas de ser un Repartidor Asociado
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8]">
            Descubre por qué Hi! Delivery es la mejor opción para ti.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-6"
        >
          {/* Top 2 large cards */}
          {benefits.slice(0, 2).map((benefit, index) => (
            <motion.div
              key={index}
              variants={cardVariant}
              className="lg:col-span-2 lg:row-span-2"
            >
              <div className="glass-dark rounded-2xl p-6 lg:p-8 h-full min-h-[280px] lg:min-h-[320px] border border-transparent hover:border-[#00d4ff]/30 hover:shadow-glow hover-lift transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div
                    className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full ${benefit.iconBg}`}
                  >
                    <benefit.icon className={`h-7 w-7 ${benefit.iconColor}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-[#94a3b8] text-lg leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Bottom 2 smaller cards */}
          {benefits.slice(2, 4).map((benefit, index) => (
            <motion.div
              key={index + 2}
              variants={cardVariant}
              className="lg:col-span-2 lg:row-span-1"
            >
              <div className="glass-dark rounded-2xl p-6 lg:p-8 h-full min-h-[200px] border border-transparent hover:border-[#00d4ff]/30 hover:shadow-glow hover-lift transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${benefit.iconBg}`}
                  >
                    <benefit.icon className={`h-6 w-6 ${benefit.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-[#94a3b8] leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
