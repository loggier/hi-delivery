import { Hero } from "./_components/hero";
import { Benefits } from "./_components/benefits";
import { HowItWorks } from "./_components/how-it-works";
import { Requirements } from "./_components/requirements";
import { ForBusinesses } from "./_components/for-businesses";
import { Testimonials } from "./_components/testimonials";
import { Faq } from "./_components/faq";
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './_components/reveal';

export default function SitePage() {
  return (
    <>
      <Hero />
      <ForBusinesses />
      <HowItWorks />
      <Requirements />
      <Benefits />
      <Testimonials />
      <Faq />
      <div className="site-container"><Reveal className="site-closing"><div><p className="site-eyebrow">Para negocios</p><h2>Llega a más clientes<br />con Hi! Delivery.</h2></div><Link href="/site/store/apply" className="site-button">Registra tu negocio <ArrowUpRight aria-hidden="true" /></Link></Reveal></div>
    </>
  );
}
