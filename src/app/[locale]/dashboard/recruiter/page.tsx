'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import type { Recruiter, Job } from '@/types';
import confetti from 'canvas-confetti';

/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return count;
}

/* ─── Animation variants ─── */
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };
const statVariants = { hidden: { opacity: 0, scale: 0.85, y: 16 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 22 } } };
const listItemVariants = { hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };

/* Phase-based section reveal — each major section enters in sequence */
const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
};

/* ─── Dashboard loading steps ─── */
const DASHBOARD_LOADING_STEPS = [
  { text: 'Connecting to your dashboard...', icon: '🔗' },
  { text: 'Loading your jobs...', icon: '📋' },
  { text: 'Calculating performance...', icon: '📊' },
  { text: 'Ready!', icon: '✨' },
];

const PROCESSING_STEPS = [
  'Analyzing your job requirements...',
  'Scanning candidate profiles...',
  'Scoring skill & tag alignment...',
  'Evaluating culture fit with AI...',
  'Ranking top matches...',
];

/* ─── Types ─── */
interface MatchedCandidate {
  score: number;
  skills_match: number;
  experience_match: number;
  culture_match: number;
  highlights: string[];
  concerns: string[];
  why: string;
  candidate: {
    id: string;
    full_name: string;
    headline: string;
    photo_url: string | null;
    skills: string[];
    experience_years: number;
    country: string;
    city: string;
    remote_preference: string;
    visa_status: string;
    available_now: boolean;
    languages: string[];
  };
}

