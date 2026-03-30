'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { springBouncy, springSnappy, scoreCountUp } from '@/lib/wow';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroSectionProps {
  title: string;
  subtitle: string;
  candidateCta: string;
  recruiterCta: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card data
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Countries',            value: '29',   numericValue: 29,  suffix: '',    color: '#3b82f6' },
  { label: 'Visa Types',           value: '130+', numericValue: 130, suffix: '+',   color: '#a855f7' },
  { label: 'AI Features',          value: '4',    numericValue: 4,   suffix: '',    color: '#22c55e' },
  { label: 'Free for Candidates',  value: '100%', numericValue: 100, suffix: '%',   color: '#ec4899' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Particle positions — stable across renders (computed once)
// ─────────────────────────────────────────────────────────────────────────────

const PARTICLES = [
  { id: 0,  left: '8%',   size: 2, duration: 9,  delay: 0   },
  { id: 1,  left: '15%',  size: 1, duration: 11, delay: 1.5 },
  { id: 2,  left: '22%',  size: 2, duration: 8,  delay: 0.8 },
  { id: 3,  left: '31%',  size: 1, duration: 13, delay: 2.2 },
  { id: 4,  left: '39%',  size: 2, duration: 10, delay: 0.3 },
  { id: 5,  left: '47%',  size: 1, duration: 12, delay: 3.1 },
  { id: 6,  left: '55%',  size: 2, duration: 9,  delay: 1.1 },
  { id: 7,  left: '63%',  size: 1, duration: 14, delay: 0.6 },
  { id: 8,  left: '71%',  size: 2, duration: 8,  delay: 2.7 },
  { id: 9,  left: '78%',  size: 1, duration: 11, delay: 1.8 },
  { id: 10, left: '85%',  size: 2, duration: 10, delay: 0.4 },
  { id: 11, left: '91%',  size: 1, duration: 13, delay: 3.5 },
  { id: 12, left: '4%',   size: 2, duration: 9,  delay: 2.0 },
  { id: 13, left: '96%',  size: 1, duration: 12, delay: 1.2 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card with count-up animation and color glow on hover
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  numericValue,
  suffix,
  color,
  delay,
}: {
  label: string;
  numericValue: number;
  suffix: string;
  color: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const { start } = scoreCountUp(0, numericValue, 1400, setCount);
    const timer = setTimeout(start, delay * 1000);
    return () => clearTimeout(timer);
  }, [isInView, numericValue, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ ...springBouncy, delay: delay + 0.6 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        boxShadow: hovered
          ? `0 0 0 1px ${color}55, 0 8px 32px ${color}33, 0 0 60px ${color}18`
          : '0 0 0 1px rgba(255,255,255,0.07)',
        transition: 'box-shadow 0.35s ease',
      }}
      className="relative flex flex-col items-center justify-center gap-1 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl bg-white/[0.04] backdrop-blur-sm cursor-default select-none overflow-hidden"
    >
      {/* Inner glow orb */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}22 0%, transparent 70%)` }}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Value */}
      <span
        className="text-2xl sm:text-3xl font-extrabold tabular-nums"
        style={{ color, textShadow: hovered ? `0 0 24px ${color}88` : 'none', transition: 'text-shadow 0.3s ease' }}
      >
        {count.toLocaleString()}{suffix}
      </span>

      {/* Label */}
      <span className="text-xs text-white/50 font-medium tracking-wide text-center leading-tight">
        {label}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse rings behind the primary CTA button
// ─────────────────────────────────────────────────────────────────────────────

function PulseRings() {
  return (
    <span className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-blue-500/40"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.65,
          }}
          style={{ width: '100%', height: '100%' }}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scroll chevron
// ─────────────────────────────────────────────────────────────────────────────

function ScrollChevron() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.2, duration: 0.8 }}
    >
      <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      >
        <polyline points="6 9 12 15 18 9" />
      </motion.svg>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function HeroSection({
  title,
  subtitle,
  candidateCta,
  recruiterCta,
}: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-24">

      {/* ── 1. Animated gradient mesh background ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {/* Orb 1 — blue, top-left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 700,
            top: '-15%',
            left: '-10%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)',
            filter: 'blur(72px)',
          }}
          animate={{
            x: [0, 60, -30, 0],
            y: [0, 40, -20, 0],
            scale: [1, 1.12, 0.95, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Orb 2 — purple, center-right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 800,
            height: 800,
            top: '20%',
            right: '-15%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.20) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{
            x: [0, -50, 30, 0],
            y: [0, -60, 30, 0],
            scale: [1, 0.92, 1.1, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        {/* Orb 3 — indigo, bottom-center */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            bottom: '-5%',
            left: '30%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            filter: 'blur(64px)',
          }}
          animate={{
            x: [0, 40, -60, 0],
            y: [0, -30, 50, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        />
        {/* Deep background base */}
        <div className="absolute inset-0 bg-[#0d0f1a]/60" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ── 2. Floating particle field ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        {PARTICLES.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-white/70"
            style={{
              left: p.left,
              bottom: '-4px',
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -900],
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col items-center text-center gap-8">

        {/* Badge pill */}
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springSnappy, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] ring-1 ring-white/[0.12] text-white/70 text-xs font-semibold tracking-widest uppercase"
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"
            style={{ boxShadow: '0 0 6px #22c55e' }}
          />
          AI-Powered Global Recruitment
        </motion.div>

        {/* ── 3. Headline with animated gradient shimmer ── */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springBouncy, delay: 0.25 }}
        >
          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #60a5fa 0%, #a78bfa 25%, #818cf8 50%, #c084fc 75%, #60a5fa 100%)',
                backgroundSize: '300% 100%',
                animation: 'shimmerSlide 4s linear infinite',
              }}
            >
              {title}
            </span>
          </h1>
        </motion.div>

        {/* ── 4. Subtitle — spring entrance ── */}
        <motion.p
          className="max-w-2xl text-lg sm:text-xl text-white/60 leading-relaxed"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springBouncy, delay: 0.45 }}
        >
          {subtitle}
        </motion.p>

        {/* ── 4 & 5. CTA buttons with staggered entrance ── */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springBouncy, delay: 0.65 }}
        >
          {/* Primary CTA — candidate, with pulse rings */}
          <Link
            href="/auth?mode=signup&role=candidate"
            className="relative inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-4 rounded-2xl font-semibold text-white text-sm sm:text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow w-full sm:w-auto"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 60%, #a855f7 100%)',
            }}
          >
            <PulseRings />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
              <path d="M12 14c-6 0-9 2.5-9 4v1h18v-1c0-1.5-3-4-9-4z" />
            </svg>
            {candidateCta}
          </Link>

          {/* Secondary CTA — recruiter */}
          <Link
            href="/auth?mode=signup&role=recruiter"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-4 rounded-2xl font-semibold text-white/80 text-sm sm:text-base ring-1 ring-white/[0.15] bg-white/[0.05] hover:bg-white/[0.09] hover:text-white hover:ring-white/25 backdrop-blur-sm transition-all w-full sm:w-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            {recruiterCta}
          </Link>
        </motion.div>

        {/* Trust note */}
        <motion.p
          className="text-xs text-white/30 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          No credit card required &middot; Free for candidates, always
        </motion.p>

        {/* ── 6. Temperature stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-4">
          {STATS.map((stat, i) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              numericValue={stat.numericValue}
              suffix={stat.suffix}
              color={stat.color}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>

      {/* ── 7. Scroll indicator ── */}
      <ScrollChevron />
    </section>
  );
}
