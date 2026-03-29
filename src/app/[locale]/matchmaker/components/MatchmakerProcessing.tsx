'use client';

import { motion, AnimatePresence, useAnimationFrame } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import type { ProcessingStage } from '../types';
import { springSnappy, springBouncy, springSmooth } from '@/lib/wow';

interface MatchmakerProcessingProps {
  processingStage: number;
  stages: ProcessingStage[];
  topColor: string;
  showResultsFlash: boolean;
}

// ── Orb color per stage ─────────────────────────────────────────────────────
const ORB_COLORS = [
  { core: '#60a5fa', mid: '#3b82f6', outer: '#1d4ed8', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(96,165,250,0.5)' },
  { core: '#c084fc', mid: '#a855f7', outer: '#7e22ce', bg: 'rgba(168,85,247,0.14)', glow: 'rgba(192,132,252,0.5)' },
  { core: '#4ade80', mid: '#22c55e', outer: '#15803d', bg: 'rgba(34,197,94,0.12)', glow: 'rgba(74,222,128,0.5)' },
  { core: '#86efac', mid: '#4ade80', outer: '#166534', bg: 'rgba(74,222,128,0.14)', glow: 'rgba(134,239,172,0.55)' },
];

// ── Background gradients per stage ──────────────────────────────────────────
const BG_GRADIENTS = [
  'radial-gradient(ellipse 120% 80% at 50% 60%, rgba(30,58,138,0.45) 0%, rgba(15,23,42,0) 70%)',
  'radial-gradient(ellipse 120% 80% at 50% 60%, rgba(76,29,149,0.45) 0%, rgba(15,23,42,0) 70%)',
  'radial-gradient(ellipse 120% 80% at 50% 60%, rgba(20,83,45,0.45) 0%, rgba(15,23,42,0) 70%)',
  'radial-gradient(ellipse 120% 80% at 50% 60%, rgba(5,46,22,0.50) 0%, rgba(15,23,42,0) 70%)',
];

// ── Floating labels ──────────────────────────────────────────────────────────
const FLOATING_LABELS: string[][] = [
  ['Scanning resume patterns...', 'Reading career signals...', 'Parsing 847 data points...'],
  ['Cross-referencing values...', 'Mapping culture fit...', 'Analyzing work DNA...'],
  ['Scanning 16 companies...', 'Ranking 312 roles...', 'Calibrating salary bands...'],
  ['Finalising match score...', 'Weighing 29 countries...', 'Locking best results...'],
];

// ── DNA strand via SVG sine waves ────────────────────────────────────────────
function DnaStrand({ color }: { color: string }) {
  const points = 32;
  const width = 240;
  const height = 80;
  const amplitude = 22;
  const freq = (2 * Math.PI) / width;

  const strand1 = Array.from({ length: points + 1 }, (_, i) => {
    const x = (i / points) * width;
    const y = height / 2 + Math.sin(freq * x * 2.5) * amplitude;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const strand2 = Array.from({ length: points + 1 }, (_, i) => {
    const x = (i / points) * width;
    const y = height / 2 - Math.sin(freq * x * 2.5) * amplitude;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // cross-links at every ~quarter wavelength
  const crossCount = 7;
  const crosses = Array.from({ length: crossCount }, (_, i) => {
    const t = (i + 0.5) / crossCount;
    const x = t * width;
    const y1 = height / 2 + Math.sin(freq * x * 2.5) * amplitude;
    const y2 = height / 2 - Math.sin(freq * x * 2.5) * amplitude;
    return { x, y1, y2 };
  });

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto"
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={springSmooth}
    >
      {/* Animated strand 1 */}
      <motion.path
        d={strand1}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
        animate={{ pathOffset: [0, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        style={{ pathLength: 1 }}
      />
      {/* Animated strand 2 */}
      <motion.path
        d={strand2}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
        animate={{ pathOffset: [1, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        style={{ pathLength: 1 }}
      />
      {/* Cross-links */}
      {crosses.map((c, i) => (
        <motion.line
          key={i}
          x1={c.x} y1={c.y1}
          x2={c.x} y2={c.y2}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={0.4}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
      {/* Node dots on strand 1 */}
      {crosses.map((c, i) => (
        <motion.circle
          key={`n1-${i}`}
          cx={c.x} cy={c.y1} r={2.5}
          fill={color}
          animate={{ r: [2, 3.5, 2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
      {/* Node dots on strand 2 */}
      {crosses.map((c, i) => (
        <motion.circle
          key={`n2-${i}`}
          cx={c.x} cy={c.y2} r={2.5}
          fill={color}
          animate={{ r: [2, 3.5, 2], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 + 0.8 }}
        />
      ))}
    </motion.svg>
  );
}

// ── Pulsing neural orb ───────────────────────────────────────────────────────
function NeuralOrb({ stage, stageIcon }: { stage: number; stageIcon: string }) {
  const orb = ORB_COLORS[stage] ?? ORB_COLORS[0];

  // Orbiting particles: 6 at different radii / speeds
  const particles = [
    { radius: 72, speed: 5.0, size: 4, delay: 0 },
    { radius: 88, speed: 7.5, size: 3, delay: 1.2 },
    { radius: 60, speed: 4.2, size: 5, delay: 0.6 },
    { radius: 100, speed: 9.0, size: 2, delay: 2.1 },
    { radius: 78, speed: 6.3, size: 3, delay: 1.7 },
    { radius: 54, speed: 3.8, size: 4, delay: 0.3 },
  ];

  return (
    <div className="relative mx-auto" style={{ width: 220, height: 220 }}>
      {/* Outermost breathing ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: `radial-gradient(circle, ${orb.glow} 0%, transparent 70%)` }}
      />

      {/* Concentric breathing rings */}
      {[0, 1, 2].map((ri) => (
        <motion.div
          key={ri}
          className="absolute rounded-full border"
          style={{
            inset: ri * 18,
            borderColor: `${orb.mid}${ri === 0 ? '30' : ri === 1 ? '20' : '12'}`,
          }}
          animate={{ scale: [1, 1 + 0.04 * (ri + 1), 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4 + ri * 0.4, repeat: Infinity, delay: ri * 0.3, ease: 'easeInOut' }}
        />
      ))}

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <OrbitingParticle key={i} {...p} color={orb.core} centerX={110} centerY={110} />
      ))}

      {/* Core orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: 54,
          background: `radial-gradient(circle at 38% 38%, ${orb.core}, ${orb.mid} 55%, ${orb.outer})`,
          boxShadow: `0 0 40px 10px ${orb.glow}, 0 0 80px 20px ${orb.bg}, inset 0 0 20px rgba(255,255,255,0.15)`,
        }}
        animate={{ scale: [1, 1.08, 1], boxShadow: [
          `0 0 30px 8px ${orb.glow}, 0 0 60px 16px ${orb.bg}`,
          `0 0 55px 18px ${orb.glow}, 0 0 100px 30px ${orb.bg}`,
          `0 0 30px 8px ${orb.glow}, 0 0 60px 16px ${orb.bg}`,
        ]}}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Inner specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top: '18%', left: '22%',
            width: '35%', height: '30%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 100%)',
          }}
        />
      </motion.div>

      {/* Stage icon in center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          key={stage}
          initial={{ scale: 0, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={springBouncy}
          className="text-2xl select-none"
          style={{ filter: `drop-shadow(0 0 8px ${orb.glow})` }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={stageIcon} />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

// ── Orbiting particle (uses useAnimationFrame for smooth circular motion) ────
function OrbitingParticle({
  radius, speed, size, delay, color, centerX, centerY,
}: {
  radius: number; speed: number; size: number; delay: number; color: string; centerX: number; centerY: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = time;
    const elapsed = (time - startRef.current) / 1000 + delay;
    const angle = (elapsed / speed) * 2 * Math.PI;
    const x = centerX + Math.cos(angle) * radius - size / 2;
    const y = centerY + Math.sin(angle) * radius - size / 2;
    ref.current.style.transform = `translate(${x - centerX}px, ${y - centerY}px)`;
    // pulse opacity with offset per particle
    const pulse = 0.35 + 0.45 * Math.sin(elapsed * 1.8 + delay);
    ref.current.style.opacity = String(pulse);
  });

  return (
    <div
      ref={ref}
      className="absolute rounded-full"
      style={{
        left: centerX, top: centerY,
        width: size, height: size,
        background: color,
        boxShadow: `0 0 ${size * 3}px ${color}`,
      }}
    />
  );
}

// ── Stage card ───────────────────────────────────────────────────────────────
function StageCard({
  stage, index, processingStage, topColor,
}: {
  stage: ProcessingStage; index: number; processingStage: number; topColor: string;
}) {
  const isDone = processingStage > index;
  const isActive = processingStage === index;
  const isPending = processingStage < index;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`card-${index}-${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
        initial={{ opacity: 0, x: 60, scale: 0.94 }}
        animate={{
          opacity: isPending ? 0.2 : 1,
          x: 0,
          scale: isPending ? 0.97 : 1,
        }}
        exit={{ opacity: 0, x: -40, scale: 0.92 }}
        transition={isActive ? springBouncy : springSnappy}
        className="relative flex items-center gap-3 rounded-xl px-4 py-3 border"
        style={{
          background: isDone
            ? 'rgba(34,197,94,0.07)'
            : isActive
              ? `${topColor}0d`
              : 'rgba(255,255,255,0.02)',
          borderColor: isDone
            ? 'rgba(34,197,94,0.22)'
            : isActive
              ? `${topColor}35`
              : 'rgba(255,255,255,0.06)',
          boxShadow: isActive
            ? `0 0 0 1px ${topColor}20, 0 4px 24px ${topColor}15, inset 0 0 20px ${topColor}05`
            : 'none',
        }}
      >
        {/* Icon badge */}
        <motion.div
          className="relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: isDone
              ? 'rgba(34,197,94,0.15)'
              : isActive
                ? `${topColor}18`
                : 'rgba(255,255,255,0.04)',
          }}
          animate={isActive ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isDone ? (
            <motion.svg
              width="18" height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ade80"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0, rotate: -120 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springBouncy, delay: 0.05 }}
            >
              <path d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <svg
              width="18" height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isActive ? topColor : 'rgba(255,255,255,0.25)'}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={stage.icon} />
            </svg>
          )}
        </motion.div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <p
            className="text-sm font-semibold leading-tight truncate"
            style={{
              color: isDone
                ? 'rgba(134,239,172,0.85)'
                : isActive
                  ? 'rgba(255,255,255,0.92)'
                  : 'rgba(255,255,255,0.22)',
              textShadow: isActive ? `0 0 16px ${topColor}80` : 'none',
            }}
          >
            {stage.label}
          </p>
          <motion.p
            className="text-xs mt-0.5 leading-tight"
            style={{
              color: isDone
                ? 'rgba(134,239,172,0.45)'
                : isActive
                  ? 'rgba(255,255,255,0.42)'
                  : 'rgba(255,255,255,0.12)',
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: processingStage >= index ? 1 : 0, y: processingStage >= index ? 0 : -4 }}
            transition={{ ...springSnappy, delay: 0.12 }}
          >
            {stage.sublabel}
          </motion.p>
        </div>

        {/* Active pulse ring on the card edge */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{ boxShadow: [`0 0 0 0px ${topColor}30`, `0 0 0 4px ${topColor}00`] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Floating label ───────────────────────────────────────────────────────────
function FloatingLabel({ label, x, y, delay }: { label: string; x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none whitespace-nowrap text-xs font-mono rounded-full px-2.5 py-1 border"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        borderColor: 'rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        color: 'rgba(255,255,255,0.55)',
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ opacity: 0, scale: 0.8, y: 8 }}
      animate={{ opacity: [0, 0.85, 0.85, 0], scale: [0.85, 1, 1, 0.9], y: [8, 0, 0, -8] }}
      transition={{ duration: 3.2, delay, ease: 'easeInOut' }}
    >
      {label}
    </motion.div>
  );
}

// ── FloatingLabels manager ───────────────────────────────────────────────────
function FloatingLabels({ stage }: { stage: number }) {
  const [visible, setVisible] = useState<{ id: number; label: string; x: number; y: number; delay: number }[]>([]);
  const counterRef = useRef(0);

  const labels = FLOATING_LABELS[stage] ?? FLOATING_LABELS[0];

  const spawnLabel = useCallback(() => {
    const id = counterRef.current++;
    const label = labels[id % labels.length];
    // Positions around the orb (avoid center 35–65% x, 40–60% y)
    const positions = [
      { x: 15, y: 30 }, { x: 82, y: 28 }, { x: 10, y: 65 },
      { x: 86, y: 68 }, { x: 50, y: 15 }, { x: 50, y: 85 },
    ];
    const pos = positions[id % positions.length];
    setVisible((prev) => [...prev.slice(-4), { id, label, x: pos.x, y: pos.y, delay: 0 }]);
  }, [labels]);

  useEffect(() => {
    spawnLabel();
    const interval = setInterval(spawnLabel, 2200);
    return () => clearInterval(interval);
  }, [spawnLabel, stage]);

  return (
    <>
      {visible.map((item) => (
        <FloatingLabel key={item.id} label={item.label} x={item.x} y={item.y} delay={item.delay} />
      ))}
    </>
  );
}

// ── Glowing percentage counter ───────────────────────────────────────────────
function GlowingPercent({ value, topColor }: { value: number; topColor: string }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    // quick count-up when value changes
    const from = displayed;
    const to = value;
    if (from === to) return;
    const duration = 600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const intensity = displayed / 100; // 0–1
  const glowSize = 6 + intensity * 28;
  const glowAlpha = Math.round((0.3 + intensity * 0.55) * 255).toString(16).padStart(2, '0');

  return (
    <motion.div
      className="relative"
      animate={{ scale: [1, 1.03, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span
        className="text-5xl font-mono font-bold tabular-nums tracking-tighter"
        style={{
          color: displayed === 100 ? '#4ade80' : 'rgba(255,255,255,0.92)',
          textShadow: `0 0 ${glowSize}px ${topColor}${glowAlpha}, 0 0 ${glowSize * 2}px ${topColor}${Math.round(intensity * 80).toString(16).padStart(2, '0')}`,
        }}
      >
        {displayed}
      </span>
      <span
        className="text-xl font-mono font-semibold ml-0.5"
        style={{ color: 'rgba(255,255,255,0.35)', verticalAlign: 'super', fontSize: '1rem' }}
      >
        %
      </span>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MatchmakerProcessing({
  processingStage,
  stages,
  topColor,
  showResultsFlash,
}: MatchmakerProcessingProps) {
  const progressPercent = Math.round(((processingStage + 1) / stages.length) * 100);
  const orb = ORB_COLORS[processingStage] ?? ORB_COLORS[0];
  const bg = BG_GRADIENTS[processingStage] ?? BG_GRADIENTS[0];

  return (
    <>
      <Header />

      {/* Full-screen flash on completion */}
      <AnimatePresence>
        {showResultsFlash && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(200,255,220,0.6) 50%, transparent 100%)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center py-20">
        {/* ── Temperature-shifting background ── */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ background: bg }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating labels layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingLabels stage={processingStage} />
        </div>

        {/* ── Main content card ── */}
        <motion.div
          className="relative z-10 flex flex-col items-center w-full max-w-sm px-4"
          animate={showResultsFlash ? { scale: 1.04 } : { scale: 1 }}
          transition={springSmooth}
        >
          {/* Neural orb */}
          <motion.div
            key={`orb-stage-${processingStage}`}
            initial={{ opacity: 0.6, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springSmooth}
            className="mb-6"
          >
            <NeuralOrb stage={processingStage} stageIcon={stages[processingStage]?.icon ?? ''} />
          </motion.div>

          {/* DNA strand */}
          <div className="mb-7 w-full flex justify-center">
            <motion.div
              key={`dna-${processingStage}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSnappy}
            >
              <DnaStrand color={orb.core} />
              <motion.p
                className="text-center text-xs font-mono mt-2"
                style={{ color: `${orb.core}80` }}
                animate={{ opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                analyzing your career DNA
              </motion.p>
            </motion.div>
          </div>

          {/* Stage cards */}
          <div className="w-full space-y-2 mb-7">
            {stages.map((stage, i) => (
              <StageCard
                key={i}
                stage={stage}
                index={i}
                processingStage={processingStage}
                topColor={topColor}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: `linear-gradient(90deg, ${orb.mid}, ${orb.core})` }}
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={springSmooth}
            >
              {/* shimmer */}
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', backgroundSize: '200% 100%' }}
                animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          </div>

          {/* Glowing percentage */}
          <GlowingPercent value={progressPercent} topColor={orb.core} />
        </motion.div>
      </div>
    </>
  );
}
