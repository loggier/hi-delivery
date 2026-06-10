"use client";

import { motion } from "framer-motion";
import { MapPin, PackageCheck, Store, Users } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

const stats = [
  { value: 500, suffix: "+", label: "Repartidores activos", icon: Users },
  { value: 10000, suffix: "+", label: "Entregas al mes", icon: PackageCheck },
  { value: 200, suffix: "+", label: "Negocios aliados", icon: Store },
  { value: 15, suffix: "+", label: "Zonas de cobertura", icon: MapPin },
];

function StatCard({ value, suffix, label, icon: Icon, index }: (typeof stats)[number] & { index: number }) {
  const { count, ref } = useCountUp({ target: value, duration: 1600 + index * 120 });
  const safeCount = Number.isFinite(count) ? count : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
      className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5 transition-transform hover:-translate-y-1"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-4xl font-black tracking-tight text-blue-950">
        {safeCount.toLocaleString("es-MX")}{suffix}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{label}</p>
    </motion.div>
  );
}

export function StatsBar() {
  return (
    <section className="relative bg-white py-12 sm:py-16">
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent" />
      <div className="container mx-auto px-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} {...stat} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
