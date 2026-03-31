'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { springBouncy, springSnappy, springSmooth, scoreCountUp } from '@/lib/wow';

// ─────────────────────────────────────────────────────────────────────────────
// Shared animation variants
// ─────────────────────────────────────────────────────────────────────────────

const sectionFadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: springSmooth },
};

const staggerGrid = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: springBouncy },
};

const VP_ONCE = { once: true, amount: 0.05 as const, margin: '0px 0px -60px 0px' as const };

// ─────────────────────────────────────────────────────────────────────────────
// Platform Showcase — animated product features with live demo feel
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_FEATURES = [
  {
    title: 'AI CV Parsing',
    desc: 'Upload a resume — our AI extracts skills, experience, education, and certifications in under 3 seconds. Powered by Gemini 2.5 Flash.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="9" y1="15" x2="15" y2="15" strokeLinecap="round" />
        <line x1="9" y1="11" x2="13" y2="11" strokeLinecap="round" />
      </svg>
    ),
    color: '#3b82f6',
    metric: '3s',
    metricLabel: 'avg parse time',
  },
  {
    title: 'Culture Matchmaker',
    desc: '10-question personality quiz maps candidates to company cultures. Machine-learning scoring produces match percentages you can trust.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#ec4899',
    metric: '94%',
    metricLabel: 'match accuracy',
  },
  {
    title: 'Smart Job Matching',
    desc: 'AI scores every candidate against every job description. Recruiters see ranked applicants; candidates see their top matches.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
        <line x1="11" y1="8" x2="11" y2="14" strokeLinecap="round" />
        <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
      </svg>
    ),
    color: '#a855f7',
    metric: '10x',
    metricLabel: 'faster hiring',
  },
  {
    title: 'Visa Compliance Engine',
    desc: 'Real-time work permit data for 29 countries. Auto-tag sponsorship requirements, visa types, and eligibility per candidate.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#22c55e',
    metric: '130+',
    metricLabel: 'visa types',
  },
  {
    title: 'Pipeline & ATS',
    desc: 'Kanban boards, stage tracking, team collaboration. Webhook integrations push updates to your existing ATS in real time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    color: '#6366f1',
    metric: 'Real-time',
    metricLabel: 'webhooks',
  },
  {
    title: 'AI Job Description Writer',
    desc: 'Paste a rough JD and our AI rewrites it for clarity, inclusivity, and SEO. Extracts must-have vs. nice-to-have skills automatically.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
        <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#f59e0b',
    metric: '2x',
    metricLabel: 'more applicants',
  },
];

function FeatureMetric({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ ...springBouncy, delay: 0.3 }}
      className="flex items-center gap-1.5 mt-3"
    >
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-slate-400 dark:text-white/40">{label}</span>
    </motion.div>
  );
}

