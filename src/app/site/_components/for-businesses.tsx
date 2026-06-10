"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const bulletPoints = [
  "Tarifas competitivas y transparentes.",
  "Seguimiento de pedidos en tiempo real.",
  "Aumenta tu área de cobertura.",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function ForBusinesses() {
  return (
    <section
      id="for-businesses"
      className="relative overflow-hidden py-20 lg:py-28"
      style={{ background: "#0a0a0f" }}
    >
      {/* Radial gradient background */}
      <div className="bg-gradient-radial absolute inset-0 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/80 to-[#0a0a0f]" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left — Text */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={containerVariants}
          >
            <motion.span
              variants={itemVariants}
              className="mb-4 inline-flex items-center rounded-full border border-[#00d4ff]/20 bg-[#00d4ff]/10 px-4 py-1.5 text-sm font-semibold text-[#00d4ff]"
            >
              Para Negocios
            </motion.span>

            <motion.h2
              variants={itemVariants}
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              <span className="text-gradient">Potencia tus entregas</span>
              <br />
              <span className="text-white">y llega a más clientes</span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-lg text-lg leading-relaxed text-[#94a3b8]"
            >
              Con Hi! Delivery, obtienes acceso a una red de repartidores confiables. Olvídate de la logística y concéntrate en lo que mejor sabes hacer.
            </motion.p>

            <motion.ul
              variants={itemVariants}
              className="mt-8 space-y-4"
            >
              {bulletPoints.map((point, i) => (
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-start gap-3 text-[#94a3b8]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff6b00]/15">
                    <Check className="h-3.5 w-3.5 text-[#ff6b00]" />
                  </span>
                  <span className="text-base">{point}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={itemVariants} className="mt-10">
              <Link
                href="/site/store/apply"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#ff4500] px-7 py-3.5 text-sm font-semibold text-white shadow-glow-orange transition-all hover:brightness-110"
              >
                Registra tu Negocio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right — Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-[#ff6b00]/20 bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f172a]/80 p-6 shadow-glow-orange backdrop-blur-xl md:p-8">
              {/* Mockup header bar */}
              <div className="mb-6 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ff6b00]/60" />
                <div className="h-3 w-3 rounded-full bg-[#00d4ff]/60" />
                <div className="h-3 w-3 rounded-full bg-[#00ff88]/60" />
                <div className="ml-4 h-2.5 w-24 rounded-full bg-white/10" />
              </div>

              {/* Abstract dashboard UI */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {/* Stat cards */}
                <div className="glass-dark rounded-xl p-3 md:p-4">
                  <div className="h-2 w-12 rounded-full bg-[#00d4ff]/30" />
                  <div className="mt-3 h-6 w-16 rounded-md bg-[#00d4ff]/10" />
                  <div className="mt-2 h-2 w-8 rounded-full bg-white/10" />
                </div>
                <div className="glass-dark rounded-xl p-3 md:p-4">
                  <div className="h-2 w-12 rounded-full bg-[#ff6b00]/30" />
                  <div className="mt-3 h-6 w-16 rounded-md bg-[#ff6b00]/10" />
                  <div className="mt-2 h-2 w-8 rounded-full bg-white/10" />
                </div>
                <div className="glass-dark rounded-xl p-3 md:p-4">
                  <div className="h-2 w-12 rounded-full bg-[#00ff88]/30" />
                  <div className="mt-3 h-6 w-16 rounded-md bg-[#00ff88]/10" />
                  <div className="mt-2 h-2 w-8 rounded-full bg-white/10" />
                </div>

                {/* Chart area */}
                <div className="glass-dark col-span-3 rounded-xl p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="h-2.5 w-24 rounded-full bg-white/10" />
                    <div className="h-2.5 w-12 rounded-full bg-[#00d4ff]/20" />
                  </div>
                  <div className="flex items-end gap-2 h-24 md:h-32">
                    <div className="w-full rounded-t-md bg-[#00d4ff]/20" style={{ height: "40%" }} />
                    <div className="w-full rounded-t-md bg-[#00d4ff]/30" style={{ height: "65%" }} />
                    <div className="w-full rounded-t-md bg-[#00d4ff]/40" style={{ height: "50%" }} />
                    <div className="w-full rounded-t-md bg-[#00d4ff]/50" style={{ height: "80%" }} />
                    <div className="w-full rounded-t-md bg-[#00d4ff]/60" style={{ height: "60%" }} />
                    <div className="w-full rounded-t-md bg-[#ff6b00]/40" style={{ height: "90%" }} />
                    <div className="w-full rounded-t-md bg-[#ff6b00]/50" style={{ height: "75%" }} />
                  </div>
                </div>

                {/* Bottom row */}
                <div className="glass-dark col-span-2 rounded-xl p-3 md:p-4">
                  <div className="h-2 w-20 rounded-full bg-white/10" />
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#00ff88]/15" />
                    <div className="h-2 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="glass-dark rounded-xl p-3 md:p-4">
                  <div className="h-2 w-12 rounded-full bg-[#ff6b00]/30" />
                  <div className="mt-3 h-8 w-8 rounded-full bg-[#ff6b00]/15" />
                </div>
              </div>

              {/* Center label */}
              <div className="mt-6 flex items-center justify-center">
                <span className="text-xs font-medium tracking-wide text-[#64748b] uppercase">
                  Dashboard de negocio — próximamente
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
