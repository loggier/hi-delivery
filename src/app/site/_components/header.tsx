"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring, AnimatePresence } from "framer-motion";

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
  const progressX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.2,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getLinkHref = (href: string) => {
    if (pathname === "/site" || pathname === "/") {
      return href;
    }
    return `/site${href}`;
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      setIsMenuOpen(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        isScrolled
          ? "border-slate-200/70 bg-white/95 shadow-lg shadow-blue-950/5 backdrop-blur-xl"
          : "border-white/25 bg-white/75 shadow-sm backdrop-blur-xl"
      )}
    >
      {/* Scroll progress bar */}
      <motion.div
        className="absolute left-0 right-0 top-0 h-0.5 origin-left bg-gradient-to-r from-blue-600 via-sky-400 to-orange-400"
        style={{ scaleX: progressX }}
      />

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/site" className="flex items-center gap-3">
            <Image src="/logo-hid.png" alt="Hi! Delivery" width={36} height={36} className="h-9 w-9" />
            <span className="text-xl font-extrabold tracking-tight text-slate-950">
              Hi! <span className="text-blue-600">Delivery</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={getLinkHref(link.href)}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-blue-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <Button
              variant="ghost"
              asChild
              className="text-slate-700 hover:bg-blue-50 hover:text-blue-700"
            >
              <Link href="/sign-in">Iniciar Sesión</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-sky-500 font-semibold text-white shadow-lg shadow-blue-600/20 transition-transform hover:-translate-y-0.5 hover:from-blue-700 hover:to-sky-600"
            >
              <Link href="/site/deliveryman/apply">
                ¡Quiero ser Repartidor!
              </Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-900 hover:bg-blue-50 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col items-center gap-4 p-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={getLinkHref(link.href)}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-lg font-semibold text-slate-700 transition-colors hover:text-blue-600"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3 w-full">
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-blue-200 text-slate-800 hover:bg-blue-50"
                >
                  <Link href="/sign-in">Iniciar Sesión</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-700 hover:to-sky-600"
                >
                  <Link href="/site/deliveryman/apply">
                    ¡Quiero ser Repartidor!
                  </Link>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
