"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden bg-[#0a0a0f]">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-mesh animate-gradient-mesh" />
      
      {/* Radial glow overlay */}
      <div className="absolute inset-0 bg-gradient-radial" />
      
      {/* Floating particles / orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orb 1 - top left */}
        <motion.div
          className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-[#00d4ff]/10 blur-[80px]"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Orb 2 - bottom right */}
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-[#00ff88]/5 blur-[100px]"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Orb 3 - center */}
        <motion.div
          className="absolute top-[40%] left-[50%] w-64 h-64 rounded-full bg-[#ff6b00]/5 blur-[60px]"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Small floating circles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#00d4ff]/20 blur-sm"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full min-h-[100dvh] items-center">
        <div className="container mx-auto px-4 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left side - Text content */}
            <div className="flex flex-col items-start">
              <motion.h1
                className="text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <span className="text-gradient">
                  Conviértete en Repartidor
                </span>
                <br />
                <span className="text-white">y Gana a tu Ritmo</span>
              </motion.h1>

              <motion.p
                className="mt-6 max-w-2xl text-lg text-[#94a3b8]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              >
                Únete a la red de repartidores de Hi! Delivery en Culiacán.
                Disfruta de horarios flexibles, ganancias competitivas y la
                libertad de ser tu propio jefe.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col gap-4 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#00d4ff] to-[#0066cc] text-white font-semibold text-lg px-8 py-6 hover:opacity-90 transition-all shadow-glow hover:shadow-[0_0_40px_rgba(0,212,255,0.3)]"
                >
                  <Link href="/site/deliveryman/apply">
                    Regístrate como Repartidor
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="glass-dark text-white font-semibold text-lg px-8 py-6 border-white/20 hover:bg-white/10 hover:border-white/30 transition-all"
                >
                  <Link href="/site/store/apply">
                    <Store className="mr-2 h-5 w-5 text-[#00d4ff]" />
                    Soy un Negocio
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Right side - Phone mockup */}
            <motion.div
              className="hidden lg:flex justify-center items-center"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            >
              <div className="animate-float relative">
                {/* Phone frame */}
                <div className="relative w-64 h-[500px] rounded-[2.5rem] glass-dark border border-[#00d4ff]/30 shadow-glow overflow-hidden">
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-[#00d4ff]/10 to-transparent" />
                  
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0a0a0f] rounded-full" />
                  
                  {/* Screen content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#0066cc] flex items-center justify-center mb-4 shadow-glow">
                      <span className="text-2xl font-bold text-white">Hi!</span>
                    </div>
                    <p className="text-white font-semibold text-lg">App Preview</p>
                    <p className="text-[#64748b] text-sm mt-2 text-center">
                      Tu plataforma de entregas
                    </p>
                    
                    {/* Mock UI elements */}
                    <div className="mt-8 w-full space-y-3">
                      <div className="h-12 w-full rounded-xl bg-white/5 border border-white/10" />
                      <div className="h-12 w-full rounded-xl bg-white/5 border border-white/10" />
                      <div className="h-12 w-full rounded-xl bg-gradient-to-r from-[#00d4ff]/20 to-[#00ff88]/20 border border-[#00d4ff]/20" />
                    </div>
                  </div>
                  
                  {/* Bottom home indicator */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
                </div>
                
                {/* Decorative ring behind phone */}
                <div className="absolute -inset-4 rounded-[3rem] border border-[#00d4ff]/10 -z-10" />
                <div className="absolute -inset-8 rounded-[3.5rem] border border-[#00d4ff]/5 -z-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
