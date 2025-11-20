"use client";

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const testimonials = [
  {
    name: "Carlos M.",
    role: "Repartidor en Monterrey",
    quote: "Con Hi! Delivery, realmente soy dueño de mi tiempo. Puedo trabajar en mis horas libres y ganar un buen dinero extra para mis estudios. La app es súper fácil de usar.",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
  },
  {
    name: "Ana Sofía R.",
    role: "Repartidora en Culiacán",
    quote: "Lo que más me gusta es la transparencia en las ganancias. Sé exactamente cuánto voy a ganar por cada pedido antes de aceptarlo. El soporte también es muy rápido.",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026705d",
  },
  {
    name: "Javier L.",
    role: "Repartidor en Mazatlán",
    quote: "Empecé hace 3 meses y ha sido una gran experiencia. La comunidad de repartidores es muy unida y la empresa realmente se preocupa por nosotros. ¡Lo recomiendo!",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026706d",
  },
];


export function Testimonials() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  return (
    <section id="testimonials" className="py-12 lg:py-24 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
             <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que dicen nuestros repartidores</h2>
             </div>
            <Carousel
                plugins={[plugin.current]}
                className="w-full max-w-4xl mx-auto"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
            >
                <CarouselContent>
                {testimonials.map((testimonial, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1">
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                                     <p className="text-lg font-medium text-slate-700 dark:text-slate-300">"{testimonial.quote}"</p>
                                     <div className="flex items-center gap-3 pt-4">
                                        <Avatar>
                                            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                                        </div>
                                     </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CarouselItem>
                ))}
                </CarouselContent>
            </Carousel>
        </div>
    </section>
  );
}
