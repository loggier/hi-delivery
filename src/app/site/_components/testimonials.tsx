import Image from 'next/image';
import { Quote } from 'lucide-react';
import { Reveal } from './reveal';

const testimonials = [
  { name: 'Carlos M.', quote: 'Con Hi! Delivery soy dueño de mi tiempo. Puedo conectarme en mis horas libres y generar ingresos extra sin complicarme.', avatar: '/testimonial-1.png' },
  { name: 'Luis A.', quote: 'Lo que más me gusta es la transparencia. Antes de aceptar sé cuánto gano y la app me guía durante todo el pedido.', avatar: '/testimonial-2.png' },
  { name: 'Javier L.', quote: 'La operación es muy clara y el soporte responde rápido. Me siento acompañado mientras trabajo en la calle.', avatar: '/testimonial-3.png' },
];

export function Testimonials() {
  return <section id="testimonials" className="site-section" aria-labelledby="testimonials-title"><div className="site-container">
    <Reveal className="site-section-heading"><h2 id="testimonials-title">Lo que dicen nuestros repartidores.</h2></Reveal>
    <div className="site-quotes">{testimonials.map((item, index) => <Reveal key={item.name} delay={index * 0.06}><figure className="site-quote"><Quote aria-hidden="true" /><blockquote>{item.quote}</blockquote><figcaption><Image src={item.avatar} alt="" width={48} height={48} /><div><strong>{item.name}</strong><span>Repartidor en Culiacán</span></div></figcaption></figure></Reveal>)}</div>
  </div></section>;
}
