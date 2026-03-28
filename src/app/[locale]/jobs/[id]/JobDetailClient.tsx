'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useInView } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Job, Recruiter, MatchBreakdown } from '@/types';
import confetti from 'canvas-confetti';

/* ================================================================
   INDUSTRY THEMING — maps industry to accent colors
   ================================================================ */
const industryColors: Record<string, { accent: string; bg: string; border: string; ring: string; hex: string }> = {
  Technology:    { accent: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/50',    ring: 'ring-blue-500/30',    hex: '#3b82f6' },
  Finance:       { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/50', ring: 'ring-emerald-500/30', hex: '#10b981' },
  Healthcare:    { accent: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/50',     ring: 'ring-red-500/30',     hex: '#ef4444' },
  Education:     { accent: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/50',   ring: 'ring-amber-500/30',   hex: '#f59e0b' },
  Engineering:   { accent: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/50',  ring: 'ring-orange-500/30',  hex: '#f97316' },
  Marketing:     { accent: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/50',    ring: 'ring-pink-500/30',    hex: '#ec4899' },
  Design:        { accent: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/50',  ring: 'ring-purple-500/30',  hex: '#a855f7' },
  Sales:         { accent: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/50',    ring: 'ring-cyan-500/30',    hex: '#06b6d4' },
  Legal:         { accent: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/50',   ring: 'ring-slate-500/30',   hex: '#64748b' },
  default:       { accent: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/50',  ring: 'ring-indigo-500/30',  hex: '#6366f1' },
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
   FRAMER MOTION VARIANTS (WHB-clone)
   ================================================================ */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
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
   STAT CIRCLE — animated scale entrance (WHB clone)
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
   REQUIREMENT CARD — slides in from alternating sides (WHB PolicyCard clone)
   ================================================================ */
function RequirementCard({ text, index, variant = 'required', mobile }: {
  text: string;
  index: number;
  variant?: 'required' | 'nice';
  mobile?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const fromLeft = index % 2 === 0;
  const offset = mobile ? 16 : 24;

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
      className={`flex gap-3 items-start ${mobile ? 'p-3' : 'p-3.5'} rounded-lg ${colors}`}
    >
      {icon}
      <span className={`leading-relaxed text-white/75 ${mobile ? 'text-[13px]' : 'text-[14px]'}`}>{text}</span>
    </motion.div>
  );
}

/* ================================================================
   SKILL TAG — with match indicator
   ================================================================ */
function SkillTag({ skill, hasSkill, index }: {
  skill: string;
  hasSkill: boolean | null;
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
      className="block p-4 rounded-xl bg-[#0F172A] ring-1 ring-white/10 hover:bg-white/[0.06] hover:ring-white/20 transition-all group"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
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
   DETAIL APPLY BUTTON — WHB VoteButton "detail" variant wrapper
   ================================================================ */
function DetailApplyButton({ jobId, recruiterId, candidateId, theme }: {
  jobId: string;
  recruiterId: string;
  candidateId: string | null;
  theme: ReturnType<typeof getIndustryTheme>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Check existing application
  useEffect(() => {
    if (!candidateId) return;
    async function check() {
      const { data: app } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', candidateId!)
        .eq('job_id', jobId)
        .single();
      if (app) setApplied(true);
    }
    check();
  }, [candidateId, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = useCallback(async () => {
    if (!candidateId) {
      router.push('/auth?mode=signin');
      return;
    }

    setApplying(true);
    const { error } = await supabase
      .from('applications')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        recruiter_id: recruiterId,
        status: 'applied',
        status_history: [{ status: 'applied', changed_at: new Date().toISOString(), changed_by: candidateId }],
      });

    if (!error) {
      setApplied(true);
      setApplySuccess(true);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.7 },
        colors: [theme.hex, '#ffffff', '#6366f1'],
      });

      supabase.rpc('increment_applications', { job_id: jobId }).then(
        () => {},
        (err: unknown) => console.error('[job-apply] Failed to increment applications:', err)
      );
      setTimeout(() => setApplySuccess(false), 3000);
    }
    setApplying(false);
  }, [candidateId, jobId, recruiterId, router, supabase, theme.hex]);

  return (
    <motion.button
      onClick={handleApply}
      disabled={applied || applying}
      whileHover={!applied ? { scale: 1.015 } : undefined}
      whileTap={!applied ? { scale: 0.985 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`w-full py-4 lg:py-5 rounded-xl font-semibold text-lg lg:text-xl transition-all industry-glow ${
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
            key="applied"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="currentColor" viewBox="0 0 20 20">
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
  );
}

/* ================================================================
   SHARE MENU — LinkedIn, Email, Copy Link (WHB clone)
   ================================================================ */
function ShareMenu({ job, recruiter, locale }: { job: Job; recruiter: Recruiter; locale: string }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jobUrl = `https://www.hirematch.com/${locale}/jobs/${job.id}`;
  const shareBlurb = `${job.title} at ${recruiter.company_name} — ${job.industry} | ${job.work_mode}`;

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
  const emailSubject = `Check out this role: ${job.title} at ${recruiter.company_name}`;
  const emailBody = `I found this job listing on HireMatch and thought you'd be interested:\n\n${job.title} at ${recruiter.company_name}\n${job.industry} | ${job.work_mode} | ${job.city || 'Remote'}\n\n${jobUrl}`;
  const emailShareUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  const twitterShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareBlurb)}&url=${encodeURIComponent(jobUrl)}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(jobUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShareOpen(!shareOpen)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer industry-glow"
      >
        <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="text-[12px] font-medium text-white/45">Share</span>
      </button>

      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 right-0 mb-2 rounded-xl p-1.5 ring-1 ring-white/10 z-50"
            role="menu"
            aria-label="Share options"
            style={{ background: 'rgba(23,23,23,0.95)', backdropFilter: 'blur(20px)' }}
          >
            <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
              <span className="text-[12px] text-white/70">LinkedIn</span>
            </a>
            <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
              <span className="text-[12px] text-white/70">Post on X</span>
            </a>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <a href={emailShareUrl} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[12px] text-white/70">Email</span>
            </a>
            <div className="h-px bg-white/5 mx-2 my-1" />
            <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span className="text-[12px] text-white/70">{copied ? 'Copied!' : 'Copy link'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   MAIN CLIENT COMPONENT — WHB CANDIDATE DETAIL CLONE LAYOUT
   ================================================================ */
interface JobDetailClientProps {
  job: Job;
  recruiter: Recruiter;
  similarJobs: (Job & { recruiter?: Pick<Recruiter, 'company_name' | 'company_logo_url'> })[];
  locale: string;
}

export default function JobDetailClient({ job, recruiter, similarJobs, locale }: JobDetailClientProps) {
  const supabase = createClient();
  const theme = getIndustryTheme(recruiter.industry || job.industry);

  // Candidate state (for skill matching + apply)
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchBreakdown, setMatchBreakdown] = useState<MatchBreakdown | null>(null);

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

  // Computed values
  const [now] = useState(() => Date.now());
  const daysPosted = Math.max(1, Math.floor((now - new Date(job.created_at).getTime()) / 86400000));
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
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());

  // Match temperature background
  const tempBg = matchScore != null
    ? matchScore >= 80 ? 'from-green-900/20 via-transparent to-transparent'
      : matchScore >= 60 ? 'from-blue-900/20 via-transparent to-transparent'
      : matchScore >= 40 ? 'from-amber-900/15 via-transparent to-transparent'
      : 'from-red-900/10 via-transparent to-transparent'
    : '';

  // Suppress unused-var warnings for variants used in JSX
  void fadeUp;

  return (
    <div
      className="min-h-screen"
      style={{ '--industry-color': theme.hex, '--industry-glow': `${theme.hex}40` } as React.CSSProperties}
    >
      {/* Shimmer + glow CSS */}
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
        .industry-glow {
          transition: box-shadow 0.3s ease;
        }
        .industry-glow:hover {
          box-shadow: 0 0 20px var(--industry-glow), 0 0 40px color-mix(in srgb, var(--industry-color) 10%, transparent);
        }
      `}</style>

      {/* ================================================================
         MOBILE LAYOUT (lg:hidden) — WHB-clone vertical stack
         ================================================================ */}
      <div className="lg:hidden">
        {/* Hero — company logo + title + meta pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className={`relative pt-6 pb-8 px-5 bg-gradient-to-b ${tempBg || 'from-white/[0.02] via-transparent to-transparent'}`}
        >
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

          {/* Job title — shimmer */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-[26px] font-bold tracking-tight leading-tight title-shimmer"
          >
            {job.title}
          </motion.h1>

          {/* Meta pills row */}
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
            {salaryLabel && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
                {salaryLabel}
              </span>
            )}
            {job.visa_sponsorship && (
              <span className="px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[11px] font-semibold">
                Visa Sponsored
              </span>
            )}
            {expLabel && (
              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 text-[11px] font-semibold">
                {expLabel} experience
              </span>
            )}
            {job.city && (
              <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/60 text-[11px]">
                {job.city}, {job.country.toUpperCase()}
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Mobile body — stagger children */}
        <motion.div
          className="px-5 pb-8"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Stats row */}
          <motion.div variants={fadeOnly} className="flex items-center justify-around mb-6">
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

          {/* Match Score (if candidate) */}
          <AnimatePresence>
            {matchScore != null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="p-4 rounded-xl bg-[#0F172A] ring-1 ring-white/10">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-3 text-center">
                    Your Match Score
                  </p>
                  <div className="flex items-center justify-center gap-6">
                    <MatchScoreRing score={matchScore} label="Overall" size={90} />
                    {matchBreakdown && (
                      <>
                        <MatchScoreRing score={matchBreakdown.skills_score} label="Skills" size={64} />
                        <MatchScoreRing score={matchBreakdown.experience_score} label="Exp" size={64} />
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
                  <RequirementCard key={i} text={req} index={i} variant="required" mobile />
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
                  <RequirementCard key={i} text={nice} index={i} variant="nice" mobile />
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

          {/* Apply Button — full width, WHB VoteButton detail variant */}
          <motion.div variants={fadeOnly} className="mb-6">
            <DetailApplyButton
              jobId={job.id}
              recruiterId={job.recruiter_id}
              candidateId={candidateId}
              theme={theme}
            />
          </motion.div>

          {/* Share menu */}
          <motion.div variants={fadeOnly} className="mb-6">
            <ShareMenu job={job} recruiter={recruiter} locale={locale} />
          </motion.div>

          {/* Divider */}
          <motion.div variants={fadeOnly} className="h-px bg-white/5 my-5" />

          {/* Company info card (mobile) */}
          <motion.div
            variants={fadeOnly}
            className="p-5 rounded-xl bg-[#0F172A] ring-1 ring-white/10 mb-6"
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

          {/* Similar Jobs — mobile */}
          {similarJobs.length > 0 && (
            <motion.div variants={fadeOnly}>
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
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ================================================================
         DESKTOP LAYOUT (hidden lg:block) — WHB-clone: Left Sidebar + Right Content
         ================================================================ */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-8 items-start">

          {/* ── LEFT SIDEBAR (sticky, ~380px) ── */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-[380px] shrink-0 sticky top-6"
          >
            <div className="p-6 rounded-xl bg-[#0F172A] ring-1 ring-white/10 space-y-5">
              {/* Company logo (large) */}
              <div className="flex flex-col items-center text-center">
                {recruiter.company_logo_url ? (
                  <motion.img
                    src={recruiter.company_logo_url}
                    alt={recruiter.company_name}
                    className={`w-24 h-24 rounded-2xl object-cover ring-2 ${theme.ring}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  />
                ) : (
                  <motion.div
                    className={`w-24 h-24 rounded-2xl bg-white/[0.06] flex items-center justify-center text-4xl font-bold text-white/30 ring-2 ${theme.ring}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  >
                    {recruiter.company_name?.charAt(0)}
                  </motion.div>
                )}

                {/* Company name + industry badge */}
                <h2 className="text-lg font-semibold text-white mt-3">{recruiter.company_name}</h2>
                <span className={`mt-1.5 px-3 py-0.5 rounded-full ${theme.bg} border ${theme.border} ${theme.accent} text-[11px] font-bold uppercase tracking-wide`}>
                  {recruiter.industry || job.industry}
                </span>
              </div>

              {/* About Company quick facts */}
              <div>
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-3">About Company</p>
                {recruiter.bio && (
                  <p className="text-[13px] text-white/60 leading-relaxed mb-4">{recruiter.bio}</p>
                )}
                <div className="space-y-2.5 text-sm">
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
                  {recruiter.industry && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Industry</span>
                      <span className={theme.accent}>{recruiter.industry}</span>
                    </div>
                  )}
                  {recruiter.company_website && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Website</span>
                      <a href={recruiter.company_website} target="_blank" rel="noopener noreferrer" className={`${theme.accent} hover:underline`}>
                        {recruiter.company_website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Culture tags (purple pills) */}
              {recruiter.culture_tags && recruiter.culture_tags.length > 0 && (
                <div className="pt-4 border-t border-white/[0.06]">
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

              {/* Job metadata */}
              <div className="pt-4 border-t border-white/[0.06] space-y-1.5 text-[12px]">
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
                <div className="flex justify-between">
                  <span className="text-white/40">Applications</span>
                  <span className="text-white/60">{job.applications_count.toLocaleString()}</span>
                </div>
              </div>

              {/* Contact Recruiter button (placeholder) */}
              <button className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-sm font-medium text-white/50 cursor-pointer industry-glow">
                Contact Recruiter
              </button>
            </div>
          </motion.aside>

          {/* ── RIGHT CONTENT (flex-1) ── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Job title (h1, large bold white) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-[36px] font-bold tracking-tight leading-tight title-shimmer mb-4">
                {job.title}
              </h1>

              {/* Meta pills row */}
              <div className="flex flex-wrap gap-2.5">
                {job.city && (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-[12px] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.city}, {job.country.toUpperCase()}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full ${wmBadge.bg} ${wmBadge.text} text-[12px] font-semibold`}>
                  {wmBadge.label}
                </span>
                <span className={`px-3 py-1 rounded-full ${jtBadge.bg} ${jtBadge.text} text-[12px] font-semibold`}>
                  {jtBadge.label}
                </span>
                {salaryLabel && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[12px] font-semibold">
                    {salaryLabel}
                  </span>
                )}
                {job.visa_sponsorship && (
                  <span className="px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-[12px] font-semibold">
                    Visa Sponsored
                  </span>
                )}
                {expLabel && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-[12px] font-semibold">
                    {expLabel} experience
                  </span>
                )}
                {job.education_level && (
                  <span className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-[12px]">
                    {job.education_level}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`flex items-center justify-center gap-12 p-6 rounded-xl bg-[#0F172A] ring-1 ${theme.ring}`}
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

            {/* Match Score (if candidate) */}
            <AnimatePresence>
              {matchScore != null && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-6 rounded-xl bg-[#0F172A] ring-1 ring-white/10"
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

            {/* About This Role — bio card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 rounded-xl bg-[#0F172A] ring-1 ring-white/10"
            >
              <h2 className="text-lg font-semibold text-white mb-4">About This Role</h2>
              <div className={`text-[15px] leading-relaxed text-white/70 whitespace-pre-wrap border-l-2 ${theme.border} pl-5`}>
                {job.description}
              </div>
            </motion.div>

            {/* Requirements card — items with checkmark icons, blue left border */}
            {job.requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A] ring-1 ring-white/10"
              >
                <h2 className="text-lg font-semibold text-white mb-5">Requirements</h2>
                <div className="space-y-2.5">
                  {job.requirements.map((req, i) => (
                    <RequirementCard key={i} text={req} index={i} variant="required" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Nice to Have card — green left border */}
            {job.nice_to_haves.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A] ring-1 ring-white/10"
              >
                <h2 className="text-lg font-semibold text-white mb-5">Nice to Have</h2>
                <div className="space-y-2.5">
                  {job.nice_to_haves.map((nice, i) => (
                    <RequirementCard key={i} text={nice} index={i} variant="nice" />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Required Skills tags section */}
            {job.skills_required.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="p-8 rounded-xl bg-[#0F172A] ring-1 ring-white/10"
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

            {/* Apply Now button — full-width, gradient, WHB vote button detail variant */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <DetailApplyButton
                jobId={job.id}
                recruiterId={job.recruiter_id}
                candidateId={candidateId}
                theme={theme}
              />
            </motion.div>

            {/* Share menu */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <ShareMenu job={job} recruiter={recruiter} locale={locale} />
            </motion.div>

            {/* Related Jobs grid (4 cards) */}
            {similarJobs.length > 0 && (
              <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-lg font-semibold text-white mb-5">Similar Jobs</h2>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
                  variants={{ ...stagger, show: { ...stagger.show, transition: { staggerChildren: 0.05 } } }}
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
        </div>
      </div>
    </div>
  );
}
