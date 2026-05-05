"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

type MotionProps = {
  children: React.ReactNode;
  className?: string;
};

export function MotionSection({ children, className }: MotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: 48, scale: 0.96, filter: "blur(10px)" }
      }
      whileInView={
        reduceMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
      }
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.9 }}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, className }: MotionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      whileHover={{ y: -5, scale: 1.015, rotateX: 2, rotateY: -2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
