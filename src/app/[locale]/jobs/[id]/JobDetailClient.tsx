'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Job, Recruiter, Candidate, MatchBreakdown } from '@/types';
import confetti from 'canvas-confetti';

/* ================================================================
   INDUSTRY THEMING — maps industry to accent colors
   ================================================================ */
const industryColors: Record<string, { accent: string; bg: string; border: string; ring: string; hex: string }> = {
  Technology:    { accent: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/50',   ring: 'ring-blue-500/30',   hex: '#3b82f6' },
  Finance:       { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', ring: 'ring-emerald-500/30', hex: '#10b981' },
  Healthcare:    { accent: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/50',    ring: 'ring-red-500/30',    hex: '#ef4444' },
  Education:     { accent: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/50',  ring: 'ring-amber-500/30',  hex: '#f59e0b' },
  Engineering:   { accent: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/50', ring: 'ring-orange-500/30', hex: '#f97316' },
  Marketing:     { accent: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/50',   ring: 'ring-pink-500/30',   hex: '#ec4899' },
  Design:        { accent: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50', ring: 'ring-purple-500/30', hex: '#a855f7' },
  Sales:         { accent: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/50',   ring: 'ring-cyan-500/30',   hex: '#06b6d4' },
  Legal:         { accent: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/50',  ring: 'ring-slate-500/30',  hex: '#64748b' },
  default:       { accent: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/50', ring: 'ring-indigo-500/30', hex: '#6366f1' },
};

function getIndustryTheme(industry: string) {
  return industryColors[industry] || industryColors.default;
}

/* ================================================================
   WORK MODE / JOB TYPE badges
   ================================================================ */
const workModeBadge: Record<string, { bg: string; text: string; label: string }> = {
  remote:  { bg: 'bg-green-500/15', text: 'text-green-400', label: 'Remote' },
  hybrid:  { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Hybrid' },
  onsite:  { bg: 'bg-blue-500/15',  text: 'text-blue-400',  label: 'On-site' },
};

const jobTypeBadge: Record<string, { bg: string; text: string; label: string }> = {
  'full-time':  { bg: 'bg-indigo-500/15', text: 'text-indigo-400', label: 'Full-time' },
  'part-time':  { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Part-time' },
  contract:     { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Contract' },
  freelance:    { bg: 'bg-teal-500/15',   text: 'text-teal-400',   label: 'Freelance' },
  internship:   { bg: 'bg-pink-500/15',   text: 'text-pink-400',   label: 'Internship' },
};

/* ================================================================
   FRAMER MOTION VARIANTS
   ================================================================ */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.7 },
  show: { opacity: 1, scale: 1 },
};

/* ================================================================
   ANIMATED NUMBER — spring-based count-up
   ================================================================ */
function AnimatedNumber({ value, prefix = '', suffix = '', className }: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) spring.set(safeValue);
  }, [isInView, safeValue, spring]);

  useEffect(() => {
    const unsub = spring.on('change', (v: number) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return <span ref={ref} className={className}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

/* ================================================================
   STAT CIRCLE — animated scale entrance
   ================================================================ */
function StatCircle({ label, children, delay = 0 }: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120, damping: 14 }}
      className="flex flex-col items-center"
    >
      <div className="h-[72px] w-[72px] rounded-full border-2 border-white/20 flex items-center justify-center bg-white/[0.03] backdrop-blur-sm">
        {children}
      </div>
      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider mt-1.5">
        {label}
      </span>
    </motion.div>
  );
}

/* ================================================================
   REQUIREMENT CARD — slides in from alternating sides
   ================================================================ */
function RequirementCard({ text, index, variant = 'required' }: {
  text: string;
  index: number;
  variant?: 'required' | 'nice';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const fromLeft = index % 2 === 0;
  const offset = 24;

  const colors = variant === 'required'
    ? 'bg-white/[0.04] border-l-2 border-l-blue-500/60 border border-white/[0.06]'
    : 'bg-white/[0.02] border-l-2 border-l-green-500/40 border border-white/[0.04]';

  const icon = variant === 'required' ? (
    <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-green-400/60 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: fromLeft ? -offset : offset }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: fromLeft ? -offset : offset }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
      className={`flex gap-3 items-start p-3.5 rounded-lg ${colors}`}
    >
      {icon}
      <span className="text-[14px] leading-relaxed text-white/75">{text}</span>
    </motion.div>
  );
}

/* ================================================================
   SKILL TAG — with match indicator
   ================================================================ */
function SkillTag({ skill, hasSkill, index }: {
  skill: string;
  hasSkill: boolean | null; // null = not logged in as candidate
  index: number;
}) {
  return (
    <motion.span
      variants={scaleIn}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 200, damping: 15 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
        hasSkill === true
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : hasSkill === false
          ? 'bg-white/[0.03] border-white/[0.08] text-white/50'
          : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      }`}
    >
      {hasSkill === true && (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {hasSkill === false && (
        <span className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block" />
      )}
      {skill}
    </motion.span>
  );
}

/* ================================================================
   MATCH SCORE RING — animated SVG ring
   ================================================================ */
function MatchScoreRing({ score, label, size = 80 }: {
  score: number;
  label: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const spring = useSpring(circumference, { stiffness: 40, damping: 20 });
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    if (isInView) {
      spring.set(circumference - (score / 100) * circumference);
    }
  }, [isInView, score, circumference, spring]);

  useEffect(() => {
    const unsub = spring.on('change', (v: number) => setOffset(v));
    return unsub;
  }, [spring]);

  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x={size / 2} y={size / 2}
          textAnchor="middle" dominantBaseline="central"
          className="rotate-90 origin-center"
          fill={color} fontSize={size * 0.22} fontWeight="bold"
        >
          {score}%
        </text>
      </svg>
      <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}

/* ================================================================
   SIMILAR JOB CARD — compact card for grid
   ================================================================ */
function SimilarJobCard({ job, locale }: { job: Job & { recruiter?: Pick<Recruiter, 'company_name' | 'company_logo_url'> }; locale: string }) {
  const theme = getIndustryTheme(job.industry);
  return (
    <motion.a
      href={`/${locale}/jobs/${job.id}`}
      variants={fadeUp}
      className="block p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
    >
      <div className="flex items-start gap-3">
        {job.recruiter?.company_logo_url ? (
          <img src={job.recruiter.company_logo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-white/30 shrink-0">
            {job.recruiter?.company_name?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-white/90">{job.title}</h4>
          <p className="text-xs text-white/50 truncate">{job.recruiter?.company_name}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${theme.bg} ${theme.accent}`}>
          {job.industry}
        </span>
        {job.city && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/50">
            {job.city}
          </span>
        )}
      </div>
    </motion.a>
  );
}

/* ================================================================
   MAIN CLIENT COMPONENT
   ================================================================ */
interface JobDetailClientProps {
  job: Job;
  recruiter: Recruiter;
  similarJobs: (Job & { recruiter?: Pick<Recruiter, 'company_name' | 'company_logo_url'> })[];
  locale: string;
}

export default function JobDetailClient({ job, recruiter, similarJobs, locale }: JobDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const theme = getIndustryTheme(recruiter.industry || job.industry);

  // Candidate state (for match score + apply)
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchBreakdown, setMatchBreakdown] = useState<MatchBreakdown | null>(null);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Check if user is a logged-in candidate
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cand } = await supabase
        .from('candidates')
        .select('id, skills')
        .eq('user_id', user.id)
        .single();

      if (cand) {
        setCandidateId(cand.id);
        setCandidateSkills(cand.skills || []);

        // Check existing application
        const { data: app } = await supabase
          .from('applications')
          .select('id, match_score, match_explanation')
          .eq('candidate_id', cand.id)
          .eq('job_id', job.id)
          .single();

        if (app) {
          setApplied(true);
          if (app.match_score) setMatchScore(app.match_score);
        }

        // Check for existing match
        const { data: match } = await supabase
          .from('matches')
          .select('score, breakdown')
          .eq('candidate_id', cand.id)
          .eq('job_id', job.id)
          .single();

        if (match) {
          setMatchScore(match.score);
          setMatchBreakdown(match.breakdown as MatchBreakdown);
        }
      }
    }
    check();
  }, [job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply handler with confetti
  const handleApply = useCallback(async () => {
    if (!candidateId) {
      router.push(`/${locale}/auth?mode=signin`);
      return;
    }

    setApplying(true);
    const { error } = await supabase
      .from('applications')
      .insert({
        candidate_id: candidateId,
        job_id: job.id,
        recruiter_id: job.recruiter_id,
        status: 'applied',
        status_history: [{ status: 'applied', changed_at: new Date().toISOString(), changed_by: candidateId }],
      });

    if (!error) {
      setApplied(true);
      setApplySuccess(true);

      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
        colors: [theme.hex, '#ffffff', '#6366f1'],
      });

      // Increment application count (fire-and-forget)
      supabase.rpc('increment_applications', { job_id: job.id }).then(() => {}, () => {});

      setTimeout(() => setApplySuccess(false), 3000);
    }
    setApplying(false);
  }, [candidateId, job.id, job.recruiter_id, locale, router, supabase, theme.hex]);

  // Computed values
  const daysPosted = Math.max(1, Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000));
  const formatSalary = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toString();
  };
  const salaryLabel = job.salary_min || job.salary_max
    ? `${job.salary_currency || 'USD'} ${job.salary_min ? formatSalary(job.salary_min) : '?'}-${job.salary_max ? formatSalary(job.salary_max) : '?'}`
    : null;
  const expLabel = job.experience_min != null
    ? `${job.experience_min}${job.experience_max ? `-${job.experience_max}` : '+'} yr`
    : null;
  const wmBadge = workModeBadge[job.work_mode] || workModeBadge.onsite;
  const jtBadge = jobTypeBadge[job.job_type] || jobTypeBadge['full-time'];

  // Match temperature background
  const tempBg = matchScore != null
    ? matchScore >= 80 ? 'from-green-900/20 via-transparent to-transparent'
      : matchScore >= 60 ? 'from-blue-900/20 via-transparent to-transparent'
      : matchScore >= 40 ? 'from-amber-900/15 via-transparent to-transparent'
      : 'from-red-900/10 via-transparent to-transparent'
    : '';

  // Hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start end', 'end start'] });
  const heroY = useTransform(heroScroll, [0, 1], ['-3%', '3%']);

  // Skill matching
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());

  return (
    <div
      className="min-h-screen"
      style={{ '--industry-color': theme.hex, '--industry-glow': `${theme.hex}40` } as React.CSSProperties}
    >
      {/* Shimmer animation */}
      <style>{`
        @keyframes title-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .title-shimmer {
          background: linear-gradient(90deg, #fff 0%, #fff 40%, var(--industry-color) 50%, #fff 60%, #fff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: title-shimmer 4s ease-in-out infinite;
        }
        .industry-glow:hover {
          box-shadow: 0 0 20px var(--industry-glow), 0 0 40px color-mix(in srgb, var(--industry-color) 10%, transparent);
        }
      `}</style>

      {/* ====== MOBILE LAYOUT ====== */}
      <div className="lg:hidden">
        {/* Hero section with company logo */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={`relative pt-6 pb-8 px-5 bg-gradient-to-b ${tempBg || 'from-white/[0.02] via-transparent to-transparent'}`}
        >
          <motion.div style={{ y: heroY }} className="relative z-10">
            {/* Company logo + industry badge */}
            <div className="flex items-start gap-4 mb-4">
              {recruiter.company_logo_url ? (
                <motion.img
                  src={recruiter.company_logo_url}
                  alt={recruiter.company_name}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                />
              ) : (
                <motion.div
                  className="w-16 h-16 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl font-bold text-white/30 ring-2 ring-white/10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {recruiter.company_name?.charAt(0)}
                </motion.div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/60 truncate">{recruiter.company_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full ${theme.bg} border ${theme.border} ${theme.accent} text-[10px] font-bold uppercase tracking-wide`}>
                    {recruiter.industry || job.industry}
                  </span>
                  {recruiter.company_size && (
                    <span className="text-[11px] text-white/40">{recruiter.company_size} employees</span>
                  )}
                </div>
              </div>
            </div>

            {/* Job title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-[26px] font-bold tracking-tight leading-tight title-shimmer"
            >
              {job.title}
            </motion.h1>

            {/* Quick facts badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap gap-2 mt-3"
            >
              <span className={`px-2.5 py-1 rounded-full ${wmBadge.bg} ${wmBadge.text} text-[11px] font-semibold`}>
                {wmBadge.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full ${jtBadge.bg} ${jtBadge.text} text-[11px] font-semibold`}>
                {jtBadge.label}
              </span>
              {job.visa_sponsorship && (
                <span className="px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[11px] font-semibold">
                  Visa Sponsored
                </span>
              )}
              {job.city && (
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/60 text-[11px]">
                  {job.city}, {job.country.toUpperCase()}
                </span>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="px-5 pb-6"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeOnly} className="flex items-center justify-around mb-6">
            {salaryLabel && (
              <StatCircle label="Salary" delay={0}>
                <span className="text-[13px] font-bold text-emerald-400 text-center leading-tight">{salaryLabel}</span>
              </StatCircle>
            )}
            {expLabel && (
              <StatCircle label="Experience" delay={0.1}>
                <AnimatedNumber
                  value={job.experience_min || 0}
                  suffix={job.experience_max ? `-${job.experience_max} yr` : '+ yr'}
                  className="text-sm font-bold text-blue-400"
                />
              </StatCircle>
            )}
            <StatCircle label="Applications" delay={0.2}>
              <AnimatedNumber value={job.applications_count} className="text-sm font-bold text-purple-400" />
            </StatCircle>
            <StatCircle label="Days Active" delay={0.3}>
              <AnimatedNumber value={daysPosted} className="text-sm font-bold text-amber-400" />
            </StatCircle>
          </motion.div>

          {/* Match Score (if candidate) */}
          <AnimatePresence>
            {matchScore != null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-3 text-center">
                    Your Match Score
                  </p>
                  <div className="flex items-center justify-center gap-6">
                    <MatchScoreRing score={matchScore} label="Overall" size={90} />
                    {matchBreakdown && (
                      <>
                        <MatchScoreRing score={matchBreakdown.skills_score} label="Skills" size={64} />
                        <MatchScoreRing score={matchBreakdown.experience_score} label="Experience" size={64} />
                        <MatchScoreRing score={matchBreakdown.culture_score} label="Culture" size={64} />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description */}
          <motion.div variants={fadeOnly} className="mb-5">
            <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-2">About This Role</p>
            <div className={`text-[14px] leading-relaxed text-white/70 whitespace-pre-wrap border-l-2 ${theme.border} pl-4`}>
              {job.description}
            </div>
          </motion.div>

          {/* Requirements — slide-in cards */}
          {job.requirements.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-5">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Requirements</p>
              <div className="space-y-2">
                {job.requirements.map((req, i) => (
                  <RequirementCard key={i} text={req} index={i} variant="required" />
                ))}
              </div>
            </motion.div>
          )}

          {/* Nice-to-Haves */}
          {job.nice_to_haves.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-5">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Nice to Have</p>
              <div className="space-y-2">
                {job.nice_to_haves.map((nice, i) => (
                  <RequirementCard key={i} text={nice} index={i} variant="nice" />
                ))}
              </div>
            </motion.div>
          )}

          {/* Skills Required */}
          {job.skills_required.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Required Skills</p>
              <motion.div
                className="flex flex-wrap gap-2"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-30px' }}
              >
                {job.skills_required.map((skill, i) => (
                  <SkillTag
                    key={skill}
                    skill={skill}
                    hasSkill={candidateId ? candidateSkillsLower.includes(skill.toLowerCase()) : null}
                    index={i}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Apply Button — full width, spring bounce */}
          <motion.div variants={fadeOnly} className="mb-6">
            <motion.button
              onClick={handleApply}
              disabled={applied || applying}
              whileHover={!applied ? { scale: 1.02 } : undefined}
              whileTap={!applied ? { scale: 0.97 } : undefined}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all industry-glow ${
                applied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                  : applying
                  ? 'bg-white/10 text-white/50 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer'
              }`}
            >
              <AnimatePresence mode="wait">
                {applied ? (
                  <motion.span
                    key="applied"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {applySuccess ? 'Application Sent!' : 'Applied'}
                  </motion.span>
                ) : applying ? (
                  <motion.span key="applying" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    Applying...
                  </motion.span>
                ) : (
                  <motion.span key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {candidateId ? 'Apply Now' : 'Sign In to Apply'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>

          {/* Company info card (mobile) */}
          <motion.div
            variants={fadeOnly}
            className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6"
          >
            <h3 className="text-sm font-semibold text-white mb-3">About {recruiter.company_name}</h3>
            {recruiter.bio && (
              <p className="text-[13px] text-white/60 leading-relaxed mb-4">{recruiter.bio}</p>
            )}
            <div className="space-y-2.5 text-sm">
              {recruiter.industry && (
                <div className="flex justify-between">
                  <span className="text-white/40">Industry</span>
                  <span className={theme.accent}>{recruiter.industry}</span>
                </div>
              )}
              {recruiter.company_size && (
                <div className="flex justify-between">
                  <span className="text-white/40">Size</span>
                  <span className="text-white/80">{recruiter.company_size} employees</span>
                </div>
              )}
              {(recruiter.city || recruiter.country) && (
                <div className="flex justify-between">
                  <span className="text-white/40">Location</span>
                  <span className="text-white/80">{recruiter.city ? `${recruiter.city}, ` : ''}{recruiter.country?.toUpperCase()}</span>
                </div>
              )}
              {recruiter.company_website && (
                <div className="flex justify-between">
                  <span className="text-white/40">Website</span>
                  <a href={recruiter.company_website} target="_blank" rel="noopener noreferrer" className={`${theme.accent} hover:underline`}>
                    Visit
                  </a>
                </div>
              )}
            </div>
            {recruiter.culture_tags && recruiter.culture_tags.length > 0 && (
              <div className="mt-4">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Culture</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {recruiter.culture_tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-[11px] font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ====== DESKTOP LAYOUT ====== */}
      <div className="hidden lg:block max-w-6xl mx-auto px-6 py-10">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative rounded-2xl p-8 bg-[#0F172A]/80 backdrop-blur-sm ring-1 ${theme.ring} overflow-hidden`}
        >
          {/* Temperature gradient overlay */}
          {tempBg && <div className={`absolute inset-0 bg-gradient-to-br ${tempBg} pointer-events-none`} />}

          <div className="relative z-10 flex items-start gap-6">
            {/* Company logo */}
            {recruiter.company_logo_url ? (
              <motion.img
                src={recruiter.company_logo_url}
                alt={recruiter.company_name}
                className={`w-20 h-20 rounded-xl object-cover ring-2 ${theme.ring}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              />
            ) : (
              <motion.div
                className={`w-20 h-20 rounded-xl bg-white/[0.06] flex items-center justify-center text-3xl font-bold text-white/30 ring-2 ${theme.ring}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                {recruiter.company_name?.charAt(0)}
              </motion.div>
            )}

            <div className="flex-1 min-w-0">
              {/* Company name + industry badge */}
              <div className="flex items-center gap-3 mb-1">
                <p className="text-lg text-white/60">{recruiter.company_name}</p>
                <span className={`px-3 py-0.5 rounded-full ${theme.bg} border ${theme.border} ${theme.accent} text-[11px] font-bold uppercase tracking-wide`}>
                  {recruiter.industry || job.industry}
                </span>
                {recruiter.company_size && (
                  <span className="text-[12px] text-white/30">{recruiter.company_size} employees</span>
                )}
              </div>

              {/* Job title — shimmer */}
              <h1 className="text-[36px] font-bold tracking-tight leading-tight title-shimmer mb-3">
                {job.title}
              </h1>

              {/* Quick facts */}
              <div className="flex flex-wrap gap-2.5">
                <span className={`px-3 py-1 rounded-full ${wmBadge.bg} ${wmBadge.text} text-[12px] font-semibold`}>
                  {wmBadge.label}
                </span>
                <span className={`px-3 py-1 rounded-full ${jtBadge.bg} ${jtBadge.text} text-[12px] font-semibold`}>
                  {jtBadge.label}
                </span>
                {job.visa_sponsorship && (
                  <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-[12px] font-semibold">
                    Visa Sponsored
                  </span>
                )}
                {job.city && (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-[12px]">
                    {job.city}, {job.country.toUpperCase()}
                  </span>
                )}
                {job.education_level && (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-[12px]">
                    {job.education_level}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <motion.div
            className="relative z-10 flex items-center justify-center gap-12 mt-8 pt-6 border-t border-white/[0.06]"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {salaryLabel && (
              <StatCircle label="Salary" delay={0}>
                <span className="text-[13px] font-bold text-emerald-400 text-center leading-tight">{salaryLabel}</span>
              </StatCircle>
            )}
            {expLabel && (
              <StatCircle label="Experience" delay={0.1}>
                <span className="text-sm font-bold text-blue-400">{expLabel}</span>
              </StatCircle>
            )}
            <StatCircle label="Applications" delay={0.2}>
              <AnimatedNumber value={job.applications_count} className="text-sm font-bold text-purple-400" />
            </StatCircle>
            <StatCircle label="Days Active" delay={0.3}>
              <AnimatedNumber value={daysPosted} className="text-sm font-bold text-amber-400" />
            </StatCircle>
          </motion.div>
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          {/* Left column — 2/3 */}
          <div className="col-span-2 space-y-6">
            {/* Match Score (if candidate) */}
            <AnimatePresence>
              {matchScore != null && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10"
                >
                  <p className="text-[11px] uppercase font-bold text-white/50 tracking-wider mb-4">Your Match Score</p>
                  <div className="flex items-center gap-8">
                    <MatchScoreRing score={matchScore} label="Overall" size={100} />
                    {matchBreakdown && (
                      <>
                        <MatchScoreRing score={matchBreakdown.skills_score} label="Skills" size={72} />
                        <MatchScoreRing score={matchBreakdown.experience_score} label="Experience" size={72} />
                        <MatchScoreRing score={matchBreakdown.culture_score} label="Culture" size={72} />
                        <MatchScoreRing score={matchBreakdown.location_score} label="Location" size={72} />
                        <MatchScoreRing score={matchBreakdown.salary_score} label="Salary" size={72} />
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10"
            >
              <h2 className="text-lg font-semibold text-white mb-4">About This Role</h2>
              <div className={`text-[15px] leading-relaxed text-white/70 whitespace-pre-wrap border-l-2 ${theme.border} pl-5`}>
                {job.description}
              </div>
            </motion.div>

            {/* Requirements — slide-in cards */}
            {job.requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10"
              >
                <h2 className="text-lg font-semibold text-white mb-5">Requirements</h2>
                <div className="space-y-2.5">
                  {job.requirements.map((req, i) => (
                    <RequirementCard key={i} text={req} index={i} variant="required" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Nice-to-Haves */}
            {job.nice_to_haves.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10"
              >
                <h2 className="text-lg font-semibold text-white mb-5">Nice to Have</h2>
                <div className="space-y-2.5">
                  {job.nice_to_haves.map((nice, i) => (
                    <RequirementCard key={i} text={nice} index={i} variant="nice" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Skills Required */}
            {job.skills_required.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10"
              >
                <h2 className="text-lg font-semibold text-white mb-5">Required Skills</h2>
                {candidateId && (
                  <p className="text-[12px] text-white/40 mb-4">
                    Green = you have this skill. Gray = not on your profile.
                  </p>
                )}
                <motion.div
                  className="flex flex-wrap gap-2.5"
                  variants={stagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-30px' }}
                >
                  {job.skills_required.map((skill, i) => (
                    <SkillTag
                      key={skill}
                      skill={skill}
                      hasSkill={candidateId ? candidateSkillsLower.includes(skill.toLowerCase()) : null}
                      index={i}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Apply Button — full width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <motion.button
                onClick={handleApply}
                disabled={applied || applying}
                whileHover={!applied ? { scale: 1.015 } : undefined}
                whileTap={!applied ? { scale: 0.985 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className={`w-full py-5 rounded-xl font-semibold text-xl transition-all industry-glow ${
                  applied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                    : applying
                    ? 'bg-white/10 text-white/50 cursor-wait'
                    : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-indigo-500/25 cursor-pointer'
                }`}
              >
                <AnimatePresence mode="wait">
                  {applied ? (
                    <motion.span
                      key="applied-d"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {applySuccess ? 'Application Sent!' : 'Applied'}
                    </motion.span>
                  ) : applying ? (
                    <motion.span key="applying-d" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      Applying...
                    </motion.span>
                  ) : (
                    <motion.span key="apply-d" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {candidateId ? 'Apply Now' : 'Sign In to Apply'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-6">
            {/* Company info card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-xl bg-[#0F172A]/80 ring-1 ring-white/10 sticky top-6"
            >
              <h3 className="font-semibold text-white mb-3">About {recruiter.company_name}</h3>
              {recruiter.bio && (
                <p className="text-[13px] text-white/60 leading-relaxed mb-4">{recruiter.bio}</p>
              )}
              <div className="space-y-2.5 text-sm">
                {recruiter.industry && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Industry</span>
                    <span className={theme.accent}>{recruiter.industry}</span>
                  </div>
                )}
                {recruiter.company_size && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Size</span>
                    <span className="text-white/80">{recruiter.company_size} employees</span>
                  </div>
                )}
                {(recruiter.city || recruiter.country) && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Location</span>
                    <span className="text-white/80">{recruiter.city ? `${recruiter.city}, ` : ''}{recruiter.country?.toUpperCase()}</span>
                  </div>
                )}
                {recruiter.company_website && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Website</span>
                    <a href={recruiter.company_website} target="_blank" rel="noopener noreferrer" className={`${theme.accent} hover:underline`}>
                      Visit
                    </a>
                  </div>
                )}
              </div>

              {/* Culture tags */}
              {recruiter.culture_tags && recruiter.culture_tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Culture</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recruiter.culture_tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-[11px] font-medium rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job posted date + expiry */}
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-1.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-white/40">Posted</span>
                  <span className="text-white/60">{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                {job.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Expires</span>
                    <span className="text-white/60">{new Date(job.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Views</span>
                  <span className="text-white/60">{job.views_count.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Similar Jobs — 4-card grid */}
        {similarJobs.length > 0 && (
          <motion.div
            className="mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-lg font-semibold text-white mb-5">Similar Jobs</h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {similarJobs.map((sj) => (
                <SimilarJobCard key={sj.id} job={sj} locale={locale} />
              ))}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Similar Jobs — mobile (after mobile layout) */}
      {similarJobs.length > 0 && (
        <div className="lg:hidden px-5 pb-8">
          <h2 className="text-base font-semibold text-white mb-4">Similar Jobs</h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {similarJobs.map((sj) => (
              <SimilarJobCard key={sj.id} job={sj} locale={locale} />
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
