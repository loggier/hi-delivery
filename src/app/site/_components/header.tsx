"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
        "sticky top-0 z-50 w-full border-b border-white/10 transition-all duration-300",
        "backdrop-blur-xl bg-white/5",
        isScrolled && "bg-white/8 shadow-lg"
      )}
    >
      {/* Scroll progress bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 origin-left bg-gradient-to-r from-[#00d4ff] to-[#00ff88]"
        style={{ scaleX: progressX }}
      />

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/site" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              Hi!{" "}
              <span className="text-[#00d4ff] drop-shadow-[0_0_8px_rgba(0,212,255,0.6)]">
                Delivery
              </span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={getLinkHref(link.href)}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-[#00d4ff]"
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
              className="text-[#94a3b8] hover:text-white hover:bg-white/10"
            >
              <Link href="/sign-in">Iniciar Sesión</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-[#00d4ff] to-[#0066cc] text-white font-semibold hover:opacity-90 transition-opacity shadow-glow"
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
            className="md:hidden text-white hover:bg-white/10"
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
            className="overflow-hidden border-t border-white/10 backdrop-blur-xl bg-white/5 md:hidden"
          >
            <nav className="flex flex-col items-center gap-4 p-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={getLinkHref(link.href)}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-lg font-medium text-[#94a3b8] transition-colors hover:text-[#00d4ff]"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-3 w-full">
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Link href="/sign-in">Iniciar Sesión</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-[#00d4ff] to-[#0066cc] text-white font-semibold hover:opacity-90 shadow-glow"
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