export function PlatformShowcase() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Section background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={sectionFadeUp}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-4">
            Platform
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            One Platform. Every Hiring Need.
          </h2>
          <p className="mt-4 text-lg text-white/50">
            From AI-powered CV parsing to global visa compliance — everything your team needs to hire smarter, built into one SaaS platform.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={staggerGrid}
          className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {PLATFORM_FEATURES.map((f) => (
            <PlatformCard key={f.title} {...f} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function PlatformCard({
  title,
  desc,
  icon,
  color,
  metric,
  metricLabel,
}: (typeof PLATFORM_FEATURES)[number]) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={gridItem}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -6 : 0,
        boxShadow: hovered
          ? `0 20px 60px -12px ${color}33, 0 0 0 1px ${color}44`
          : '0 0 0 1px rgba(255,255,255,0.06)',
      }}
      transition={springSnappy}
      className="relative rounded-2xl bg-white/[0.04] backdrop-blur-md ring-1 ring-white/[0.07] overflow-hidden p-6"
    >
      {/* Hover glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${color}22 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>

        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">{desc}</p>

        <FeatureMetric value={metric} label={metricLabel} color={color} />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Section — SaaS tiers with wow-factor animations
// ─────────────────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for small teams getting started.',
    color: '#6b7280',
    features: ['3 active job posts', '10 candidate views/mo', 'AI candidate ranking', 'Basic pipeline', 'Email support'],
    cta: 'Start Free',
    href: '/auth?mode=signup&role=recruiter',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    desc: 'For growing teams that need more power.',
    color: '#3b82f6',
    features: ['25 active job posts', '200 candidate views/mo', 'AI JD writer', 'Visa compliance', 'ATS webhooks', 'Priority support'],
    cta: 'Start Pro Trial',
    href: '/auth?mode=signup&role=recruiter&tier=pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    desc: 'For large organizations hiring at scale.',
    color: '#a855f7',
    features: ['Unlimited job posts', 'Unlimited views', 'Custom integrations', 'Dedicated CSM', 'SSO & SAML', 'API access', 'SLA guarantee'],
    cta: 'Contact Sales',
    href: '/auth?mode=signup&role=recruiter&tier=enterprise',
    popular: false,
  },
  {
    name: 'Agency',
    price: '$999',
    period: '/month',
    desc: 'For staffing agencies managing multiple clients.',
    color: '#f59e0b',
    features: ['Everything in Enterprise', 'Multi-tenant dashboard', 'White-label options', 'Bulk candidate import', 'Revenue analytics', 'Partner API'],
    cta: 'Contact Sales',
    href: '/auth?mode=signup&role=recruiter&tier=agency',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={sectionFadeUp}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-white/50">
            Candidates always free. Recruiters start free, upgrade when you&apos;re ready.
            <br className="hidden sm:block" />
            No hidden fees. Cancel anytime.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={staggerGrid}
          className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} {...tier} />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mt-8 text-sm text-slate-400 dark:text-white/30"
        >
          All plans include SSL encryption, GDPR compliance, and 99.9% uptime SLA
        </motion.p>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  desc,
  color,
  features,
  cta,
  href,
  popular,
}: (typeof TIERS)[number]) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={gridItem}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -8 : 0,
        boxShadow: hovered
          ? `0 24px 64px -16px ${color}33, 0 0 0 1px ${color}55`
          : popular
          ? `0 0 0 2px ${color}44, 0 8px 32px -8px ${color}22`
          : '0 0 0 1px rgba(255,255,255,0.08)',
      }}
      transition={springSnappy}
      className={[
        'relative rounded-2xl backdrop-blur-md overflow-hidden p-6 flex flex-col',
        popular ? 'bg-slate-100 dark:bg-white/[0.06]' : 'bg-slate-50 dark:bg-white/[0.03]',
      ].join(' ')}
    >
      {/* Popular badge */}
      {popular && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springBouncy, delay: 0.5 }}
          className="absolute -top-px left-1/2 -translate-x-1/2 px-4 py-1 rounded-b-lg text-xs font-bold tracking-wider uppercase"
          style={{ background: color, color: '#fff' }}
        >
          Most Popular
        </motion.div>
      )}

      {/* Hover glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: `radial-gradient(ellipse 80% 40% at 50% 0%, ${color}18 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col flex-1">
        <p className="text-sm font-semibold tracking-wide" style={{ color }}>
          {name}
        </p>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{price}</span>
          <span className="text-sm text-slate-400 dark:text-white/40">{period}</span>
        </div>

        <p className="mt-2 text-sm text-slate-500 dark:text-white/50">{desc}</p>

        <ul className="mt-6 space-y-2.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-white/60">
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        <Link
          href={href}
          className="mt-6 block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: popular ? color : 'transparent',
            color: popular ? '#fff' : color,
            border: popular ? 'none' : `1px solid ${color}55`,
          }}
        >
          {cta}
        </Link>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Proof Metrics Bar — animated counters
// ─────────────────────────────────────────────────────────────────────────────

const SOCIAL_METRICS = [
  { label: 'Companies Hiring', target: 500, suffix: '+', color: '#3b82f6' },
  { label: 'Candidates Matched', target: 12000, suffix: '+', color: '#22c55e' },
  { label: 'Countries Covered', target: 29, suffix: '', color: '#a855f7' },
  { label: 'Uptime SLA', target: 99.9, suffix: '%', color: '#f59e0b', decimals: 1 },
];

export function SocialProofBar() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="py-10 sm:py-14 border-y border-white/[0.05]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1, margin: '0px 0px -40px 0px' }}
          variants={staggerGrid}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8"
        >
          {SOCIAL_METRICS.map((m) => (
            <MetricCounter key={m.label} {...m} isInView={isInView} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function MetricCounter({
  label,
  target,
  suffix,
  color,
  decimals,
  isInView,
}: {
  label: string;
  target: number;
  suffix: string;
  color: string;
  decimals?: number;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (decimals) {
      // For decimal values like 99.9
      const { start } = scoreCountUp(0, target * 10, 1800, (v) => setCount(v));
      start();
    } else {
      const { start } = scoreCountUp(0, target, 1800, setCount);
      start();
    }
  }, [isInView, target, decimals]);

  const displayValue = decimals ? (count / 10).toFixed(decimals) : count.toLocaleString();

  return (
    <motion.div variants={gridItem} className="text-center">
      <span className="text-3xl sm:text-4xl font-extrabold tabular-nums" style={{ color }}>
        {displayValue}{suffix}
      </span>
      <p className="mt-1 text-xs sm:text-sm text-white/40 font-medium">{label}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Logos + Trust Badges
// ─────────────────────────────────────────────────────────────────────────────

const INTEGRATIONS = [
  'Greenhouse', 'Lever', 'Workday', 'BambooHR', 'Slack', 'Teams', 'Zapier', 'Webhooks',
];

export function IntegrationsTrust() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={sectionFadeUp}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 ring-1 ring-green-500/20 text-green-400 text-xs font-semibold tracking-wider uppercase mb-4">
            Integrations
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            Works With Your Stack
          </h2>
          <p className="mt-4 text-lg text-white/50">
            Connect HireMatch to your existing ATS, collaboration tools, and workflows via native integrations or webhooks.
          </p>
        </motion.div>

        {/* Integration pills */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={staggerGrid}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {INTEGRATIONS.map((name) => (
            <IntegrationPill key={name} name={name} />
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ ...springSmooth, delay: 0.6 }}
          className="mt-14 flex flex-wrap justify-center gap-6 sm:gap-10"
        >
          {[
            { label: 'GDPR Compliant', icon: '🛡️' },
            { label: 'SOC 2 Type II', icon: '🔒' },
            { label: '99.9% Uptime', icon: '⚡' },
            { label: 'SSL Encrypted', icon: '🔐' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-white/40 text-sm">
              <span className="text-base">{badge.icon}</span>
              <span>{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function IntegrationPill({ name }: { name: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={gridItem}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={{
        y: hovered ? -3 : 0,
        boxShadow: hovered
          ? '0 8px 24px -4px rgba(99,102,241,0.3), 0 0 0 1px rgba(99,102,241,0.4)'
          : '0 0 0 1px rgba(255,255,255,0.08)',
      }}
      transition={springSnappy}
      className="px-5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-sm text-sm text-white/60 hover:text-white/80 cursor-default font-medium"
    >
      {name}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-Sided Value Prop — Candidates vs Recruiters
// ─────────────────────────────────────────────────────────────────────────────

export function TwoSidedValue() {
  const [activeTab, setActiveTab] = useState<'candidate' | 'recruiter'>('candidate');

  const sides = {
    candidate: {
      tagline: 'For Job Seekers',
      headline: 'Your Dream Job, Found by AI',
      desc: 'Upload your CV, take a 2-minute culture quiz, and let our AI match you to roles where you\'ll actually thrive. Always 100% free.',
      color: '#22c55e',
      features: [
        'AI parses your CV in 3 seconds',
        'Culture matchmaker quiz',
        'Match scores for every job',
        'Visa requirement alerts',
        'One-click applications',
        'AI resume coach',
      ],
      cta: 'Get Matched Free',
      href: '/auth?mode=signup&role=candidate',
    },
    recruiter: {
      tagline: 'For Recruiters',
      headline: 'Hire Smarter. Hire Globally.',
      desc: 'Post jobs, let AI rank your candidates, manage your pipeline, and hire across 29 countries with built-in visa compliance.',
      color: '#3b82f6',
      features: [
        'AI candidate ranking by match score',
        'AI job description writer',
        'Visa compliance for 29 countries',
        'Pipeline management (Kanban)',
        'ATS webhook integrations',
        'Team collaboration tools',
      ],
      cta: 'Start Hiring',
      href: '/auth?mode=signup&role=recruiter',
    },
  };

  const active = sides[activeTab];

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 60%, ${active.color}08 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={VP_ONCE}
          variants={sectionFadeUp}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            Built for Both Sides
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-white/50">
            Whether you&apos;re looking for your next role or your next hire — HireMatch has you covered.
          </p>

          {/* Toggle tabs */}
          <div className="mt-8 inline-flex rounded-xl bg-slate-100 dark:bg-white/[0.05] ring-1 ring-slate-200 dark:ring-white/[0.1] p-1">
            {(['candidate', 'recruiter'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'text-white' : 'text-slate-500 dark:text-white/50'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: sides[tab].color }}
                    transition={springSnappy}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'candidate' ? 'Job Seekers' : 'Recruiters'}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={springSnappy}
            className="mt-12 grid md:grid-cols-2 gap-8 items-center"
          >
            {/* Left — text */}
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-4"
                style={{ background: `${active.color}15`, color: active.color }}
              >
                {active.tagline}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
                {active.headline}
              </h3>
              <p className="mt-3 text-slate-500 dark:text-white/50 leading-relaxed">{active.desc}</p>

              <Link
                href={active.href}
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl font-semibold text-sm text-white shadow-lg transition-shadow"
                style={{
                  background: active.color,
                  boxShadow: `0 8px 24px -4px ${active.color}44`,
                }}
              >
                {active.cta}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            {/* Right — feature list */}
            <div className="space-y-3">
              {active.features.map((f, i) => (
                <motion.div
                  key={f}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springBouncy, delay: i * 0.06 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/[0.04] ring-1 ring-slate-200 dark:ring-white/[0.06]"
                >
                  <svg
                    className="w-5 h-5 shrink-0"
                    style={{ color: active.color }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm text-slate-600 dark:text-white/70">{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA Banner
// ─────────────────────────────────────────────────────────────────────────────

export function FinalCTA() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.1, margin: '0px 0px -40px 0px' }}
          transition={springBouncy}
          className="relative rounded-3xl overflow-hidden px-8 py-14 sm:px-14 sm:py-20 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.1) 40%, rgba(168,85,247,0.15) 100%)',
          }}
        >
          {/* Border glow */}
          <div className="absolute inset-0 rounded-3xl ring-1 ring-slate-200 dark:ring-white/[0.1] pointer-events-none" />

          {/* Floating orb */}
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const }}
          />

          <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white relative z-10" style={{ fontFamily: 'var(--font-bebas)' }}>
            Ready to Transform Your Hiring?
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-white/60 max-w-2xl mx-auto relative z-10">
            Join 500+ companies already using HireMatch to find, match, and hire top talent globally.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link
              href="/auth?mode=signup&role=recruiter"
              className="px-8 py-4 rounded-2xl font-semibold text-white text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
            >
              Start Hiring — Free
            </Link>
            <Link
              href="/auth?mode=signup&role=candidate"
              className="px-8 py-4 rounded-2xl font-semibold text-slate-600 dark:text-white/80 text-sm ring-1 ring-slate-200 dark:ring-white/15 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-all"
            >
              Find Your Match
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-400 dark:text-white/30 relative z-10">
            No credit card required &middot; Free plan available &middot; Setup in 2 minutes
          </p>
        </motion.div>
      </div>
    </section>
  );
}
