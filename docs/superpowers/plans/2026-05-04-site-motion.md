# Site Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public site feel more dynamic with lightweight motion, layered hero treatment, and scroll-triggered reveals without adding heavy 3D dependencies.

**Architecture:** Centralize animation primitives in a shared motion helper so both site variants can reuse the same reveal and hover behavior. Apply motion only where it adds value: the hero, section entrances, and testimonial transitions. Keep layout, content, and responsive structure unchanged.

**Tech Stack:** Next.js App Router, React, framer-motion, Tailwind CSS.

---

### Task 1: Add shared motion primitives

**Files:**
- Create: `src/components/site-motion.tsx`

- [ ] **Step 1: Define reusable reveal and hover wrappers**

```tsx
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function MotionSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify the file compiles conceptually**

Run: `npx eslint src/components/site-motion.tsx`
Expected: no lint errors.

### Task 2: Animate the public home sections

**Files:**
- Modify: `src/app/site/_components/hero.tsx`
- Modify: `src/app/site/_components/benefits.tsx`
- Modify: `src/app/site/_components/how-it-works.tsx`
- Modify: `src/app/site/_components/requirements.tsx`
- Modify: `src/app/site/_components/for-businesses.tsx`
- Modify: `src/app/site/_components/testimonials.tsx`
- Modify: `src/app/(site)/_components/hero.tsx`
- Modify: `src/app/(site)/_components/benefits.tsx`
- Modify: `src/app/(site)/_components/how-it-works.tsx`
- Modify: `src/app/(site)/_components/requirements.tsx`
- Modify: `src/app/(site)/_components/for-businesses.tsx`
- Modify: `src/app/(site)/_components/testimonials.tsx`

- [ ] **Step 1: Wrap section content in `MotionSection` and cards in `MotionCard`**

```tsx
import { MotionSection, MotionCard } from "@/components/site-motion";
```

- [ ] **Step 2: Add layered hero motion**

```tsx
<div className="relative z-10 flex h-full items-center justify-center">
  <motion.div
    className="container mx-auto px-4 text-center text-white"
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
  >
    ...
  </motion.div>
</div>
```

- [ ] **Step 3: Make testimonials animate between slides**

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={index}
    initial={{ opacity: 0, x: 24, scale: 0.98 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: -24, scale: 0.98 }}
    transition={{ duration: 0.35 }}
  >
    ...
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 4: Verify lint after edits**

Run: `npx eslint src/app/site/_components/*.tsx src/app/(site)/_components/*.tsx`
Expected: no lint errors.

### Task 3: Validate in browser

**Files:**
- None

- [ ] **Step 1: Start the app**

Run: `bun dev -- -p 3001`

- [ ] **Step 2: Inspect the public site**

Open: `http://localhost:3001/site`

- [ ] **Step 3: Confirm motion feels restrained**

Check that the hero fades in, sections reveal as they scroll, and testimonial slides transition cleanly without layout shift.

- [ ] **Step 4: Run final checks**

Run: `git diff --check`
Expected: clean.
