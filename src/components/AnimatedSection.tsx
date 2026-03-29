'use client';

import { useRef, useEffect, useState, ReactNode } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { springSnappy, springBouncy } from '@/lib/wow';

/* ── Reusable variant presets ── */
const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springBouncy,
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

/* ── Temperature glow palette for CountryPill ── */
const PILL_GLOWS = [
  'rgba(59, 130, 246, 0.45)',  // blue
  'rgba(168, 85, 247, 0.45)',  // purple
  'rgba(34, 197, 94, 0.45)',   // green
  'rgba(236, 72, 153, 0.45)',  // pink
] as const;

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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
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
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [glowOpacity, setGlowOpacity] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    // Subtle background temperature glow fades in when section enters viewport
    const controls = animate(0, 1, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setGlowOpacity(v),
    });
    return () => controls.stop();
  }, [isInView]);

  return (
    <div className="relative">
      {/* Background glow layer */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl transition-opacity"
        style={{
          opacity: glowOpacity * 0.06,
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(99,102,241,1) 0%, rgba(168,85,247,0.6) 50%, transparent 100%)',
        }}
      />
      <motion.div
        ref={ref}
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? 'show' : 'hidden'}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ── Single stagger child with micro-scale bounce ── */
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

/* ── Count-up number with completion glow pulse ── */
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
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
        setDone(true);
      }
    };
    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      animate={
        done
          ? {
              textShadow: [
                '0 0 0px rgba(99,102,241,0)',
                '0 0 18px rgba(99,102,241,0.8)',
                '0 0 0px rgba(99,102,241,0)',
              ],
            }
          : {}
      }
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      onAnimationComplete={() => setDone(false)}
    >
      {count.toLocaleString()}
      {suffix}
    </motion.span>
  );
}

/* ── Country pill with temperature-based hover glow + spring physics ── */
export function CountryPill({ children, index }: { children: ReactNode; index: number }) {
  const glowColor = PILL_GLOWS[index % PILL_GLOWS.length];

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
      whileHover={{
        scale: 1.1,
        y: -2,
        boxShadow: `0 0 16px 2px ${glowColor}`,
      }}
      transition={springSnappy}
      className="px-3 py-1.5 bg-white/[0.04] ring-1 ring-white/[0.08] rounded-full text-xs text-white/60 hover:ring-white/20 hover:text-white/80 transition-colors cursor-default"
    >
      {children}
    </motion.span>
  );
}

/* ── Feature card with glass morphism + hover lift ── */
export function FeatureCard({
  children,
  className,
  colorHex,
}: {
  children: ReactNode;
  className?: string;
  colorHex?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const glowColor = colorHex
    ? `${colorHex}33`   // 20% alpha version of provided hex
    : 'rgba(99,102,241,0.2)';
  const borderColor = colorHex
    ? `${colorHex}66`
    : 'rgba(255,255,255,0.15)';

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -4 : 0,
        boxShadow: hovered
          ? `0 16px 48px -8px ${glowColor}, 0 0 0 1px ${borderColor}`
          : '0 0 0 1px rgba(255,255,255,0.06)',
      }}
      transition={springSnappy}
      className={[
        'relative rounded-2xl backdrop-blur-md',
        'bg-white/[0.04] ring-1 ring-white/[0.07]',
        'overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Hover border brightening overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${glowColor} 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ── Testimonial card with quote icon bounce + left-border accent ── */
export function TestimonialCard({
  quote,
  name,
  role,
  location,
}: {
  quote: string;
  name: string;
  role: string;
  location: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={springBouncy}
      whileHover={{ y: -4 }}
      style={{
        transition: 'box-shadow 0.25s ease',
        boxShadow: hovered
          ? '0 20px 50px -12px rgba(59,130,246,0.22)'
          : '0 4px 20px -4px rgba(0,0,0,0.3)',
      }}
      className="relative rounded-2xl bg-white/[0.04] backdrop-blur-md ring-1 ring-white/[0.08] overflow-hidden p-6 flex flex-col gap-4"
    >
      {/* Left-border blue accent */}
      <div className="absolute left-0 top-6 bottom-6 w-0.5 rounded-full bg-gradient-to-b from-blue-400/80 via-blue-500/60 to-blue-400/20" />

      {/* Quote icon with spring bounce entrance */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ ...springBouncy, delay: 0.15 }}
        className="w-8 h-8 flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-7 h-7 text-blue-400/70"
          aria-hidden="true"
        >
          <path
            d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
            fill="currentColor"
          />
        </svg>
      </motion.div>

      {/* Quote text */}
      <p className="text-sm leading-relaxed text-white/70 pl-1">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Attribution */}
      <div className="pl-1 mt-auto">
        <p className="text-sm font-semibold text-white/90">{name}</p>
        <p className="text-xs text-white/50">
          {role} &middot; {location}
        </p>
      </div>
    </motion.div>
  );
}
