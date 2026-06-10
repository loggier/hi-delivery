"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Necesito tener experiencia previa como repartidor?",
    answer: "No es necesaria. Solo necesitas cumplir con los requisitos básicos, tener una motocicleta y muchas ganas de trabajar.",
  },
  {
    question: "¿Cómo y cuándo recibiré mis pagos?",
    answer: "Los pagos se procesan semanalmente y podrás consultar tus ganancias desde la app.",
  },
  {
    question: "¿Qué tipo de vehículo necesito?",
    answer: "Necesitas una motocicleta en buen estado, con licencia vigente, tarjeta de circulación, placa y seguro.",
  },
  {
    question: "¿Puedo elegir mi zona de trabajo?",
    answer: "Sí. Al registrarte puedes indicar tu zona principal para recibir pedidos cercanos a tu operación.",
  },
  {
    question: "¿Qué pasa si tengo un problema durante una entrega?",
    answer: "La app y el equipo de soporte te ayudan a resolver incidencias durante el pedido.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-gradient-to-b from-sky-50 to-white py-20 lg:py-28">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-12 text-center">
          <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-600">FAQ</span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-blue-950 sm:text-5xl">Preguntas frecuentes</h2>
          <p className="mt-4 text-lg text-slate-600">Resolvemos tus dudas para que te unas con total confianza.</p>
        </div>
        <Accordion type="single" collapsible className="grid gap-4">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-3xl border border-blue-100 bg-white px-6 shadow-lg shadow-blue-950/5">
              <AccordionTrigger className="text-left text-lg font-black text-blue-950 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-7 text-slate-600">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
