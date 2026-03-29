'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { springBouncy, springSnappy, staggerContainer, staggerItem } from '@/lib/wow';

interface MatchmakerLandingProps {
  onStart: () => void;
}

// ─── DNA Helix Background ────────────────────────────────────────────────────

const DNA_NODES = 28;

function DnaHelix() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: DNA_NODES }).map((_, i) => {
        const t = i / DNA_NODES;
        const xCenter = 50; // percent from left

        // Strand A: cos wave
        const xA = xCenter + Math.cos(t * Math.PI * 4) * 8;
        // Strand B: offset by π
        const xB = xCenter + Math.cos(t * Math.PI * 4 + Math.PI) * 8;
        const y = 5 + t * 90; // 5% → 95% top

        // Depth illusion: nodes behind center are smaller/dimmer
        const depthA = 0.5 + 0.5 * Math.cos(t * Math.PI * 4);
        const depthB = 0.5 + 0.5 * Math.cos(t * Math.PI * 4 + Math.PI);

        const colorA = i % 3 === 0 ? '#6366f1' : i % 3 === 1 ? '#a855f7' : '#3b82f6';
        const colorB = i % 3 === 0 ? '#ec4899' : i % 3 === 1 ? '#6366f1' : '#a855f7';

        return (
          <motion.div key={i}>
            {/* Strand A node */}
            <motion.div
              className="absolute rounded-full"
              style={{
                left: `${xA}%`,
                top: `${y}%`,
                width: 6 + depthA * 4,
                height: 6 + depthA * 4,
                backgroundColor: colorA,
                opacity: 0.15 + depthA * 0.25,
                filter: `blur(${depthA < 0.5 ? 1.5 : 0}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                x: [0, Math.cos(t * Math.PI * 4) * 6, 0],
                opacity: [
                  0.15 + depthA * 0.25,
                  0.35 + depthA * 0.3,
                  0.15 + depthA * 0.25,
                ],
              }}
              transition={{
                duration: 4 + t * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: t * 0.3,
              }}
            />
            {/* Strand B node */}
            <motion.div
              className="absolute rounded-full"
              style={{
                left: `${xB}%`,
                top: `${y}%`,
                width: 6 + depthB * 4,
                height: 6 + depthB * 4,
                backgroundColor: colorB,
                opacity: 0.12 + depthB * 0.2,
                filter: `blur(${depthB < 0.5 ? 1.5 : 0}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                x: [0, Math.cos(t * Math.PI * 4 + Math.PI) * 6, 0],
                opacity: [
                  0.12 + depthB * 0.2,
                  0.3 + depthB * 0.25,
                  0.12 + depthB * 0.2,
                ],
              }}
              transition={{
                duration: 3.5 + t * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: t * 0.3 + 0.5,
              }}
            />
            {/* Cross-bridge every 4 nodes */}
            {i % 4 === 2 && (
              <motion.div
                className="absolute"
                style={{
                  left: `${Math.min(xA, xB)}%`,
                  top: `${y}%`,
                  width: `${Math.abs(xA - xB)}%`,
                  height: 1,
                  background: `linear-gradient(90deg, ${colorA}40, ${colorB}40)`,
                  transform: 'translateY(-50%)',
                }}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
              />
            )}
          </motion.div>
        );
      })}

      {/* Ambient glow orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ─── Typewriter Headline ──────────────────────────────────────────────────────

const HEADLINE = 'Discover Where You\nTruly Belong';

function TypewriterHeadline() {
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(HEADLINE.slice(0, i + 1));
      i++;
      if (i >= HEADLINE.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 55);
    return () => clearInterval(interval);
  }, []);

  // Blink cursor after typing completes
  useEffect(() => {
    if (!done) return;
    const blink = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(blink);
  }, [done]);

  return (
    <motion.h1
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="text-[48px] sm:text-[64px] md:text-[72px] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6 whitespace-pre-line"
      style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '2px' }}
    >
      {displayed}
      <span
        style={{
          opacity: cursorVisible ? 1 : 0,
          color: '#a855f7',
          transition: 'opacity 0.1s',
          marginLeft: 2,
        }}
      >
        |
      </span>
    </motion.h1>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Delay so it starts after typewriter finishes
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const duration = 2000;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [target]);

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="text-[13px] text-white/30 mb-10 tabular-nums"
    >
      {count.toLocaleString()}+ professionals matched
    </motion.p>
  );
}

// ─── Pulse Ring CTA ───────────────────────────────────────────────────────────

function PulseRingButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, ...springSnappy }}
    >
      {/* Pulse rings */}
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="absolute rounded-xl pointer-events-none"
          style={{
            inset: 0,
            border: '1.5px solid rgba(99,102,241,0.5)',
          }}
          animate={{
            scale: [1, 1.8 + i * 0.4],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: i * 0.65,
          }}
        />
      ))}

      <motion.button
        whileHover={{
          scale: 1.04,
          boxShadow: '0 0 50px rgba(99,102,241,0.55), 0 0 100px rgba(168,85,247,0.2)',
        }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className="relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-[16px] rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.35)] cursor-pointer z-10"
      >
        Start Your Match
        <motion.svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </motion.svg>
      </motion.button>
    </motion.div>
  );
}

