/**
 * Tests for src/lib/wow.ts — animation utilities.
 */
import {
  springSnappy,
  springBouncy,
  springSmooth,
  springDramatic,
  getTemperatureColors,
  staggerContainer,
  staggerItem,
  spotlightReveal,
  scoreCountUp,
  pulseOnce,
  successBurst,
  shakeError,
  glowPulse,
  processingTimeline,
} from '@/lib/wow';
import type { TemperatureColors, ProcessingStage } from '@/lib/wow';

// ─── Spring Presets ──────────────────────────────────────────────────

describe('Spring presets', () => {
  it.each([
    ['springSnappy', springSnappy, 400, 25],
    ['springBouncy', springBouncy, 300, 15],
    ['springSmooth', springSmooth, 200, 25],
    ['springDramatic', springDramatic, 100, 12],
  ])('%s has correct stiffness=%d and damping=%d', (_name, spring, stiffness, damping) => {
    expect(spring).toEqual(
      expect.objectContaining({ type: 'spring', stiffness, damping })
    );
  });
});

// ─── Temperature Color System ────────────────────────────────────────

describe('getTemperatureColors', () => {
  const tiers: [string, number, string][] = [
    ['gold/amber', 100, '#fbbf24'],
    ['gold/amber', 90, '#fbbf24'],
    ['green', 89, '#22c55e'],
    ['green', 75, '#22c55e'],
    ['purple', 74, '#a855f7'],
    ['purple', 60, '#a855f7'],
    ['blue', 59, '#3b82f6'],
    ['blue', 40, '#3b82f6'],
    ['gray', 39, '#6b7280'],
    ['gray', 0, '#6b7280'],
  ];

  it.each(tiers)('score in %s tier (score=%d) returns primary=%s', (_tier, score, expectedPrimary) => {
    const result = getTemperatureColors(score);
    expect(result.primary).toBe(expectedPrimary);
  });

  it('returns all required fields', () => {
    const result = getTemperatureColors(85);
    expect(result).toHaveProperty('primary');
    expect(result).toHaveProperty('glow');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('gradient');
  });

  it('glow contains alpha for shadow use', () => {
    const result = getTemperatureColors(95);
    expect(result.glow).toMatch(/^rgba\(/);
  });

  it('bg contains low alpha for background use', () => {
    const result = getTemperatureColors(50);
    expect(result.bg).toMatch(/0\.1\)$/);
  });

  it('gradient is a CSS linear-gradient string', () => {
    const result = getTemperatureColors(70);
    expect(result.gradient).toMatch(/^linear-gradient\(/);
  });

  it('covers edge boundary at 90', () => {
    expect(getTemperatureColors(90).primary).toBe('#fbbf24');
    expect(getTemperatureColors(89).primary).toBe('#22c55e');
  });

  it('covers edge boundary at 75', () => {
    expect(getTemperatureColors(75).primary).toBe('#22c55e');
    expect(getTemperatureColors(74).primary).toBe('#a855f7');
  });

  it('covers edge boundary at 60', () => {
    expect(getTemperatureColors(60).primary).toBe('#a855f7');
    expect(getTemperatureColors(59).primary).toBe('#3b82f6');
  });

  it('covers edge boundary at 40', () => {
    expect(getTemperatureColors(40).primary).toBe('#3b82f6');
    expect(getTemperatureColors(39).primary).toBe('#6b7280');
  });

  it('handles negative scores gracefully', () => {
    const result = getTemperatureColors(-5);
    expect(result.primary).toBe('#6b7280');
  });

  it('satisfies TemperatureColors interface', () => {
    const result: TemperatureColors = getTemperatureColors(80);
    expect(typeof result.primary).toBe('string');
    expect(typeof result.glow).toBe('string');
    expect(typeof result.bg).toBe('string');
    expect(typeof result.gradient).toBe('string');
  });
});

// ─── Progressive Disclosure Variants ─────────────────────────────────

describe('Progressive disclosure variants', () => {
  it('staggerContainer has hidden and visible states', () => {
    expect(staggerContainer).toHaveProperty('hidden');
    expect(staggerContainer).toHaveProperty('visible');
  });

  it('staggerContainer.visible has staggerChildren', () => {
    const vis = staggerContainer.visible as { transition: { staggerChildren: number } };
    expect(vis.transition.staggerChildren).toBe(0.08);
  });

  it('staggerContainer.visible has delayChildren', () => {
    const vis = staggerContainer.visible as { transition: { delayChildren: number } };
    expect(vis.transition.delayChildren).toBe(0.15);
  });

  it('staggerItem has hidden and visible states', () => {
    expect(staggerItem).toHaveProperty('hidden');
    expect(staggerItem).toHaveProperty('visible');
    expect((staggerItem.hidden as { y: number }).y).toBe(20);
    expect((staggerItem.hidden as { opacity: number }).opacity).toBe(0);
  });

  it('staggerItem.visible resets to y=0 and opacity=1', () => {
    const vis = staggerItem.visible as { y: number; opacity: number };
    expect(vis.y).toBe(0);
    expect(vis.opacity).toBe(1);
  });

  it('spotlightReveal scales from 0.85', () => {
    expect((spotlightReveal.hidden as { scale: number }).scale).toBe(0.85);
    expect((spotlightReveal.visible as { scale: number }).scale).toBe(1);
  });
});

// ─── scoreCountUp ────────────────────────────────────────────────────

describe('scoreCountUp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns start, tick, and done functions', () => {
    const result = scoreCountUp(0, 100, 1000, jest.fn());
    expect(typeof result.start).toBe('function');
    expect(typeof result.tick).toBe('function');
    expect(typeof result.done).toBe('function');
  });

  it('tick at progress=0 returns from value', () => {
    const values: number[] = [];
    const { tick } = scoreCountUp(0, 100, 1000, (v) => values.push(v));
    tick(0);
    expect(values[0]).toBe(0);
  });

  it('tick at progress=1 returns to value', () => {
    const values: number[] = [];
    const { tick } = scoreCountUp(0, 100, 1000, (v) => values.push(v));
    tick(1);
    expect(values[0]).toBe(100);
  });

  it('tick at progress=0.5 applies easeOutCubic', () => {
    const values: number[] = [];
    const { tick } = scoreCountUp(0, 100, 1000, (v) => values.push(v));
    tick(0.5);
    // easeOutCubic(0.5) = 1 - (0.5)^3 = 1 - 0.125 = 0.875
    expect(values[0]).toBe(88); // Math.round(100 * 0.875)
  });

  it('done sets final value', () => {
    const values: number[] = [];
    const { done } = scoreCountUp(10, 95, 1000, (v) => values.push(v));
    done();
    expect(values[values.length - 1]).toBe(95);
  });

  it('works with non-zero start value', () => {
    const values: number[] = [];
    const { tick } = scoreCountUp(50, 100, 1000, (v) => values.push(v));
    tick(0);
    expect(values[0]).toBe(50);
    tick(1);
    expect(values[1]).toBe(100);
  });

  it('clamps progress beyond 1', () => {
    const values: number[] = [];
    const { tick } = scoreCountUp(0, 100, 1000, (v) => values.push(v));
    tick(2);
    expect(values[0]).toBe(100);
  });
});

