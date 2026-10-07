import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

export function Footer() {
  return <footer className="site-footer">
    <div className="site-container site-footer-grid">
      <div>
        <Link href="/site" className="site-brand"><Image src="/logo-hid.png" alt="" width={40} height={44} />Hi! Delivery</Link>
        <p>Conectando negocios, repartidores y clientes con una operación local más rápida y confiable.</p>
      </div>
      <nav aria-label="Enlaces para negocios"><h2>Negocios</h2><Link href="/site#for-businesses">Servicios</Link><Link href="/site/store/apply">Registra tu negocio <ArrowUpRight aria-hidden="true" /></Link><Link href="/sign-in">Iniciar sesión</Link></nav>
      <nav aria-label="Enlaces para repartidores"><h2>Repartidores</h2><Link href="/site#benefits">Beneficios</Link><Link href="/site#requirements">Requisitos</Link><Link href="/site#how-it-works">Cómo funciona</Link><Link href="/site/deliveryman/apply">Aplicar ahora <ArrowUpRight aria-hidden="true" /></Link></nav>
    </div>
    <div className="site-container site-copyright">© {new Date().getFullYear()} Hi! Delivery. Todos los derechos reservados.</div>
  </footer>;
}
