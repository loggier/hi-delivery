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
    answer: "No es necesaria experiencia previa. Solo necesitas cumplir con los requisitos básicos, una motocicleta y muchas ganas de trabajar. Nuestra aplicación te guiará en todo el proceso.",
  },
  {
    question: "¿Cómo y cuándo recibiré mis pagos?",
    answer: "Los pagos se procesan semanalmente y se depositan directamente en la cuenta bancaria que registres. Podrás ver un desglose detallado de tus ganancias en la aplicación.",
  },
  {
    question: "¿Qué tipo de vehículo necesito?",
    answer: "Necesitas una motocicleta en buen estado, con todos los documentos en regla (tarjeta de circulación y placa). También es indispensable contar con licencia de conducir vigente.",
  },
  {
    question: "¿Puedo elegir mi zona de trabajo?",
    answer: "Sí, al registrarte puedes seleccionar la zona de operación principal donde te gustaría recibir pedidos. Sin embargo, también podrás ver oportunidades en zonas aledañas.",
  },
    {
    question: "¿Qué pasa si tengo un problema durante una entrega?",
    answer: "Nuestra aplicación cuenta con un centro de soporte disponible para ayudarte a resolver cualquier inconveniente que puedas tener durante un pedido, desde contactar al cliente hasta problemas con la dirección.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-12 lg:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Preguntas Frecuentes</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Resolvemos tus dudas para que te unas con total confianza.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-lg hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-slate-600 dark:text-slate-400">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