// ─── Micro-Feedback Animation Presets ────────────────────────────────

describe('Micro-feedback presets', () => {
  it('pulseOnce has scale keyframes', () => {
    expect(pulseOnce.scale).toEqual([1, 1.15, 1]);
  });

  it('pulseOnce has transition', () => {
    expect(pulseOnce.transition).toHaveProperty('duration');
  });

  it('successBurst has scale keyframes', () => {
    expect(successBurst.scale).toEqual([1, 1.3, 1]);
  });

  it('successBurst uses snappy spring', () => {
    expect(successBurst.transition).toEqual(springSnappy);
  });

  it('shakeError has x keyframes', () => {
    expect(shakeError.x).toEqual([-4, 4, -4, 4, 0]);
  });

  it('shakeError ends at x=0', () => {
    const xValues = shakeError.x;
    expect(xValues[xValues.length - 1]).toBe(0);
  });
});

describe('glowPulse', () => {
  it('returns boxShadow keyframes with the given color', () => {
    const result = glowPulse('#ff0000');
    expect(result.boxShadow).toHaveLength(3);
    expect(result.boxShadow[0]).toContain('#ff0000');
    expect(result.boxShadow[1]).toContain('#ff0000');
    expect(result.boxShadow[2]).toContain('#ff0000');
  });

  it('middle keyframe has 20px spread', () => {
    const result = glowPulse('blue');
    expect(result.boxShadow[1]).toContain('20px');
  });

  it('first and last keyframes have 0px spread', () => {
    const result = glowPulse('red');
    expect(result.boxShadow[0]).toContain('0px');
    expect(result.boxShadow[2]).toContain('0px');
  });

  it('has infinite repeat transition', () => {
    const result = glowPulse('#abc');
    expect(result.transition.repeat).toBe(Infinity);
  });
});

// ─── Processing Stage Helpers ────────────────────────────────────────

describe('processingTimeline', () => {
  it('returns evenly spaced delays', () => {
    expect(processingTimeline(4, 2000)).toEqual([0, 500, 1000, 1500]);
  });

  it('returns [0] for single stage', () => {
    expect(processingTimeline(1, 5000)).toEqual([0]);
  });

  it('returns [0] for zero stages', () => {
    expect(processingTimeline(0, 5000)).toEqual([0]);
  });

  it('handles 2 stages', () => {
    expect(processingTimeline(2, 1000)).toEqual([0, 500]);
  });

  it('handles 3 stages', () => {
    expect(processingTimeline(3, 3000)).toEqual([0, 1000, 2000]);
  });

  it('rounds values', () => {
    const result = processingTimeline(3, 1000);
    result.forEach((v) => expect(v).toBe(Math.round(v)));
  });

  it('first delay is always 0', () => {
    expect(processingTimeline(5, 5000)[0]).toBe(0);
  });
});

describe('ProcessingStage type', () => {
  it('accepts stage with all fields', () => {
    const stage: ProcessingStage = {
      icon: 'M12 3v1',
      label: 'Processing...',
      sublabel: 'Almost there',
    };
    expect(stage.label).toBe('Processing...');
    expect(stage.sublabel).toBe('Almost there');
  });

  it('accepts stage without sublabel', () => {
    const stage: ProcessingStage = {
      icon: 'M12 3v1',
      label: 'Loading...',
    };
    expect(stage.sublabel).toBeUndefined();
  });
});
