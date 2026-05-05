"use client";

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Carlos M.",
    role: "Repartidor en Culiacán",
    quote: "Con Hi! Delivery, realmente soy dueño de mi tiempo. Puedo trabajar en mis horas libres y ganar un buen dinero extra para mis estudios. La app es súper fácil de usar.",
    avatar: "/testimonial-1.png",
  },
  {
    name: "Luis A.",
    role: "Repartidor en Culiacán",
    quote: "Lo que más me gusta es la transparencia en las ganancias. Sé exactamente cuánto voy a ganar por cada pedido antes de aceptarlo. El soporte también es muy rápido.",
    avatar: "/testimonial-2.png",
  },
  {
    name: "Javier L.",
    role: "Repartidor en Culiacán",
    quote: "Empecé hace 3 meses y ha sido una gran experiencia. La comunidad de repartidores es muy unida y la empresa realmente se preocupa por nosotros. ¡Lo recomiendo!",
    avatar: "/testimonial-3.png",
  },
];


export function Testimonials() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )
  const [api, setApi] = React.useState<any>(null)
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    if (!api) {
      return
    }

    const onSelect = () => setSelectedIndex(api.selectedScrollSnap())

    onSelect()
    api.on("select", onSelect)
    api.on("reInit", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api])

  return (
    <section id="testimonials" className="bg-slate-50 py-12 dark:bg-slate-900 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Testimonios
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Lo que dicen nuestros repartidores
          </h2>
        </div>

        <div className="relative mx-auto max-w-6xl">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            setApi={setApi}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index}>
                  <motion.div
                    className="p-1"
                    animate={
                      selectedIndex === index
                        ? { opacity: 1, scale: 1, y: 0 }
                        : { opacity: 0.55, scale: 0.98, y: 10 }
                    }
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                      <CardContent className="grid gap-0 p-0 md:grid-cols-[280px_1fr]">
                        <div className="relative flex min-h-[280px] items-end overflow-hidden bg-[linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(239,246,255,0.92))] p-6 md:min-h-[360px]">
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(59,130,246,0.08),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.18),_rgba(255,255,255,0.82))]" />
                          <div className="relative w-full">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                              <Quote className="h-3.5 w-3.5" />
                              Repartidor activo
                            </div>
                            <div className="flex items-center gap-4">
                              <Avatar className="h-20 w-20 border-2 border-white shadow-xl ring-4 ring-slate-100">
                                <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="text-slate-900">
                                <p className="text-2xl font-semibold">{testimonial.name}</p>
                                <p className="text-sm text-slate-500">{testimonial.role}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-6 p-8 md:p-10">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={testimonial.quote}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="max-w-3xl text-xl leading-relaxed text-slate-700 dark:text-slate-200 md:text-2xl"
                            >
                              "{testimonial.quote}"
                            </motion.p>
                          </AnimatePresence>

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                              Culiacán
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Entregas confiables
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Soporte rápido
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-3 hidden h-11 w-11 border-slate-200 bg-white shadow-lg md:flex dark:border-slate-700 dark:bg-slate-950" />
            <CarouselNext className="-right-3 hidden h-11 w-11 border-slate-200 bg-white shadow-lg md:flex dark:border-slate-700 dark:bg-slate-950" />
          </Carousel>

          <div className="mt-6 flex items-center justify-center gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Ir al testimonio ${index + 1}`}
                onClick={() => api?.scrollTo(index)}
                className={`h-2.5 rounded-full transition-all ${
                  selectedIndex === index
                    ? "w-8 bg-primary"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
