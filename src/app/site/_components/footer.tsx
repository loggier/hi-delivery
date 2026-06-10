"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Input } from "@/components/ui/input";
import { Instagram, Facebook, Twitter, ArrowRight } from "lucide-react";

const riderLinks = [
  { label: "Beneficios", href: "#benefits" },
  { label: "Requisitos", href: "#requirements" },
  { label: "Cómo funciona", href: "#how-it-works" },
  { label: "Aplicar ahora", href: "/site/deliveryman/apply" },
];

const businessLinks = [
  { label: "Nuestros Servicios", href: "#for-businesses" },
  { label: "Registra tu negocio", href: "/site/store/apply" },
];

export function Footer() {
  const [email, setEmail] = React.useState("");
  const pathname = usePathname();

  const getLinkHref = (href: string) => {
    if (href.startsWith("/")) return href;
    if (pathname === "/site" || pathname === "/") return href;
    return `/site/${href}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-[#0a0a0f] pt-px">
      {/* Top gradient border — cyan glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/50 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#00d4ff]/5 to-transparent pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1 — Brand */}
          <div className="space-y-5">
            <Link href="/site" className="inline-block">
              <span className="text-2xl font-bold text-gradient">
                Hi! Delivery
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[#94a3b8]">
              Conectando tu negocio con repartidores eficientes.
            </p>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#94a3b8] transition-colors hover:border-[#00d4ff]/30 hover:text-[#00d4ff]">
                <Instagram className="h-4 w-4" />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#94a3b8] transition-colors hover:border-[#00d4ff]/30 hover:text-[#00d4ff]">
                <Facebook className="h-4 w-4" />
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#94a3b8] transition-colors hover:border-[#00d4ff]/30 hover:text-[#00d4ff]">
                <Twitter className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Col 2 — Repartidores */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Repartidores
            </h3>
            <ul className="mt-5 space-y-3">
              {riderLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={getLinkHref(link.href)}
                    className="text-sm text-[#94a3b8] transition-colors hover:text-[#00d4ff]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Negocios */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Negocios
            </h3>
            <ul className="mt-5 space-y-3">
              {businessLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={getLinkHref(link.href)}
                    className="text-sm text-[#94a3b8] transition-colors hover:text-[#00d4ff]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — Newsletter */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Mantente Informado
            </h3>
            <p className="mt-5 text-sm text-[#94a3b8]">
              Recibe noticias y ofertas exclusivas.
            </p>
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={handleSubmit}
            >
              <Input
                type="email"
                placeholder="tu@email.com"
                required
                className="h-10 flex-1 rounded-lg border-white/10 bg-white/5 text-sm text-white placeholder:text-[#64748b] focus:border-[#00d4ff]/30 focus:ring-[#00d4ff]/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#00ff88] px-4 text-sm font-semibold text-[#0a0a0f] transition-all hover:brightness-110"
              >
                Suscribirse
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-[#64748b]">
            © 2024 Hi! Delivery. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/site/privacy"
              className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
            >
              Privacidad
            </Link>
            <Link
              href="/site/terms"
              className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
