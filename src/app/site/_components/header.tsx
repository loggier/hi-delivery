"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const links = [
  { href: '/site#for-businesses', label: 'Negocios' },
  { href: '/site#benefits', label: 'Repartidores' },
  { href: '/site#requirements', label: 'Requisitos' },
  { href: '/site#faq', label: 'Preguntas frecuentes' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return <header ref={header} className="site-header">
    <div className="site-container site-nav">
      <Link href="/site" className="site-brand" aria-label="Hi! Delivery — Inicio">
        <Image src="/logo-hid.png" alt="" width={40} height={44} />Hi! Delivery
      </Link>
      <nav className="site-desktop-links" aria-label="Navegación principal">
        {links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <div className="site-nav-actions">
        <Link className="site-login" href="/sign-in">Iniciar sesión</Link>
        <Link className="site-button" href="/site/store/apply">Registra tu negocio <ArrowUpRight aria-hidden="true" /></Link>
        <button ref={toggle} className="site-menu-toggle" type="button" aria-expanded={open} aria-controls="site-mobile-nav" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
    </div>
    <nav id="site-mobile-nav" className="site-mobile-nav" aria-label="Navegación móvil" hidden={!open}>
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight aria-hidden="true" /></Link>)}
      <Link href="/site/deliveryman/apply" onClick={() => setOpen(false)}>Quiero ser Repartidor <ArrowUpRight aria-hidden="true" /></Link>
      <Link href="/sign-in" onClick={() => setOpen(false)}>Iniciar sesión <ArrowUpRight aria-hidden="true" /></Link>
    </nav>
  </header>;
}
