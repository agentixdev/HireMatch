'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

/* ── Reusable variant presets ── */
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
};

const fadeUpSlow = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
};

/* ── Viewport-triggered section wrapper ── */
export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger container that triggers on viewport ── */
export function StaggerSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Single stagger child ── */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Hero text: staggered entrance with larger y offset ── */
export function HeroAnimated({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12 } },
      }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUpSlow} className={className}>
      {children}
    </motion.div>
  );
}

/* ── Count-up number ── */
export function CountUp({
  target,
  suffix = '',
  duration = 1.5,
  className,
}: {
  target: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── Country pill with wave hover ── */
export function CountryPill({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.span
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
        },
      }}
      whileHover={{ scale: 1.08, y: -2 }}
      className="px-3 py-1.5 bg-white/[0.04] ring-1 ring-white/[0.08] rounded-full text-xs text-white/60 hover:ring-white/20 hover:text-white/80 transition-all cursor-default"
    >
      {children}
    </motion.span>
  );
}
