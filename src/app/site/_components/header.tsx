"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";

const navLinks = [
  { href: "#benefits", label: "Beneficios" },
  { href: "#requirements", label: "Requisitos" },
  { href: "#for-businesses", label: "Negocios" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLinkHref = (href: string) => {
    if (pathname === '/site' || pathname === '/') {
        return href;
    }
    return `/site/${href}`;
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-white/60 transition-all duration-300 dark:border-slate-800/70",
        isScrolled
          ? "bg-white/95 shadow-md backdrop-blur-xl dark:bg-slate-950/92"
          : "bg-white/90 shadow-sm backdrop-blur-xl dark:bg-slate-950/88"
      )}
    >
      <motion.div
        className="h-0.5 origin-left bg-primary"
        style={{ scaleX: progressX }}
      />
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/site" className="flex items-center gap-2">
            <Image src="/logo-hid.png" alt="Hi! Delivery Logo" width={28} height={28} />
            <span className="text-lg font-bold">Hi! Delivery</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={getLinkHref(link.href)}
                className="text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild>
                <Link href="/sign-in">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/site/deliveryman/apply">¡Quiero ser Repartidor!</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <nav className="flex flex-col items-center gap-4 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={getLinkHref(link.href)}
                className="text-lg font-medium text-slate-600 hover:text-primary dark:text-slate-300"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 w-full">
                <Button variant="outline" asChild>
                    <Link href="/sign-in">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                    <Link href="/site/deliveryman/apply">¡Quiero ser Repartidor!</Link>
                </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
