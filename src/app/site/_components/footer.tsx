
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";

export function Footer() {
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el email
    console.log("Email suscrito:", email);
    setEmail("");
  };

  return (
    <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/site" className="flex items-center gap-2">
              <Image src="/logo-hid.png" alt="Hi! Delivery Logo" width={32} height={32} />
              <span className="text-xl font-bold">Hi! Delivery</span>
            </Link>
            <p className="text-sm text-slate-300">
              Conectando tu negocio con repartidores eficientes y clientes satisfechos.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Repartidores</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="#benefits" className="text-slate-300 hover:text-white">Beneficios</Link></li>
              <li><Link href="#requirements" className="text-slate-300 hover:text-white">Requisitos</Link></li>
              <li><Link href="#how-it-works" className="text-slate-300 hover:text-white">Cómo funciona</Link></li>
              <li><Link href="/site/deliveryman/apply" className="text-slate-300 hover:text-white">Aplicar ahora</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white">Negocios</h3>
            <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#for-businesses" className="text-slate-300 hover:text-white">Nuestros Servicios</Link></li>
                <li><Link href="/site/store/apply" className="text-slate-300 hover:text-white">Registra tu negocio</Link></li>
            </ul>
          </div>
          <div>
             <h3 className="font-semibold text-white">Mantente Informado</h3>
            <p className="mt-4 text-sm text-slate-300">Suscríbete a nuestro boletín para recibir noticias y ofertas.</p>
            <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
              <Input 
                type="email" 
                placeholder="tu.email@ejemplo.com" 
                className="bg-slate-800 border-slate-700 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="default">Suscribirse</Button>
            </form>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-700 pt-8 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Hi! Delivery. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