/* ─── Tier themes ─── */
const tierThemes: Record<string, { badge: string; glow: string; gradient: string; accent: string }> = {
  free: { badge: 'bg-white/5 text-white/60', glow: '', gradient: 'from-white/5 to-transparent', accent: 'text-white/60' },
  pro: { badge: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30', glow: 'shadow-blue-500/10', gradient: 'from-blue-600/8 via-transparent to-indigo-600/5', accent: 'text-blue-400' },
  enterprise: { badge: 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30', glow: 'shadow-purple-500/10', gradient: 'from-purple-600/8 via-transparent to-pink-600/5', accent: 'text-purple-400' },
  agency: { badge: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30', glow: 'shadow-amber-500/10', gradient: 'from-amber-600/8 via-transparent to-orange-600/5', accent: 'text-amber-400' },
};

/* ─── Stat Card with temperature backgrounds + shimmer ─── */
function StatCard({ value, label, color, intensity = 0.5 }: { value: number; label: string; color: string; intensity?: number }) {
  const animatedValue = useCountUp(value);
  const [isHovered, setIsHovered] = useState(false);

  // Temperature: higher intensity = warmer glow
  const colorMap: Record<string, { text: string; gradLow: string; gradHigh: string; glow: string; shimmer: string }> = {
    blue: {
      text: 'text-blue-400',
      gradLow: 'from-blue-500/8 to-cyan-600/5',
      gradHigh: 'from-blue-500/20 to-cyan-500/12',
      glow: 'shadow-blue-500/20',
      shimmer: 'from-transparent via-blue-400/10 to-transparent',
    },
    purple: {
      text: 'text-purple-400',
      gradLow: 'from-purple-500/8 to-indigo-600/5',
      gradHigh: 'from-purple-500/20 to-pink-500/12',
      glow: 'shadow-purple-500/20',
      shimmer: 'from-transparent via-purple-400/10 to-transparent',
    },
    green: {
      text: 'text-emerald-400',
      gradLow: 'from-emerald-500/8 to-green-600/5',
      gradHigh: 'from-emerald-500/20 to-teal-500/12',
      glow: 'shadow-emerald-500/20',
      shimmer: 'from-transparent via-emerald-400/10 to-transparent',
    },
  };

  const c = colorMap[color] || colorMap.blue;
  const grad = intensity > 0.6 ? c.gradHigh : c.gradLow;

  return (
    <motion.div
      variants={statVariants}
      whileHover={{ y: -3, scale: 1.015, boxShadow: `0 8px 32px rgba(0,0,0,0.3)` }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 relative overflow-hidden cursor-default transition-shadow ${isHovered ? `shadow-lg ${c.glow}` : ''}`}
    >
      {/* Temperature gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${grad} transition-opacity duration-500`} />

      {/* Shimmer overlay on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className={`absolute inset-0 bg-gradient-to-r ${c.shimmer}`}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.div
          className={`text-3xl font-bold ${c.text}`}
          key={value}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {animatedValue}
        </motion.div>
        <div className="text-sm text-white/50 mt-1">{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Score ring ─── */
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * ((size - 6) / 2);
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={(size - 6) / 2} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={(size - 6) / 2}
          fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  const t = useTranslations('recruiter');
  const router = useRouter();
  const supabase = createClient();

  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ totalApplicants: 0, activeJobs: 0, shortlisted: 0 });
  const [loading, setLoading] = useState(true);

  // Matched candidates
  const [matchedCandidates, setMatchedCandidates] = useState<MatchedCandidate[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [matchError, setMatchError] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Temperature
  const springTemp = useSpring(0, { stiffness: 30, damping: 12 });
  const bgOpacity = useTransform(springTemp, [0, 1], [0, 0.12]);
  const matchesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      const { data: rec } = await supabase.from('recruiters').select('*').eq('user_id', user.id).single();
      if (!rec || !rec.onboarding_completed_at) { router.push('/dashboard/recruiter/onboarding'); return; }
      setRecruiter(rec as unknown as Recruiter);

      const { data: jobList } = await supabase.from('jobs').select('*').eq('recruiter_id', rec.id).order('created_at', { ascending: false });
      const typedJobs = (jobList || []) as unknown as Job[];
      setJobs(typedJobs);

      const activeJobs = typedJobs.filter(j => j.is_active).length;
      const totalApplicants = typedJobs.reduce((sum, j) => sum + j.applications_count, 0);

      const { count: shortlisted } = await supabase
        .from('applications').select('*', { count: 'exact', head: true })
        .eq('recruiter_id', rec.id).in('status', ['shortlisted', 'interview_scheduled', 'interview_completed']);

      setStats({ totalApplicants, activeJobs, shortlisted: shortlisted || 0 });
      setLoading(false);
    }
    load();
  }, []);

  // Processing animation
  useEffect(() => {
    if (!matchesLoading) return;
    const interval = setInterval(() => {
      setProcessingStep(prev => prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev);
    }, 2000);
    return () => clearInterval(interval);
  }, [matchesLoading]);

  useEffect(() => { springTemp.set(matchesLoading ? 1 : 0); }, [matchesLoading, springTemp]);

  const findCandidates = useCallback(async () => {
    setMatchesLoading(true);
    setMatchError('');
    setProcessingStep(0);

    try {
      const url = selectedJobId
        ? `/api/recruiter/matched-candidates?job_id=${selectedJobId}`
        : '/api/recruiter/matched-candidates';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMatchedCandidates(json.matches || []);
      setMatchesLoaded(true);

      if (json.matches?.length > 0) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#a855f7', '#10b981', '#3b82f6'] });
      }
      setTimeout(() => matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setMatchesLoading(false);
    }
  }, [selectedJobId]);

  /* ── Dramatic loading reveal ── */
  const [loadingPhase, setLoadingPhase] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const timers = DASHBOARD_LOADING_STEPS.map((_, i) =>
      setTimeout(() => setLoadingPhase(i), i * 700)
    );
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  if (loading) {
    return (
      <DashboardLayout role="recruiter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center min-h-[60vh]">
          {/* Pulsing logo */}
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center mb-8 ring-1 ring-white/10"
            animate={{
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 0 0 0 rgba(168, 85, 247, 0)',
                '0 0 40px 8px rgba(168, 85, 247, 0.15)',
                '0 0 0 0 rgba(168, 85, 247, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-3xl">🚀</span>
          </motion.div>

          {/* Steps */}
          <div className="space-y-3 w-full max-w-xs">
            {DASHBOARD_LOADING_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: loadingPhase >= i ? 1 : 0.2,
                  x: loadingPhase >= i ? 0 : -20,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <motion.span
                  className="text-lg"
                  animate={loadingPhase === i ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.6, repeat: loadingPhase === i ? Infinity : 0 }}
                >
                  {step.icon}
                </motion.span>
                <span className={`text-sm font-medium transition-colors duration-300 ${loadingPhase >= i ? 'text-white/80' : 'text-white/20'}`}>
                  {step.text}
                </span>
                {loadingPhase > i && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="text-emerald-400 text-xs"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1 bg-white/5 rounded-full overflow-hidden w-full max-w-xs">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(95, ((loadingPhase + 1) / DASHBOARD_LOADING_STEPS.length) * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const tierLimits: Record<string, { jobs: number; views: number }> = {
    free: { jobs: 3, views: 10 }, pro: { jobs: Infinity, views: Infinity },
    enterprise: { jobs: Infinity, views: Infinity }, agency: { jobs: Infinity, views: Infinity },
  };

  const tier = recruiter?.tier || 'free';
  const theme = tierThemes[tier] || tierThemes.free;
  const limits = tierLimits[tier];
  const canPostJob = tier !== 'free' || jobs.length < limits.jobs;
  const activeJobs = jobs.filter(j => j.is_active);

  /* ── Tier-based radial background colors ── */
  const tierRadials: Record<string, string> = {
    free: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 60%)',
    pro: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 60%)',
    enterprise: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.06) 0%, transparent 60%)',
    agency: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 60%)',
  };

  return (
    <DashboardLayout role="recruiter" userName={recruiter?.company_name}>
      {/* Temperature background (processing) */}
      <motion.div className="fixed inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20 pointer-events-none z-0" style={{ opacity: bgOpacity }} />

      {/* Tier-based radial ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: tierRadials[tier] || tierRadials.free }} />

      <motion.div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" variants={containerVariants} initial="hidden" animate="visible">

        {/* Company Header */}
        <motion.div variants={cardVariants} className={`bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 mb-8 relative overflow-hidden ${theme.glow ? `shadow-lg ${theme.glow}` : ''}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {recruiter?.company_logo_url ? (
                <motion.img src={recruiter.company_logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
              ) : (
                <motion.div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-500/20" whileHover={{ scale: 1.08, rotate: -5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                  {recruiter?.company_name?.charAt(0) || '?'}
                </motion.div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{recruiter?.company_name || 'Your Company'}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <motion.span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${theme.badge}`} whileHover={{ scale: 1.08 }}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                  </motion.span>
                  {tier === 'free' && <span className="text-sm text-white/50">{t('viewsRemaining', { count: recruiter?.candidate_views_remaining ?? 0 })}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button onClick={() => router.push('/dashboard/recruiter/profile')} className="px-4 py-2 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                {t('companyProfile')}
              </motion.button>
              {canPostJob ? (
                <motion.button onClick={() => router.push('/dashboard/recruiter/post-job')} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20" whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }} whileTap={{ scale: 0.97 }}>
                  {t('postJob')}
                </motion.button>
              ) : (
                <motion.button onClick={() => router.push('/pricing')} className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg shadow-purple-500/20" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  {t('upgradeToPro')}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats — phase 2 reveal with temperature intensity */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard value={stats.activeJobs} label="Active Jobs" color="blue" intensity={Math.min(1, stats.activeJobs / 10)} />
          <StatCard value={stats.totalApplicants} label="Total Applicants" color="purple" intensity={Math.min(1, stats.totalApplicants / 50)} />
          <StatCard value={stats.shortlisted} label="In Pipeline" color="green" intensity={Math.min(1, stats.shortlisted / 20)} />
        </motion.div>

        {/* ── AI MATCHED CANDIDATES — phase 2.5 ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 mb-8 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">🧠</span>
                <h2 className="text-lg font-semibold text-white">AI Talent Matches</h2>
                {matchesLoaded && matchedCandidates.length > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
                    {matchedCandidates.length} found
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Job filter */}
                {activeJobs.length > 0 && (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="px-3 py-2 bg-white/5 ring-1 ring-white/10 rounded-lg text-sm text-white/60 focus:outline-none focus:ring-purple-500/40 appearance-none cursor-pointer"
                  >
                    <option value="">All active jobs</option>
                    {activeJobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title}</option>
                    ))}
                  </select>
                )}
                <motion.button
                  onClick={findCandidates}
                  disabled={matchesLoading}
                  className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                    matchesLoading
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl'
                  }`}
                  whileHover={matchesLoading ? {} : { scale: 1.05 }}
                  whileTap={matchesLoading ? {} : { scale: 0.97 }}
                >
                  {matchesLoading ? 'Scanning...' : matchesLoaded ? 'Refresh' : 'Find Top Talent'}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Processing reveal */}
          <AnimatePresence>
            {matchesLoading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-8 text-center">
                  <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 rounded-full bg-purple-500/20 mx-auto mb-6 flex items-center justify-center">
                    <span className="text-2xl">🧠</span>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.p key={processingStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm font-medium text-purple-300">
                      {PROCESSING_STEPS[processingStep]}
                    </motion.p>
                  </AnimatePresence>
                  <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" initial={{ width: '5%' }} animate={{ width: `${Math.min(95, (processingStep + 1) / PROCESSING_STEPS.length * 100)}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Candidate cards */}
          <div ref={matchesRef}>
            <AnimatePresence>
              {matchesLoaded && !matchesLoading && matchedCandidates.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {matchedCandidates.map((match, i) => {
                    const c = match.candidate;
                    const isExpanded = expandedCard === c.id;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                        whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 40px rgba(168, 85, 247, 0.15)' }}
                        onClick={() => setExpandedCard(isExpanded ? null : c.id)}
                        className="bg-[#0a0f1e] ring-1 ring-white/10 rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-purple-500/30"
                      >
                        {/* Header with photo + score */}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {c.photo_url ? (
                                <img src={c.photo_url} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500/20 flex-shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                                  {c.full_name?.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate">{c.full_name}</h3>
                                <p className="text-[11px] text-white/40 truncate">{c.headline || 'Candidate'}</p>
                              </div>
                            </div>
                            <ScoreRing score={match.score} size={44} />
                          </div>

                          {/* Meta badges */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {c.available_now && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full ring-1 ring-emerald-500/20">Available</span>}
                            {c.experience_years > 0 && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-full">{c.experience_years}yr exp</span>}
                            {c.country && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-full">{c.country.toUpperCase()}</span>}
                            {c.remote_preference && c.remote_preference !== 'any' && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-full">{c.remote_preference}</span>}
                          </div>

                          {/* Score bars */}
                          <div className="space-y-1.5 mb-3">
                            {[
                              { label: 'Skills', value: match.skills_match, color: 'bg-blue-500' },
                              { label: 'Experience', value: match.experience_match, color: 'bg-emerald-500' },
                              { label: 'Culture', value: match.culture_match, color: 'bg-purple-500' },
                            ].map(bar => (
                              <div key={bar.label} className="flex items-center gap-2">
                                <span className="text-[10px] text-white/30 w-14">{bar.label}</span>
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div className={`h-full rounded-full ${bar.color}`} initial={{ width: 0 }} animate={{ width: `${bar.value}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.08, ease: 'easeOut' }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Skills */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(c.skills || []).slice(0, 4).map(s => (
                              <span key={s} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300/70 text-[10px] rounded">
                                {s}
                              </span>
                            ))}
                            {(c.skills?.length || 0) > 4 && <span className="text-[10px] text-white/20">+{(c.skills?.length || 0) - 4}</span>}
                          </div>

                          {/* Why */}
                          <p className="text-[11px] text-white/40 line-clamp-2">{match.why}</p>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-white/5"
                            >
                              <div className="p-4 space-y-3">
                                {/* Highlights */}
                                {match.highlights?.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-1">Strengths</p>
                                    {match.highlights.map((h, j) => (
                                      <p key={j} className="text-[11px] text-white/50 flex items-start gap-1.5">
                                        <span className="text-emerald-400 mt-px">✓</span> {h}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Concerns */}
                                {match.concerns?.length > 0 && match.concerns[0] && (
                                  <div>
                                    <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1">Consider</p>
                                    {match.concerns.map((c2, j) => (
                                      <p key={j} className="text-[11px] text-white/40 flex items-start gap-1.5">
                                        <span className="text-amber-400 mt-px">!</span> {c2}
                                      </p>
                                    ))}
                                  </div>
                                )}

                                {/* Languages */}
                                {c.languages?.length > 0 && (
                                  <p className="text-[11px] text-white/30">Languages: {c.languages.join(', ')}</p>
                                )}

                                {/* View profile */}
                                <Link
                                  href={`/candidates/${c.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block text-center py-2 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-lg hover:bg-purple-500/20 transition-colors"
                                >
                                  View Full Profile →
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : matchesLoaded && !matchesLoading && matchedCandidates.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-white/40 text-sm">
                  No matching candidates found. Try adjusting your job requirements or check back later.
                </motion.div>
              ) : !matchesLoaded && !matchesLoading ? (
                <div className="p-8 text-center">
                  <p className="text-white/30 text-sm">Click &quot;Find Top Talent&quot; to discover candidates matched to your jobs using AI.</p>
                </div>
              ) : null}
            </AnimatePresence>
          </div>

          {matchError && (
            <div className="px-6 pb-4">
              <div className="p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">{matchError}</div>
            </div>
          )}
        </motion.div>

        {/* Jobs List — phase 3: reveals on scroll with whileInView */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl mb-8"
        >
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t('myJobs')}</h2>
            {tier === 'free' && <span className="text-sm text-white/50">{jobs.length}/{limits.jobs} jobs used</span>}
          </div>
          {jobs.length === 0 ? (
            <motion.div className="p-12 text-center text-white/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-lg">No jobs posted yet</p>
              <p className="text-sm text-white/30 mt-1">Start attracting top talent</p>
              <motion.button onClick={() => router.push('/dashboard/recruiter/post-job')} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium" whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }} whileTap={{ scale: 0.97 }}>
                Post Your First Job
              </motion.button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="divide-y divide-white/[0.04]">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={listItemVariants}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)', x: 4, scale: 1.005 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-4 flex items-center justify-between cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/recruiter/jobs/${job.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{job.title}</span>
                      {!job.is_active && (
                        <motion.span
                          className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-full"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          Inactive
                        </motion.span>
                      )}
                      {job.is_featured && (
                        <motion.span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full" animate={{ boxShadow: ['0 0 0 0 rgba(245,158,11,0)', '0 0 0 4px rgba(245,158,11,0.15)', '0 0 0 0 rgba(245,158,11,0)'] }} transition={{ duration: 2, repeat: Infinity }}>
                          Featured
                        </motion.span>
                      )}
                    </div>
                    <div className="text-sm text-white/50 mt-1">
                      {job.city ? `${job.city}, ` : ''}{job.country.toUpperCase()} · {job.work_mode} · {job.job_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-white">{job.views_count}</div>
                      <div className="text-white/50">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-white">{job.applications_count}</div>
                      <div className="text-white/50">Applicants</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions — phase 4: final reveal wave */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Post a Job', icon: '➕', href: '/dashboard/recruiter/post-job', gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/15' },
            { label: 'Company Profile', icon: '🏢', href: '/dashboard/recruiter/profile', gradient: 'from-purple-600 to-pink-600', shadow: 'shadow-purple-500/15' },
            { label: tier === 'free' ? 'Upgrade Plan' : 'Manage Plan', icon: '⚡', href: '/pricing', gradient: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-500/15' },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              variants={cardVariants}
              whileHover={{ scale: 1.015, y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(action.href)}
              className={`bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 flex items-center gap-4 cursor-pointer text-left transition-shadow shadow-lg ${action.shadow}`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center text-lg flex-shrink-0`}>
                {action.icon}
              </div>
              <span className="text-sm font-medium text-white/80">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
