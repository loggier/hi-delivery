"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Necesito tener experiencia previa como repartidor?",
    answer:
      "No es necesaria. Solo necesitas cumplir con los requisitos básicos y tener muchas ganas de trabajar.",
  },
  {
    question: "¿Cómo y cuándo recibiré mis pagos?",
    answer:
      "Los pagos se procesan semanalmente y se depositan directamente en tu cuenta bancaria.",
  },
  {
    question: "¿Qué tipo de vehículo necesito?",
    answer:
      "Necesitas una motocicleta en buen estado, con todos los documentos en regla.",
  },
  {
    question: "¿Puedo elegir mi zona de trabajo?",
    answer:
      "Sí, al registrarte puedes seleccionar tu zona de operación principal.",
  },
  {
    question: "¿Qué pasa si tengo un problema durante una entrega?",
    answer:
      "Nuestra app cuenta con un centro de soporte disponible para ayudarte.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function Faq() {
  return (
    <section
      id="faq"
      className="relative overflow-hidden py-20 lg:py-28"
      style={{ background: "#0a0a0f" }}
    >
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/30 to-transparent" />

      <div className="container relative z-10 mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-gradient">Preguntas Frecuentes</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-lg text-[#94a3b8]">
            Resolvemos tus dudas para que te unas con total confianza.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
          className="mx-auto max-w-3xl"
        >
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <motion.div key={index} variants={itemVariants}>
                <AccordionItem
                  value={`item-${index}`}
                  className="group overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-xl transition-all duration-300 data-[state=open]:border-[#00d4ff]/30 data-[state=open]:shadow-glow"
                >
                  {/* Cyan left border on active */}
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-[#00d4ff] opacity-0 transition-opacity duration-300 group-data-[state=open]:opacity-100" />

                  <AccordionTrigger className="relative px-6 py-5 text-left text-base font-bold text-white hover:no-underline md:text-lg [&[data-state=open]>svg]:rotate-45">
                    <span className="pr-4">{faq.question}</span>
                    {/* Custom plus/minus icon */}
                    <span className="relative ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 transition-all duration-300 group-data-[state=open]:border-[#00d4ff]/30 group-data-[state=open]:bg-[#00d4ff]/10">
                      <span className="absolute h-0.5 w-3 bg-white/60 transition-all duration-300 group-data-[state=open]:bg-[#00d4ff]" />
                      <span className="absolute h-3 w-0.5 bg-white/60 transition-all duration-300 group-data-[state=open]:rotate-90 group-data-[state=open]:bg-[#00d4ff]" />
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="overflow-hidden text-sm text-[#94a3b8] transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="px-6 pb-5 pt-0 leading-relaxed">
                      {faq.answer}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
