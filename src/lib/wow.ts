import type { Variant, Transition } from "framer-motion";

// ─────────────────────────────────────────────
// 1. Spring Presets
// ─────────────────────────────────────────────

export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 25 };
export const springBouncy: Transition = { type: "spring", stiffness: 300, damping: 15 };
export const springSmooth: Transition = { type: "spring", stiffness: 200, damping: 25 };
export const springDramatic: Transition = { type: "spring", stiffness: 100, damping: 12 };

// ─────────────────────────────────────────────
// 2. Temperature Color System
// ─────────────────────────────────────────────

export interface TemperatureColors {
  primary: string;
  glow: string;
  bg: string;
  gradient: string;
}

export function getTemperatureColors(score: number): TemperatureColors {
  if (score >= 90) {
    return {
      primary: "#fbbf24",
      glow: "rgba(251, 191, 36, 0.5)",
      bg: "rgba(251, 191, 36, 0.1)",
      gradient: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
    };
  }
  if (score >= 75) {
    return {
      primary: "#22c55e",
      glow: "rgba(34, 197, 94, 0.5)",
      bg: "rgba(34, 197, 94, 0.1)",
      gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)",
    };
  }
  if (score >= 60) {
    return {
      primary: "#a855f7",
      glow: "rgba(168, 85, 247, 0.5)",
      bg: "rgba(168, 85, 247, 0.1)",
      gradient: "linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)",
    };
  }
  if (score >= 40) {
    return {
      primary: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.5)",
      bg: "rgba(59, 130, 246, 0.1)",
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)",
    };
  }
  return {
    primary: "#6b7280",
    glow: "rgba(107, 114, 128, 0.5)",
    bg: "rgba(107, 114, 128, 0.1)",
    gradient: "linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%)",
  };
}

// ─────────────────────────────────────────────
// 3. Phase-Based Progressive Disclosure Variants
// ─────────────────────────────────────────────

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
} satisfies Record<string, Variant>;

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springBouncy,
  },
} satisfies Record<string, Variant>;

export const spotlightReveal = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springDramatic,
  },
} satisfies Record<string, Variant>;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Returns callbacks for animated number counting with easeOutCubic easing.
 *
 * Usage:
 *   const { start } = scoreCountUp(0, targetScore, 1200, (v) => setDisplayed(v));
 *   start();
 */
export function scoreCountUp(
  from: number,
  to: number,
  durationMs: number,
  onTick: (value: number) => void,
): { start: () => void; tick: (progress: number) => void; done: () => void } {
  let rafId: number | null = null;

  const tick = (progress: number) => {
    const eased = easeOutCubic(Math.min(progress, 1));
    onTick(Math.round(from + (to - from) * eased));
  };

  const done = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    onTick(to);
  };

  const start = () => {
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = elapsed / durationMs;

      tick(progress);

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        done();
      }
    };

    rafId = requestAnimationFrame(step);
  };

  return { start, tick, done };
}

// ─────────────────────────────────────────────
// 4. Micro-Feedback Animation Presets
// ─────────────────────────────────────────────

export const pulseOnce = {
  scale: [1, 1.15, 1],
  transition: { duration: 0.35, ease: "easeInOut" },
};

export const successBurst = {
  scale: [1, 1.3, 1],
  transition: springSnappy,
};

export const shakeError = {
  x: [-4, 4, -4, 4, 0],
  transition: { duration: 0.4, ease: "easeInOut" },
};

export function glowPulse(color: string) {
  return {
    boxShadow: [
      `0 0 0px ${color}`,
      `0 0 20px ${color}`,
      `0 0 0px ${color}`,
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };
}

// ─────────────────────────────────────────────
// 5. Processing Stage Helpers
// ─────────────────────────────────────────────

export interface ProcessingStage {
  icon: string;
  label: string;
  sublabel?: string;
}

/**
 * Returns an array of delay values (in ms) for evenly spaced stage reveals.
 *
 * Example: processingTimeline(4, 2000) → [0, 500, 1000, 1500]
 */
export function processingTimeline(
  stageCount: number,
  totalDurationMs: number,
): number[] {
  if (stageCount <= 1) return [0];
  const interval = totalDurationMs / stageCount;
  return Array.from({ length: stageCount }, (_, i) => Math.round(i * interval));
}
