'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import type { Candidate, Application } from '@/types';
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
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };
const statVariants = { hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } } };
const listItemVariants = { hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };

const PROCESSING_STEPS = [
  'Analyzing your skills & experience...',
  'Scanning active job listings...',
  'Computing match scores with AI...',
  'Ranking opportunities by fit...',
  'Preparing your matches...',
];

/* ─── Types ─── */
interface MatchedJob {
  score: number;
  skills_match: number;
  experience_match: number;
  culture_match: number;
  why: string;
  tip: string;
  job: {
    id: string;
    title: string;
    industry: string;
    city: string;
    country: string;
    work_mode: string;
    salary_min: number;
    salary_max: number;
    salary_currency: string;
    job_type: string;
    skills_required: string[];
    recruiter: { company_name?: string; company_logo_url?: string } | null;
  };
}

/* ─── Stat Card ─── */
function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const animatedValue = useCountUp(value);
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 from-blue-500/10 to-blue-600/5',
    purple: 'text-purple-400 from-purple-500/10 to-purple-600/5',
    green: 'text-green-400 from-green-500/10 to-green-600/5',
  };
  return (
    <motion.div variants={statVariants} whileHover={{ y: -2, scale: 1.02 }} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]?.split(' ').slice(1).join(' ')} opacity-50`} />
      <div className="relative">
        <div className={`text-3xl font-bold ${colorMap[color]?.split(' ')[0]}`}>{animatedValue}</div>
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

export default function CandidateDashboard() {
  const t = useTranslations('candidate');
  const router = useRouter();
  const supabase = createClient();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<(Application & { job?: { title: string } })[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Matched jobs state
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [matchError, setMatchError] = useState('');

  // Temperature background
  const springTemp = useSpring(0, { stiffness: 30, damping: 12 });
  const bgOpacity = useTransform(springTemp, [0, 1], [0, 0.12]);

  const matchesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      const { data: cand } = await supabase.from('candidates').select('*').eq('user_id', user.id).single();
      if (!cand) { router.push('/dashboard/candidate/onboarding'); return; }
      // Gate: if quiz_answers is null/empty, redirect back to onboarding
      const qa = (cand as Record<string, unknown>).quiz_answers;
      if (!qa || (typeof qa === 'object' && Object.keys(qa as Record<string, unknown>).length === 0)) {
        router.push('/dashboard/candidate/onboarding');
        return;
      }
      setCandidate(cand as unknown as Candidate);

      const { data: apps } = await supabase
        .from('applications').select('*, job:jobs(title)')
        .eq('candidate_id', cand.id).order('created_at', { ascending: false });
      if (apps) setApplications(apps as unknown as typeof applications);

      const { count } = await supabase
        .from('matches').select('*', { count: 'exact', head: true })
        .eq('candidate_id', cand.id);
      setMatchCount(count || 0);
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

  const findMatches = useCallback(async () => {
    setMatchesLoading(true);
    setMatchError('');
    setProcessingStep(0);

    try {
      const res = await fetch('/api/candidate/matched-jobs');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMatchedJobs(json.matches || []);
      setMatchesLoaded(true);

      if (json.matches?.length > 0) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
      }
      setTimeout(() => matchesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Failed to find matches');
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" /><div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    applied: 'bg-blue-500/20 text-blue-400', reviewed: 'bg-yellow-500/20 text-yellow-400',
    shortlisted: 'bg-purple-500/20 text-purple-400', interview_scheduled: 'bg-indigo-500/20 text-indigo-400',
    interview_completed: 'bg-indigo-500/20 text-indigo-400', offer_extended: 'bg-green-500/20 text-green-400',
    offer_accepted: 'bg-green-500/20 text-green-400', hired: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400', withdrawn: 'bg-white/5 text-white/70',
  };

  const inProgressCount = applications.filter(a =>
    ['shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'].includes(a.status)
  ).length;

  return (
    <DashboardLayout role="candidate" userName={candidate?.full_name}>
      {/* Temperature background */}
      <motion.div className="fixed inset-0 bg-gradient-to-br from-blue-600/20 to-emerald-600/20 pointer-events-none z-0" style={{ opacity: bgOpacity }} />

      <motion.div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" variants={containerVariants} initial="hidden" animate="visible">

        {/* Profile Summary */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
          <div className="relative flex items-start gap-6">
            {candidate?.photo_url ? (
              <motion.img src={candidate.photo_url} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500/30" whileHover={{ scale: 1.08 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
            ) : (
              <motion.div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20" whileHover={{ scale: 1.08, rotate: 5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                {candidate?.full_name?.charAt(0)}
              </motion.div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{candidate?.full_name}</h1>
              {candidate?.headline && <p className="text-white/60 mt-1">{candidate.headline}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {candidate?.skills?.slice(0, 8).map((skill, i) => (
                  <motion.span key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 400, damping: 25 }} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full hover:bg-blue-500/20 transition-colors cursor-default">
                    {skill}
                  </motion.span>
                ))}
                {(candidate?.skills?.length || 0) > 8 && (
                  <span className="px-3 py-1 bg-transparent text-white/50 text-sm rounded-full">+{(candidate?.skills?.length || 0) - 8} more</span>
                )}
              </div>
            </div>
            <motion.button onClick={() => router.push('/dashboard/candidate/profile')} className="px-4 py-2 text-sm font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              {t('editProfile')}
            </motion.button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard value={applications.length} label={t('myApplications')} color="blue" />
          <StatCard value={matchCount} label={t('matchedJobs')} color="purple" />
          <StatCard value={inProgressCount} label="In Progress" color="green" />
        </motion.div>

        {/* ── AI MATCHED JOBS ── */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">🎯</span>
              <h2 className="text-lg font-semibold text-white">AI Job Matches</h2>
              {matchesLoaded && matchedJobs.length > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
                  {matchedJobs.length} found
                </motion.span>
              )}
            </div>
            <motion.button
              onClick={findMatches}
              disabled={matchesLoading}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                matchesLoading
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl'
              }`}
              whileHover={matchesLoading ? {} : { scale: 1.05 }}
              whileTap={matchesLoading ? {} : { scale: 0.97 }}
            >
              {matchesLoading ? 'Scanning...' : matchesLoaded ? 'Refresh Matches' : 'Find My Matches'}
            </motion.button>
          </div>

          {/* Processing reveal */}
          <AnimatePresence>
            {matchesLoading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="p-8 text-center">
                  <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 rounded-full bg-blue-500/20 mx-auto mb-6 flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    <motion.p key={processingStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm font-medium text-blue-300">
                      {PROCESSING_STEPS[processingStep]}
                    </motion.p>
                  </AnimatePresence>
                  <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" initial={{ width: '5%' }} animate={{ width: `${Math.min(95, (processingStep + 1) / PROCESSING_STEPS.length * 100)}%` }} transition={{ duration: 1.5, ease: 'easeOut' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Match results */}
          <div ref={matchesRef}>
            <AnimatePresence>
              {matchesLoaded && !matchesLoading && matchedJobs.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {matchedJobs.map((match, i) => {
                    const rec = match.job?.recruiter as { company_name?: string; company_logo_url?: string } | null;
                    return (
                      <motion.div
                        key={match.job?.id || i}
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                        whileHover={{ y: -4, scale: 1.02, boxShadow: '0 12px 40px rgba(59, 130, 246, 0.15)' }}
                        className="bg-[#0a0f1e] ring-1 ring-white/10 rounded-xl p-4 flex flex-col cursor-pointer transition-all hover:ring-blue-500/30"
                        onClick={() => router.push(`/jobs/${match.job?.id}`)}
                      >
                        {/* Score + Company */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {rec?.company_logo_url ? (
                              <img src={rec.company_logo_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0">
                                {rec?.company_name?.charAt(0) || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs text-white/40 truncate">{rec?.company_name || 'Company'}</p>
                            </div>
                          </div>
                          <ScoreRing score={match.score} size={44} />
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 flex-1">{match.job?.title}</h3>

                        {/* Meta */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {match.job?.work_mode && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-full">{match.job.work_mode}</span>}
                          {match.job?.city && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-[10px] rounded-full">{match.job.city}</span>}
                          {match.job?.salary_max > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400/70 text-[10px] rounded-full">
                              {match.job.salary_currency || '$'} {Math.round(match.job.salary_min / 1000)}k-{Math.round(match.job.salary_max / 1000)}k
                            </span>
                          )}
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

                        {/* Why */}
                        <p className="text-[11px] text-white/40 line-clamp-2">{match.why}</p>

                        {/* Tip */}
                        {match.tip && (
                          <div className="mt-2 px-2 py-1.5 bg-amber-500/5 rounded-lg">
                            <p className="text-[10px] text-amber-400/70">💡 {match.tip}</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : matchesLoaded && !matchesLoading && matchedJobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-white/40 text-sm">
                  No matching jobs found right now. Check back as new jobs are posted!
                </motion.div>
              ) : !matchesLoaded && !matchesLoading ? (
                <div className="p-8 text-center">
                  <p className="text-white/30 text-sm">Click &quot;Find My Matches&quot; to discover jobs tailored to your skills and experience.</p>
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

        {/* Applications */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">{t('myApplications')}</h2>
          </div>
          {applications.length === 0 ? (
            <motion.div className="p-12 text-center text-white/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg">No applications yet</p>
              <p className="text-sm text-white/30 mt-1">Find your next opportunity</p>
              <motion.button onClick={() => router.push('/jobs')} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium" whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }} whileTap={{ scale: 0.97 }}>
                Browse Jobs
              </motion.button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="divide-y divide-white/[0.04]">
              {applications.map((app) => (
                <motion.div key={app.id} variants={listItemVariants} whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)', x: 4 }} className="px-6 py-4 flex items-center justify-between cursor-pointer transition-colors" onClick={() => router.push(`/dashboard/candidate/applications`)}>
                  <div>
                    <div className="font-medium text-white">{app.job?.title || 'Job'}</div>
                    <div className="text-sm text-white/50 mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.match_score && <span className="text-sm font-medium text-blue-400">{app.match_score}% match</span>}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[app.status] || 'bg-white/5 text-white/70'}`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
