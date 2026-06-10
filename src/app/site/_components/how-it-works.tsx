"use client";

import { motion } from "framer-motion";
import { UserPlus, ClipboardList, Bike, PackageCheck } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Regístrate",
    description:
      "Completa el formulario en línea con tu información. ¡Solo toma unos minutos!",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Proceso de Validación",
    description:
      "Nuestro equipo revisa tu solicitud. Te notificamos cuando tu cuenta sea aprobada.",
  },
  {
    number: "03",
    icon: Bike,
    title: "Conéctate y Recibe",
    description:
      "Descarga la app, inicia sesión y actívate. Recibe pedidos de negocios cercanos.",
  },
  {
    number: "04",
    icon: PackageCheck,
    title: "Entrega y Gana",
    description:
      "Sigue las instrucciones en la app. ¡Recibirás tus ganancias cada semana!",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32 bg-gradient-mesh overflow-hidden">
      <div className="container mx-auto px-4 relative">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-gradient">
            Empezar es muy Fácil
          </h2>
          <p className="mt-4 text-lg text-[#94a3b8]">
            Sigue estos sencillos pasos para unirte a nuestra flota.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Timeline */}
          <div className="lg:col-span-3">
            {/* Desktop alternating timeline */}
            <div className="relative hidden lg:block">
              {/* Central line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00d4ff] to-[#ff6b00] -translate-x-1/2" />

              {steps.map((step, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex items-center py-10"
                  >
                    {/* Content side */}
                    <div
                      className={`w-5/12 ${
                        isLeft
                          ? "pr-12 text-right"
                          : "order-3 pl-12 text-left"
                      }`}
                    >
                      <div className="relative glass-dark rounded-2xl p-6 inline-block w-full border border-transparent hover:border-[#00d4ff]/20 hover:shadow-glow transition-all duration-300">
                        {/* Large background number */}
                        <span className="absolute -top-4 -right-4 text-8xl font-bold text-white/5 select-none pointer-events-none">
                          {step.number}
                        </span>
                        <div
                          className={`flex items-center gap-4 mb-3 ${
                            isLeft ? "justify-end" : "justify-start"
                          }`}
                        >
                          <h3 className="text-xl font-bold text-white">
                            {step.title}
                          </h3>
                          <div className="h-10 w-10 rounded-full bg-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff] shrink-0">
                            <step.icon className="h-5 w-5" />
                          </div>
                        </div>
                        <p className="text-[#94a3b8]">{step.description}</p>
                      </div>
                    </div>

                    {/* Center dot */}
                    <div className="w-2/12 flex justify-center order-2">
                      <div className="h-4 w-4 rounded-full bg-[#00d4ff] border-4 border-[#0a0a0f] z-10 shadow-glow" />
                    </div>

                    {/* Empty side */}
                    <div
                      className={`w-5/12 ${
                        isLeft ? "order-3" : "order-1"
                      }`}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile stacked timeline */}
            <div className="lg:hidden relative pl-10">
              {/* Left line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00d4ff] to-[#ff6b00]" />

              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="relative mb-12 last:mb-0"
                >
                  {/* Icon dot */}
                  <div className="absolute left-4 top-0 -translate-x-1/2 h-10 w-10 rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/50 flex items-center justify-center text-[#00d4ff] z-10">
                    <step.icon className="h-5 w-5" />
                  </div>

                  {/* Card */}
                  <div className="ml-10 relative glass-dark rounded-2xl p-6 border border-transparent">
                    <span className="absolute -top-2 -right-2 text-6xl font-bold text-white/5 select-none pointer-events-none">
                      {step.number}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-[#94a3b8]">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right side placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-2 flex items-center"
          >
            <div className="w-full h-full min-h-[400px] glass-dark rounded-2xl flex items-center justify-center border border-white/5">
              <span className="text-[#64748b] text-lg font-medium text-center px-6">
                Flujo de la app — próximamente
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
