'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface AppRow {
  id: string;
  status: string;
  match_score: number | null;
  created_at: string;
  updated_at?: string;
  cover_letter?: string;
  job: { id: string; title: string; city: string | null; country: string | null; work_mode: string; salary_min?: number; salary_max?: number; salary_currency?: string; skills_required?: string[] } | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; glow?: string; warm: number; icon: string; step: number }> = {
  applied:              { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Applied',      warm: 0, icon: '📄', step: 1 },
  reviewed:             { color: 'text-sky-400',     bg: 'bg-sky-500/15',     label: 'Reviewed',     warm: 1, icon: '👁️', step: 2 },
  shortlisted:          { color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Shortlisted',  glow: 'shadow-amber-500/20', warm: 3, icon: '⭐', step: 3 },
  interview_scheduled:  { color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Interview Scheduled', glow: 'shadow-violet-500/20', warm: 3, icon: '📅', step: 4 },
  interview_completed:  { color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Interview Done', warm: 2, icon: '✅', step: 5 },
  offer_extended:       { color: 'text-green-400',   bg: 'bg-green-500/15',   label: 'Offer Extended', glow: 'shadow-green-500/25', warm: 5, icon: '🎉', step: 6 },
  offer_accepted:       { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Offer Accepted', glow: 'shadow-emerald-500/25', warm: 5, icon: '🤝', step: 7 },
  hired:                { color: 'text-emerald-300', bg: 'bg-emerald-500/20', label: 'Hired',        glow: 'shadow-emerald-500/30', warm: 6, icon: '🏆', step: 8 },
  rejected:             { color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Rejected',     glow: 'shadow-red-500/15', warm: -1, icon: '✗', step: -1 },
  withdrawn:            { color: 'text-white/50',    bg: 'bg-white/5',        label: 'Withdrawn',    warm: -1, icon: '↩', step: -1 },
};

const PIPELINE_STEPS = [
  { key: 'applied', label: 'Applied', icon: '📄' },
  { key: 'reviewed', label: 'Reviewed', icon: '👁️' },
  { key: 'shortlisted', label: 'Shortlisted', icon: '⭐' },
  { key: 'interview_scheduled', label: 'Interview', icon: '📅' },
  { key: 'interview_completed', label: 'Interviewed', icon: '✅' },
  { key: 'offer_extended', label: 'Offer', icon: '🎉' },
  { key: 'hired', label: 'Hired', icon: '🏆' },
];

const ACTIVE_STATUSES = new Set(['interview_scheduled', 'shortlisted', 'offer_extended']);

function matchScoreStyle(score: number) {
  if (score >= 90) return { text: 'text-emerald-300', bg: 'bg-emerald-500/15', glow: 'shadow-emerald-400/30', ring: 'ring-emerald-500/30' };
  if (score >= 70) return { text: 'text-amber-300', bg: 'bg-amber-500/15', glow: 'shadow-amber-400/20', ring: 'ring-amber-500/30' };
  return { text: 'text-blue-300', bg: 'bg-blue-500/15', glow: 'shadow-blue-400/15', ring: 'ring-blue-500/20' };
}

function AnimatedCount({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = Date.now();
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <span>{display}</span>;
}

/* ─── Motion variants ─── */
const pageVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const statsContainerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const statCardVariants = { hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } } };
const filterBarVariants = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } } };
const listVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, x: -40, scale: 0.97 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }, exit: { opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.2 } } };

/* ─── Loading ─── */
const LOADING_STEPS = ['Fetching your applications...', 'Checking for status updates...', 'Ready!'];

function DramaticLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      <AnimatePresence mode="wait">
        <motion.p key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className={`text-sm font-medium ${step === 2 ? 'text-emerald-400' : 'text-white/50'}`}>
          {LOADING_STEPS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ─── Clickable stat card ─── */
function StatCard({ label, value, icon, gradient, active, onClick }: {
  label: string; value: number; icon: string; gradient: string; active?: boolean; onClick: () => void;
}) {
  return (
    <motion.div
      variants={statCardVariants}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl p-4 ring-1 bg-[#0F172A] cursor-pointer transition-all ${
        active ? 'ring-blue-500/40 shadow-lg shadow-blue-500/10' : 'ring-white/10 hover:ring-white/20'
      }`}
    >
      <div className={`absolute inset-0 opacity-[0.07] ${gradient}`} />
      <div className="relative flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-2xl font-bold text-white tabular-nums">
            <AnimatedCount value={value} />
          </div>
          <div className="text-xs text-white/40 font-medium">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Withdraw button ─── */
function WithdrawButton({ appId, onWithdraw }: { appId: string; onWithdraw: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      onWithdraw(appId);
    } else {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      animate={shaking ? { x: [0, -3, 3, -3, 3, -2, 2, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        confirming
          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
          : 'text-white/30 hover:text-white/50 hover:bg-white/5'
      }`}
    >
      {confirming ? 'Confirm Withdraw?' : 'Withdraw'}
    </motion.button>
  );
}

