"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { usePathname } from "next/navigation";

export function Footer() {
  const [email, setEmail] = React.useState("");
  const pathname = usePathname();

  const getLinkHref = (href: string) => {
    if (pathname === "/site" || pathname === "/") return href;
    return `/site/${href}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-blue-950 py-16 text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-300 to-orange-400" />
      <div className="absolute -right-28 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="container relative mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5">
            <Link href="/site" className="flex items-center gap-3">
              <Image src="/logo-hid.png" alt="Hi! Delivery" width={42} height={42} className="h-10 w-10" />
              <span className="text-2xl font-black tracking-tight">Hi! Delivery</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-blue-100/75">
              Conectando negocios, repartidores y clientes con una operación local más rápida y confiable.
            </p>
          </div>

          <div>
            <h3 className="font-black text-white">Repartidores</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link href={getLinkHref("#benefits")} className="text-blue-100/75 hover:text-white">Beneficios</Link></li>
              <li><Link href={getLinkHref("#requirements")} className="text-blue-100/75 hover:text-white">Requisitos</Link></li>
              <li><Link href={getLinkHref("#how-it-works")} className="text-blue-100/75 hover:text-white">Cómo funciona</Link></li>
              <li><Link href="/site/deliveryman/apply" className="text-blue-100/75 hover:text-white">Aplicar ahora</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white">Negocios</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link href={getLinkHref("#for-businesses")} className="text-blue-100/75 hover:text-white">Servicios</Link></li>
              <li><Link href="/site/store/apply" className="text-blue-100/75 hover:text-white">Registra tu negocio</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-black text-white">Mantente informado</h3>
            <p className="mt-4 text-sm leading-6 text-blue-100/75">Recibe noticias y actualizaciones de la operación.</p>
            <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
              <Input
                type="email"
                placeholder="tu.email@ejemplo.com"
                className="border-white/15 bg-white/10 text-white placeholder:text-blue-100/45"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="bg-orange-500 font-bold text-white hover:bg-orange-600">Enviar</Button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-blue-100/60">
          <p>&copy; {new Date().getFullYear()} Hi! Delivery. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
