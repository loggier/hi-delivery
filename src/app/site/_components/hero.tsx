import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, MapPin, Truck, WalletCards } from 'lucide-react';
import { Reveal } from './reveal';

export function Hero() {
  return <section className="site-hero" aria-labelledby="site-hero-title">
    <div className="site-container site-hero-grid">
      <Reveal className="site-hero-copy">
        <p className="site-eyebrow">Para negocios · Hi! Delivery</p>
        <h1 id="site-hero-title">Potencia tus<br className="site-desktop-break" /> entregas y llega<br className="site-desktop-break" /> <span>a más clientes.</span></h1>
        <p className="site-hero-description">Con Hi! Delivery conectas tu negocio con repartidores confiables y tecnología operativa para entregar más rápido.</p>
        <div className="site-signup" id="registro">
          <h2>Registra tu negocio</h2>
          <ol aria-label="Etapas de registro"><li><b>1</b>Tu cuenta</li><li><b>2</b>Tu negocio</li><li><b>3</b>Ubicación</li><li><b>4</b>Envío</li></ol>
          <Link className="site-button" href="/site/store/apply">Comenzar mi registro <ArrowUpRight aria-hidden="true" /></Link>
          <p>¿Quieres ser repartidor? <Link href="#benefits">Conoce los beneficios <ArrowRight aria-hidden="true" /></Link></p>
        </div>
      </Reveal>
      <Reveal className="site-hero-visual" delay={0.12}>
        <div className="site-hero-main-image"><Image src="/businesses-hid.png" alt="Negocio preparando sus pedidos para entrega" fill sizes="(max-width: 760px) 90vw, 46vw" priority /></div>
        <div className="site-hero-seal" aria-hidden="true"><strong>Hi!</strong><span>Delivery</span></div>
        <div className="site-hero-rider-image"><Image src="/banner-site-hid.png" alt="Repartidor de Hi! Delivery en ruta" fill sizes="(max-width: 760px) 52vw, 27vw" /></div>
        <p className="site-photo-caption">Mayor cobertura<br />sin flota propia.</p>
      </Reveal>
    </div>
    <div className="site-container"><div className="site-benefit-strip">
      <div><span className="site-icon"><WalletCards aria-hidden="true" /></span><p>Tarifas competitivas<br />y transparentes</p></div>
      <div><span className="site-icon"><MapPin aria-hidden="true" /></span><p>Seguimiento de pedidos<br />en tiempo real</p></div>
      <div><span className="site-icon"><Truck aria-hidden="true" /></span><p>Mayor cobertura<br />sin contratar flota propia</p></div>
    </div></div>
  </section>;
}
