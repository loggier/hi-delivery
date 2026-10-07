"use client";

import { useEffect, useRef, type ReactNode } from 'react';
import { useAnimate, useReducedMotion } from 'framer-motion';

/** Content is visible in the server HTML, including when JS or motion is unavailable. */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [scope, animate] = useAnimate();
  const reducedMotion = useReducedMotion();
  const revealed = useRef(false);

  useEffect(() => {
    if (reducedMotion || revealed.current) return;
    const element = scope.current;
    if (!element) return;
    let controls: ReturnType<typeof animate> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || revealed.current) return;
      revealed.current = true;
      controls = animate(element, { opacity: [0.5, 1], y: [20, 0] }, { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] });
      observer.disconnect();
    }, { threshold: 0.08 });
    observer.observe(element);
    return () => { observer.disconnect(); controls?.stop(); };
  }, [animate, delay, reducedMotion, scope]);

  return <div ref={scope} className={className}>{children}</div>;
}
