"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Carlos M.",
    role: "Repartidor en Culiacán",
    quote:
      "Con Hi! Delivery, realmente soy dueño de mi tiempo. Puedo trabajar en mis horas libres y ganar un buen dinero extra.",
    tags: ["Culiacán", "Entregas confiables", "Soporte rápido"],
  },
  {
    name: "Luis A.",
    role: "Repartidor en Culiacán",
    quote:
      "Lo que más me gusta es la transparencia en las ganancias. Sé exactamente cuánto voy a ganar por cada pedido.",
    tags: ["Culiacán", "Entregas confiables", "Soporte rápido"],
  },
  {
    name: "Javier L.",
    role: "Repartidor en Culiacán",
    quote:
      "Empecé hace 3 meses y ha sido una gran experiencia. La comunidad de repartidores es muy unida.",
    tags: ["Culiacán", "Entregas confiables", "Soporte rápido"],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function Testimonials() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  React.useEffect(() => {
    if (!isMobile) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMobile]);

  return (
    <section
      id="testimonials"
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
          <span className="mb-4 inline-flex items-center rounded-full border border-[#00d4ff]/20 bg-[#00d4ff]/10 px-4 py-1.5 text-sm font-semibold text-[#00d4ff]">
            Testimonios
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="text-gradient">Lo que dicen nuestros</span>
            <br className="hidden sm:block" />
            <span className="text-white"> repartidores</span>
          </h2>
        </motion.div>

        {/* Desktop Grid / Mobile Carousel */}
        <div className="relative">
          {/* Desktop: 3-col grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-3"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:border-[#00d4ff]/20 hover:shadow-glow lg:p-8"
              >
                {/* Gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00d4ff]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  <Quote className="mb-4 h-10 w-10 text-[#00d4ff] opacity-30" />

                  <p className="text-lg italic leading-relaxed text-white">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10 bg-[#1a1a2e]">
                      <AvatarFallback className="text-sm font-semibold text-[#00d4ff]">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.name}</p>
                      <p className="text-xs text-[#64748b]">{t.role}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#94a3b8]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Mobile: single card with auto-rotation */}
          <div className="md:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative rounded-2xl border border-white/5 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <div className="relative z-10">
                  <Quote className="mb-4 h-10 w-10 text-[#00d4ff] opacity-30" />

                  <p className="text-lg italic leading-relaxed text-white">
                    &ldquo;{testimonials[activeIndex].quote}&rdquo;
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10 bg-[#1a1a2e]">
                      <AvatarFallback className="text-sm font-semibold text-[#00d4ff]">
                        {testimonials[activeIndex].name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {testimonials[activeIndex].name}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        {testimonials[activeIndex].role}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {testimonials[activeIndex].tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-xs font-medium text-[#94a3b8]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ver testimonio ${i + 1}`}
              onClick={() => setActiveIndex(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeIndex === i
                  ? "w-8 bg-[#00d4ff]"
                  : "w-2.5 bg-[#64748b]/40 hover:bg-[#64748b]/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
