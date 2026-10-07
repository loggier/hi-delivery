import Image from 'next/image';
import { Reveal } from './reveal';

const benefits = [
  { title: 'Tarifas competitivas y transparentes', description: 'Conecta tu negocio con la operación de Hi! Delivery.', image: '/businesses-hid.png', alt: 'Negocio gestionando sus pedidos' },
  { title: 'Seguimiento de pedidos en tiempo real', description: 'Tecnología operativa para acompañar tus entregas.', image: '/how-it-works-hid.png', alt: 'Operación de Hi! Delivery' },
  { title: 'Mayor cobertura sin contratar flota propia', description: 'Repartidores confiables para llegar a más clientes.', image: '/banner-site-hid.png', alt: 'Repartidor de Hi! Delivery en ruta' },
];

export function ForBusinesses() {
  return <section id="for-businesses" className="site-section" aria-labelledby="business-title">
    <div className="site-container">
      <Reveal className="site-section-heading"><p className="site-eyebrow">Para negocios</p><h2 id="business-title">Potencia tus entregas.</h2><p>Con Hi! Delivery conectas tu negocio con repartidores confiables y tecnología operativa para entregar más rápido.</p></Reveal>
      <div className="site-business-cards">{benefits.map((benefit, index) => <Reveal key={benefit.title} delay={index * 0.06}>
        <article className="site-business-card"><div className="site-card-image"><Image src={benefit.image} alt={benefit.alt} fill sizes="(max-width: 760px) 110px, 30vw" /></div><div className="site-card-copy"><h3>{benefit.title}</h3><p>{benefit.description}</p></div></article>
      </Reveal>)}</div>
    </div>
  </section>;
}
