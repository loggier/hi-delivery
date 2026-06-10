"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const requirementsList = [
  "Ser mayor de 18 años",
  "Tener una motocicleta propia o rentada",
  "Licencia de Conducir vigente",
  "Tarjeta de circulación y placa en regla",
  "Póliza de seguro de moto vigente",
  "Smartphone con plan de datos",
  "INE/IFE vigente",
  "Comprobante de domicilio",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, x: -30 },
  show: { opacity: 1, x: 0 },
};

export function Requirements() {
  return (
    <section
      id="requirements"
      className="relative py-24 lg:py-32 bg-gradient-mesh overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-radial opacity-40 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">
          {/* Left side — checklist */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="mb-10"
            >
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-gradient">
                ¿Qué necesitas para empezar?
              </h2>
              <p className="mt-4 text-lg text-[#94a3b8]">
                Asegúrate de tener todo listo para que tu registro sea rápido.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {requirementsList.map((req, index) => (
                <motion.div
                  key={index}
                  variants={itemVariant}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="glass-dark rounded-xl p-4 flex items-center gap-4 border border-transparent hover:border-[#00ff88]/30 hover:shadow-glow hover-lift transition-all duration-300"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00ff88]/20 text-[#00ff88]">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-white text-sm sm:text-base">
                    {req}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10"
            >
              <Link
                href="/site/deliveryman/apply"
                className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#00d4ff] to-[#00ff88] hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5"
              >
                Comenzar mi Solicitud
              </Link>
            </motion.div>
          </div>

          {/* Right side — placeholder image */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2"
          >
            <div className="w-full h-96 lg:h-[560px] rounded-2xl bg-gradient-radial from-[#1a1a2e] to-[#16213e] flex items-center justify-center border border-white/5">
              <span className="text-[#64748b] text-lg font-medium text-center px-6">
                Repartidor con documentos — próximamente
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
