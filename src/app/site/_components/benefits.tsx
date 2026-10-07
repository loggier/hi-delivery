import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Bike, Clock, Smartphone, Wallet } from 'lucide-react';
import { Reveal } from './reveal';

const benefits = [
  { icon: Wallet, title: 'Gana dinero extra', description: 'Tarifas claras, pagos semanales y visibilidad de tus ganancias desde la app.' },
  { icon: Clock, title: 'Horarios flexibles', description: 'Conéctate cuando quieras y trabaja en los horarios que mejor encajan contigo.' },
  { icon: Bike, title: 'Muévete en tu zona', description: 'Recibe solicitudes cercanas y optimiza tus rutas con una operación local.' },
  { icon: Smartphone, title: 'App fácil de usar', description: 'Acepta pedidos, navega y confirma entregas con una experiencia simple y rápida.' },
];

export function Benefits() {
  return <section id="benefits" className="site-section" aria-labelledby="rider-title"><div className="site-container">
    <div className="site-rider-grid">
      <Reveal className="site-rider-image"><Image src="/benefits-hid.png" alt="Beneficios de trabajar con Hi! Delivery" fill sizes="(max-width: 760px) 90vw, 42vw" /></Reveal>
      <Reveal className="site-rider-copy"><p className="site-eyebrow">Repartidores asociados</p><h2 id="rider-title">Muévete mejor.<br />Gana a tu ritmo.</h2><p>Una plataforma local, flexible y transparente para repartidores que quieren generar ingresos sin complicarse.</p>
        <div className="site-rider-benefits">{benefits.map(item => <div key={item.title}><item.icon aria-hidden="true" /><h3>{item.title}</h3><p>{item.description}</p></div>)}</div>
        <Link href="/site/deliveryman/apply" className="site-button">Quiero ser Repartidor <ArrowUpRight aria-hidden="true" /></Link>
      </Reveal>
    </div>
  </div></section>;
}
