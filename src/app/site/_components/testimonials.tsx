"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Carlos M.",
    role: "Repartidor en Culiacán",
    quote: "Con Hi! Delivery soy dueño de mi tiempo. Puedo conectarme en mis horas libres y generar ingresos extra sin complicarme.",
    avatar: "/testimonial-1.png",
  },
  {
    name: "Luis A.",
    role: "Repartidor en Culiacán",
    quote: "Lo que más me gusta es la transparencia. Antes de aceptar sé cuánto gano y la app me guía durante todo el pedido.",
    avatar: "/testimonial-2.png",
  },
  {
    name: "Javier L.",
    role: "Repartidor en Culiacán",
    quote: "La operación es muy clara y el soporte responde rápido. Me siento acompañado mientras trabajo en la calle.",
    avatar: "/testimonial-3.png",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">Testimonios</span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">
            Lo que dicen nuestros repartidores.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className="rounded-[2rem] border border-blue-100 bg-gradient-to-b from-white to-sky-50/70 p-7 shadow-xl shadow-blue-950/6"
            >
              <Quote className="h-10 w-10 text-blue-500" />
              <p className="mt-6 text-lg font-semibold leading-8 text-blue-950">“{testimonial.quote}”</p>
              <div className="mt-8 flex items-center gap-4">
                <Image src={testimonial.avatar} alt={testimonial.name} width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-4 ring-white" />
                <div>
                  <p className="font-black text-blue-950">{testimonial.name}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