// ─── 3D Tilt Glass Card ───────────────────────────────────────────────────────

interface GlassCardProps {
  icon: string;
  title: string;
  desc: string;
  color: string;
  index: number;
}

function GlassCard({ icon, title, desc, color, index }: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const shadowX = useTransform(rotateY, [-15, 15], [-8, 8]);
  const shadowY = useTransform(rotateX, [-15, 15], [8, -8]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxTilt = 14;
      rotateX.set(-(dy / (rect.height / 2)) * maxTilt);
      rotateY.set((dx / (rect.width / 2)) * maxTilt);
      glowX.set(((e.clientX - rect.left) / rect.width) * 100);
      glowY.set(((e.clientY - rect.top) / rect.height) * 100);
    },
    [rotateX, rotateY, glowX, glowY],
  );

  const handleMouseLeave = useCallback(() => {
    animate(rotateX, 0, springSnappy);
    animate(rotateY, 0, springSnappy);
    animate(glowX, 50, springSnappy);
    animate(glowY, 50, springSnappy);
  }, [rotateX, rotateY, glowX, glowY]);

  const cardStyle = {
    rotateX,
    rotateY,
    transformPerspective: 900,
    boxShadow: useTransform(
      [shadowX, shadowY],
      ([sx, sy]: number[]) =>
        `${sx}px ${sy}px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)`,
    ),
  };

  return (
    <motion.div
      ref={cardRef}
      variants={staggerItem}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ z: 20 }}
      className="relative rounded-2xl p-6 text-left cursor-default overflow-hidden"
    >
      {/* Glass background */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      />

      {/* Dynamic glow follow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([gx, gy]: number[]) =>
              `radial-gradient(circle at ${gx}% ${gy}%, ${color}18 0%, transparent 65%)`,
          ),
        }}
      />

      {/* Bottom color accent line */}
      <div
        className="absolute bottom-0 left-6 right-6 h-[1px] rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <motion.div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: color + '22', border: `1px solid ${color}30` }}
          whileHover={{ scale: 1.1 }}
          transition={springBouncy}
        >
          <svg
            className="w-5 h-5"
            style={{ color }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </motion.div>
        <h3 className="text-[14px] font-bold text-white mb-1.5 tracking-wide">{title}</h3>
        <p className="text-[12px] text-white/40 leading-relaxed">{desc}</p>
      </div>

      {/* Corner glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transform: 'translate(40%, -40%)',
        }}
      />
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CARDS = [
  {
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
    title: 'Your Work DNA',
    desc: 'Discover your unique work style, values, and culture preferences',
    color: '#6366f1',
  },
  {
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    title: 'Top Company Matches',
    desc: 'AI-ranked companies that fit your personality and ambitions',
    color: '#a855f7',
  },
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    title: 'Your Competition',
    desc: 'See how you stack up against other candidates in real time',
    color: '#ec4899',
  },
];

export default function MatchmakerLanding({ onStart }: MatchmakerLandingProps) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent relative overflow-hidden">
        <DnaHelix />

        <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ...springSnappy }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-[12px] font-semibold text-purple-300 tracking-widest uppercase"
            style={{
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
            }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            AI-Powered Career Matching
          </motion.div>

          {/* Typewriter Headline */}
          <TypewriterHeadline />

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[16px] sm:text-[18px] text-white/50 max-w-[520px] mx-auto leading-relaxed mb-3"
          >
            In 2 minutes, our AI will analyze your work DNA and match you with
            companies that share your values, pace, and vision.
          </motion.p>

          {/* Animated Counter */}
          <AnimatedCounter target={47000} />

          {/* CTA with Pulse Rings */}
          <PulseRingButton onClick={onStart} />

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 mb-10 h-px w-full max-w-xs mx-auto"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }}
          />

          {/* Section label */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-[11px] text-white/20 uppercase tracking-[3px] mb-6"
          >
            What you&apos;ll unlock
          </motion.p>

          {/* Glass Cards — staggered spring entrance */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {CARDS.map((card, i) => (
              <GlassCard key={i} {...card} index={i} />
            ))}
          </motion.div>

          {/* Trust micro-copy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="mt-8 text-[11px] text-white/18"
            style={{ color: 'rgba(255,255,255,0.18)' }}
          >
            Free · No signup required · Takes 2 minutes
          </motion.p>
        </div>
      </main>
    </>
  );
}
