"use client";

import { motion } from "framer-motion";
import { Users, Package, Store, MapPin } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

const stats = [
  {
    target: 500,
    suffix: "+",
    label: "Repartidores Activos",
    icon: Users,
    color: "bg-[#00d4ff]/15 text-[#00d4ff]",
    gradient: "from-[#00d4ff] to-[#00ff88]",
  },
  {
    target: 10000,
    suffix: "+",
    label: "Entregas Este Mes",
    icon: Package,
    color: "bg-[#ff6b00]/15 text-[#ff6b00]",
    gradient: "from-[#ff6b00] to-[#ffcc00]",
  },
  {
    target: 200,
    suffix: "+",
    label: "Negocios Asociados",
    icon: Store,
    color: "bg-[#00ff88]/15 text-[#00ff88]",
    gradient: "from-[#00ff88] to-[#00d4ff]",
  },
  {
    target: 15,
    suffix: "",
    label: "Zonas de Cobertura",
    icon: MapPin,
    color: "bg-purple-500/15 text-purple-400",
    gradient: "from-purple-400 to-pink-400",
  },
];

function StatCard({
  stat,
  index,
}: {
  stat: (typeof stats)[0];
  index: number;
}) {
  const { count, ref, display } = useCountUp({
    target: stat.target,
    suffix: stat.suffix,
    duration: 2500,
  });

  const Icon = stat.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
      className="glass-dark hover-lift rounded-2xl p-6 md:p-8 flex flex-col items-center text-center"
    >
      {/* Icon */}
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${stat.color}`}
      >
        <Icon className="h-7 w-7" />
      </div>

      {/* Number */}
      <div
        className={`text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
      >
        {display}
      </div>

      {/* Label */}
      <p className="mt-2 text-sm md:text-base font-medium text-[#94a3b8]">
        {stat.label}
      </p>
    </motion.div>
  );
}

export function StatsBar() {
  return (
    <section className="relative w-full bg-[#0a0a0f] py-16 md:py-24">
      {/* Top border glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/30 to-transparent" />
      
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00d4ff]/3 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
