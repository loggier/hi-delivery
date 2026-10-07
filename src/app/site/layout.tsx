import { Header } from "./_components/header";
import { Footer } from "./_components/footer";
import { Manrope } from 'next/font/google';
import type { Metadata } from 'next';
import './site.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-site', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hi! Delivery | Potencia tus entregas',
  description: 'Conecta tu negocio con repartidores confiables en Culiacán. Registra tu negocio o únete como repartidor a Hi! Delivery.',
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`hid-site ${manrope.variable}`}>
      <a className="site-skip-link" href="#site-main">Ir al contenido</a>
      <Header />
      <main id="site-main">{children}</main>
      <Footer />
    </div>
  );
}