/* ─── Pipeline progress visualization ─── */
function PipelineTimeline({ currentStatus }: { currentStatus: string }) {
  const currentCfg = STATUS_CONFIG[currentStatus];
  if (!currentCfg || currentCfg.step < 0) {
    return (
      <div className="flex items-center gap-2 py-2">
        <span className="text-sm">{currentCfg?.icon || '?'}</span>
        <span className={`text-sm font-medium ${currentCfg?.color || 'text-white/50'}`}>{currentCfg?.label || currentStatus}</span>
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-1">
        {PIPELINE_STEPS.map((step, i) => {
          const stepCfg = STATUS_CONFIG[step.key];
          const reached = stepCfg && currentCfg && stepCfg.step <= currentCfg.step;
          const isCurrent = step.key === currentStatus;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                className={`flex flex-col items-center gap-1 ${isCurrent ? 'z-10' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                  isCurrent
                    ? 'bg-blue-500/30 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20'
                    : reached
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500/30'
                      : 'bg-white/5 ring-1 ring-white/10'
                }`}>
                  {reached ? <span className="text-[10px]">{step.icon}</span> : <span className="text-[10px] text-white/20">{i + 1}</span>}
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap ${
                  isCurrent ? 'text-blue-400' : reached ? 'text-emerald-400/60' : 'text-white/20'
                }`}>
                  {step.label}
                </span>
              </motion.div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-0.5 rounded-full ${
                  reached && STATUS_CONFIG[PIPELINE_STEPS[i + 1]?.key]?.step <= currentCfg.step
                    ? 'bg-emerald-500/30'
                    : 'bg-white/5'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Expanded detail panel ─── */
function ApplicationDetail({ app, onWithdraw }: { app: AppRow; onWithdraw: (id: string) => void }) {
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="overflow-hidden"
    >
      <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-4">
        {/* Pipeline timeline */}
        <PipelineTimeline currentStatus={app.status} />

        {/* Job details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {app.job?.city && (
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Location</div>
              <div className="text-sm text-white/70">{app.job.city}{app.job.country ? `, ${app.job.country}` : ''}</div>
            </div>
          )}
          {app.job?.work_mode && (
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Work Mode</div>
              <div className="text-sm text-white/70 capitalize">{app.job.work_mode}</div>
            </div>
          )}
          {app.job?.salary_max && app.job.salary_max > 0 && (
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Salary Range</div>
              <div className="text-sm text-emerald-400/80">
                {app.job.salary_currency || '$'} {Math.round((app.job.salary_min || 0) / 1000)}k - {Math.round(app.job.salary_max / 1000)}k
              </div>
            </div>
          )}
          <div className="bg-white/[0.03] rounded-lg p-3">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Applied On</div>
            <div className="text-sm text-white/70">{new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Skills */}
        {app.job?.skills_required && app.job.skills_required.length > 0 && (
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Required Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {app.job.skills_required.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-blue-500/10 text-blue-400/70 text-xs rounded-full">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href={app.job ? `/jobs/${app.job.id}` : '#'}
            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            View Job Listing
          </Link>
          {!['rejected', 'withdrawn', 'hired', 'offer_accepted'].includes(app.status) && (
            <WithdrawButton appId={app.id} onWithdraw={onWithdraw} />
          )}
          <div className="flex-1" />
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Application card (clickable to expand) ─── */
function ApplicationCard({ app, expanded, onToggle, onWithdraw }: {
  app: AppRow; expanded: boolean; onToggle: () => void; onWithdraw: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[app.status] || { color: 'text-white/50', bg: 'bg-white/5', label: app.status, warm: 0, icon: '?', step: 0 };
  const isActive = ACTIVE_STATUSES.has(app.status);
  const score = app.match_score;
  const scoreStyle = score ? matchScoreStyle(score) : null;

  return (
    <motion.div
      variants={cardVariants}
      layout
      className={`relative overflow-hidden bg-[#0F172A] ring-1 rounded-xl transition-all ${
        expanded
          ? 'ring-blue-500/30 shadow-lg shadow-blue-500/10'
          : `ring-white/10 hover:ring-white/20 ${cfg.glow ? `hover:shadow-lg ${cfg.glow}` : 'hover:shadow-lg hover:shadow-white/5'}`
      }`}
    >
      {/* Card header (always visible) */}
      <motion.div
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        whileTap={{ scale: 0.995 }}
        onClick={onToggle}
        className="p-5 flex items-center justify-between cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{cfg.icon}</span>
            <h3 className="text-white font-medium truncate">{app.job?.title || 'Job'}</h3>
            {isActive && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium"
              >
                Active
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
            {app.job?.city && <span>{app.job.city}</span>}
            {app.job?.work_mode && <span className="capitalize">{app.job.work_mode}</span>}
            <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {score && scoreStyle && (
            <motion.span
              whileHover={{ scale: 1.1 }}
              className={`px-2 py-0.5 text-sm font-bold rounded-md ${scoreStyle.bg} ${scoreStyle.text} ring-1 ${scoreStyle.ring} shadow-md ${scoreStyle.glow}`}
            >
              {score}%
            </motion.span>
          )}
          <motion.span
            animate={isActive ? { scale: [1, 1.06, 1] } : {}}
            transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${cfg.bg} ${cfg.color} ${isActive ? 'ring-1 ring-current/20' : ''}`}
          >
            {cfg.label}
          </motion.span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-white/30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </motion.div>
        </div>
      </motion.div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && <ApplicationDetail app={app} onWithdraw={onWithdraw} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Empty state ─── */
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} className="text-4xl mb-4">
        🔍
      </motion.div>
      <p className="text-lg text-white/50 mb-2">No applications yet</p>
      <p className="text-sm text-white/30 mb-6">Find jobs that match your skills and apply</p>
      <Link href="/jobs" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 inline-block hover:shadow-blue-500/40 transition-shadow">
        Browse Jobs
      </Link>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CandidateApplications() {
  const router = useRouter();
  const supabase = createClient();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: cand } = await supabase.from('candidates').select('id, full_name').eq('user_id', user.id).single();
      if (!cand) { router.push('/dashboard/candidate/onboarding'); return; }
      setUserName(cand.full_name);

      const { data } = await supabase
        .from('applications')
        .select('id, status, match_score, created_at, updated_at, cover_letter, job:jobs(id, title, city, country, work_mode, salary_min, salary_max, salary_currency, skills_required)')
        .eq('candidate_id', cand.id)
        .order('created_at', { ascending: false });

      setApps((data || []) as unknown as AppRow[]);
      setLoading(false);
    })();
  }, []);

  const handleWithdraw = useCallback(async (appId: string) => {
    await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', appId);
    setApps(prev => prev.map(a => a.id === appId ? { ...a, status: 'withdrawn' } : a));
  }, [supabase]);

  const filtered = filter === 'all' ? apps : apps.filter(a => {
    if (filter === 'in_progress') return ['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'interview_completed'].includes(a.status);
    if (filter === 'offers') return ['offer_extended', 'offer_accepted', 'hired'].includes(a.status);
    if (filter === 'rejected') return a.status === 'rejected';
    return a.status === filter;
  });

  const statusCounts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const totalCount = apps.length;
  const inProgressCount = apps.filter(a => ['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'interview_completed'].includes(a.status)).length;
  const offerCount = apps.filter(a => ['offer_extended', 'offer_accepted', 'hired'].includes(a.status)).length;
  const rejectedCount = apps.filter(a => a.status === 'rejected').length;

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <DramaticLoader />
      </DashboardLayout>
    );
  }

  const warmStatuses = ['offer_extended', 'offer_accepted', 'hired', 'shortlisted'];
  const coldStatuses = ['rejected', 'withdrawn'];
  const warmCount = apps.filter(a => warmStatuses.includes(a.status)).length;
  const coldCount = apps.filter(a => coldStatuses.includes(a.status)).length;
  const warmth = apps.length > 0 ? (warmCount - coldCount * 0.5) / apps.length : 0;

  const bgGradient = warmth > 0.3
    ? 'bg-gradient-to-br from-emerald-950/20 via-transparent to-transparent'
    : warmth < -0.1
      ? 'bg-gradient-to-br from-red-950/10 via-transparent to-transparent'
      : 'bg-gradient-to-br from-blue-950/10 via-transparent to-transparent';

  return (
    <DashboardLayout role="candidate" userName={userName}>
      <div className={`min-h-full ${bgGradient} transition-colors duration-1000`}>
        <motion.div className="max-w-4xl mx-auto px-4 py-8" variants={pageVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={statCardVariants} className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">My Applications</h1>
            <span className="text-sm text-white/30 tabular-nums">{apps.length} total</span>
          </motion.div>

          {/* Clickable stat cards */}
          <motion.div variants={statsContainerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total" value={totalCount} icon="📋" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" active={filter === 'all'} onClick={() => setFilter('all')} />
            <StatCard label="In Progress" value={inProgressCount} icon="⚡" gradient="bg-gradient-to-br from-amber-500 to-orange-600" active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} />
            <StatCard label="Offers" value={offerCount} icon="🎉" gradient="bg-gradient-to-br from-emerald-500 to-green-600" active={filter === 'offers'} onClick={() => setFilter('offers')} />
            <StatCard label="Rejected" value={rejectedCount} icon="❌" gradient="bg-gradient-to-br from-red-500 to-rose-600" active={filter === 'rejected'} onClick={() => setFilter('rejected')} />
          </motion.div>

          {/* Fine-grained filter pills */}
          <motion.div variants={filterBarVariants} className="relative flex flex-wrap gap-2 mb-6">
            {[
              { key: 'all', label: `All (${apps.length})`, color: 'text-blue-400', bg: 'bg-blue-500/15' },
              ...Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { color: 'text-white/50', bg: 'bg-white/5', label: status, warm: 0, icon: '?', step: 0 };
                return { key: status, label: `${cfg.label} (${count})`, color: cfg.color, bg: cfg.bg };
              }),
            ].map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === tab.key
                    ? `${tab.bg} ${tab.color} ring-1 ring-current/30 shadow-sm`
                    : 'text-white/40 hover:text-white/60 bg-white/5'
                }`}
              >
                {tab.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Application cards */}
          {filtered.length === 0 ? (
            filter !== 'all' ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center">
                <p className="text-lg text-white/40 mb-2">No applications match this filter</p>
                <button onClick={() => setFilter('all')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Show all applications</button>
              </motion.div>
            ) : (
              <EmptyState />
            )
          ) : (
            <motion.div variants={listVariants} className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    expanded={expandedId === app.id}
                    onToggle={() => setExpandedId(prev => prev === app.id ? null : app.id)}
                    onWithdraw={handleWithdraw}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
