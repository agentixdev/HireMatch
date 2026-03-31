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
  job: { id: string; title: string; city: string | null; work_mode: string } | null;
}

// --- Status configuration with temperature-aware colors ---
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; glow?: string; warm: number }> = {
  applied:              { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Applied',      warm: 0 },
  reviewed:             { color: 'text-sky-400',     bg: 'bg-sky-500/15',     label: 'Reviewed',     warm: 1 },
  shortlisted:          { color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Shortlisted',  glow: 'shadow-amber-500/20', warm: 3 },
  interview_scheduled:  { color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Interview',    glow: 'shadow-violet-500/20', warm: 3 },
  interview_completed:  { color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Interviewed',  warm: 2 },
  offer_extended:       { color: 'text-green-400',   bg: 'bg-green-500/15',   label: 'Offer',        glow: 'shadow-green-500/25', warm: 5 },
  offer_accepted:       { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Accepted',     glow: 'shadow-emerald-500/25', warm: 5 },
  hired:                { color: 'text-emerald-300', bg: 'bg-emerald-500/20', label: 'Hired!',       glow: 'shadow-emerald-500/30', warm: 6 },
  rejected:             { color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Rejected',     glow: 'shadow-red-500/15', warm: -1 },
  withdrawn:            { color: 'text-white/50',    bg: 'bg-white/5',        label: 'Withdrawn',    warm: -1 },
};

const ACTIVE_STATUSES = new Set(['interview_scheduled', 'shortlisted', 'offer_extended']);

// --- Match score temperature colors ---
function matchScoreStyle(score: number) {
  if (score >= 90) return { text: 'text-emerald-300', bg: 'bg-emerald-500/15', glow: 'shadow-emerald-400/30', ring: 'ring-emerald-500/30' };
  if (score >= 70) return { text: 'text-amber-300', bg: 'bg-amber-500/15', glow: 'shadow-amber-400/20', ring: 'ring-amber-500/30' };
  return { text: 'text-blue-300', bg: 'bg-blue-500/15', glow: 'shadow-blue-400/15', ring: 'ring-blue-500/20' };
}

// --- Animated counter ---
function AnimatedCount({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const from = 0;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  return <span>{display}</span>;
}

// --- Motion variants ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V = Record<string, any>;

const pageVariants: V = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const statsContainerVariants: V = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const statCardVariants: V = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 28 },
  },
};

const filterBarVariants: V = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

const listVariants: V = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants: V = {
  hidden: { opacity: 0, x: -40, scale: 0.97 },
  visible: {
    opacity: 1, x: 0, scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.2 } },
};

// --- Loading reveal messages ---
const LOADING_STEPS = [
  'Fetching your applications...',
  'Checking for status updates...',
  'Ready!',
];

function DramaticLoader() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className={`text-sm font-medium ${step === 2 ? 'text-emerald-400' : 'text-white/50'}`}
        >
          {LOADING_STEPS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// --- Stat card ---
function StatCard({ label, value, icon, gradient }: { label: string; value: number; icon: string; gradient: string }) {
  return (
    <motion.div
      variants={statCardVariants}
      whileHover={{ scale: 1.04, y: -2 }}
      className={`relative overflow-hidden rounded-xl p-4 ring-1 ring-white/10 bg-[#0F172A] group cursor-default`}
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

// --- Withdraw button with shake ---
function WithdrawButton({ appId, onWithdraw }: { appId: string; onWithdraw: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleClick = () => {
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
      onClick={(e) => { e.stopPropagation(); handleClick(); }}
      animate={shaking ? { x: [0, -3, 3, -3, 3, -2, 2, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
        confirming
          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
          : 'text-white/30 hover:text-white/50 hover:bg-white/5'
      }`}
    >
      {confirming ? 'Confirm?' : 'Withdraw'}
    </motion.button>
  );
}

// --- Ripple effect ---
function useRipple() {
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const trigger = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => setRipple(null), 600);
  }, []);

  return { ripple, trigger };
}

// --- Application card ---
function ApplicationCard({ app, onWithdraw }: { app: AppRow; onWithdraw: (id: string) => void }) {
  const cfg = STATUS_CONFIG[app.status] || { color: 'text-white/50', bg: 'bg-white/5', label: app.status, warm: 0 };
  const isActive = ACTIVE_STATUSES.has(app.status);
  const { ripple, trigger } = useRipple();
  const score = app.match_score;
  const scoreStyle = score ? matchScoreStyle(score) : null;

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={trigger}
      className={`relative overflow-hidden bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 flex items-center justify-between transition-shadow cursor-pointer group
        hover:ring-white/20 ${cfg.glow ? `hover:shadow-lg ${cfg.glow}` : 'hover:shadow-lg hover:shadow-white/5'}`}
    >
      {/* Ripple */}
      <AnimatePresence>
        {ripple && (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute rounded-full bg-white/10 pointer-events-none"
            style={{ width: 80, height: 80, left: ripple.x - 40, top: ripple.y - 40 }}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 relative">
        <Link href={app.job ? `/jobs/${app.job.id}` : '#'} className="text-white font-medium hover:text-blue-400 transition-colors">
          {app.job?.title || 'Job'}
        </Link>
        <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
          {app.job?.city && <span>{app.job.city}</span>}
          {app.job?.work_mode && <span className="capitalize">{app.job.work_mode}</span>}
          <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        {/* Match score with temperature */}
        {score && scoreStyle && (
          <motion.span
            whileHover={{ scale: 1.1 }}
            className={`px-2 py-0.5 text-sm font-bold rounded-md ${scoreStyle.bg} ${scoreStyle.text} ring-1 ${scoreStyle.ring} shadow-md ${scoreStyle.glow}`}
          >
            {score}%
          </motion.span>
        )}

        {/* Status badge */}
        <motion.span
          animate={isActive ? { scale: [1, 1.06, 1] } : {}}
          transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${cfg.bg} ${cfg.color} ${isActive ? 'ring-1 ring-current/20' : ''}`}
        >
          {cfg.label}
        </motion.span>

        {/* Withdraw for active applications */}
        {!['rejected', 'withdrawn', 'hired', 'offer_accepted'].includes(app.status) && (
          <WithdrawButton appId={app.id} onWithdraw={onWithdraw} />
        )}
      </div>
    </motion.div>
  );
}

// --- Empty state ---
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        className="text-4xl mb-4"
      >
        &#8593;
      </motion.div>
      <p className="text-lg text-white/50 mb-2">No applications yet</p>
      <p className="text-sm text-white/30 mb-6">Take the matchmaker quiz to find your perfect roles</p>
      <Link
        href="/dashboard/candidate/matchmaker"
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 inline-block hover:shadow-blue-500/40 transition-shadow"
      >
        Go to Matchmaker
      </Link>
    </motion.div>
  );
}

// =============================================
// Main page component
// =============================================
export default function CandidateApplications() {
  const router = useRouter();
  const supabase = createClient();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: cand } = await supabase.from('candidates').select('id, full_name').eq('user_id', user.id).single();
      if (!cand) { router.push('/dashboard/candidate/onboarding'); return; }
      setUserName(cand.full_name);

      const { data } = await supabase
        .from('applications')
        .select('id, status, match_score, created_at, job:jobs(id, title, city, work_mode)')
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

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const statusCounts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  // Compute warmth for background gradient
  const warmStatuses = ['offer_extended', 'offer_accepted', 'hired', 'shortlisted'];
  const coldStatuses = ['rejected', 'withdrawn'];
  const warmCount = apps.filter(a => warmStatuses.includes(a.status)).length;
  const coldCount = apps.filter(a => coldStatuses.includes(a.status)).length;
  const warmth = apps.length > 0 ? (warmCount - coldCount * 0.5) / apps.length : 0;

  // Stats
  const totalCount = apps.length;
  const inProgressCount = apps.filter(a => ['applied', 'reviewed', 'shortlisted', 'interview_scheduled', 'interview_completed'].includes(a.status)).length;
  const offerCount = apps.filter(a => ['offer_extended', 'offer_accepted', 'hired'].includes(a.status)).length;
  const rejectedCount = apps.filter(a => a.status === 'rejected').length;

  // Loading state with dramatic reveal
  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <DramaticLoader />
      </DashboardLayout>
    );
  }

  // Background gradient tint based on application warmth
  const bgGradient = warmth > 0.3
    ? 'bg-gradient-to-br from-emerald-950/20 via-transparent to-transparent'
    : warmth < -0.1
      ? 'bg-gradient-to-br from-red-950/10 via-transparent to-transparent'
      : 'bg-gradient-to-br from-blue-950/10 via-transparent to-transparent';

  return (
    <DashboardLayout role="candidate" userName={userName}>
      <div className={`min-h-full ${bgGradient} transition-colors duration-1000`}>
        <motion.div
          className="max-w-4xl mx-auto px-4 py-8"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div
            variants={statCardVariants}
            className="flex items-center justify-between mb-8"
          >
            <h1 className="text-2xl font-bold text-white">My Applications</h1>
            <span className="text-sm text-white/30 tabular-nums">{apps.length} total</span>
          </motion.div>

          {/* Phase 1: Stat cards */}
          <motion.div
            variants={statsContainerVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
          >
            <StatCard label="Total" value={totalCount} icon="&#128203;" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
            <StatCard label="In Progress" value={inProgressCount} icon="&#9889;" gradient="bg-gradient-to-br from-amber-500 to-orange-600" />
            <StatCard label="Offers" value={offerCount} icon="&#127881;" gradient="bg-gradient-to-br from-emerald-500 to-green-600" />
            <StatCard label="Rejected" value={rejectedCount} icon="&#10060;" gradient="bg-gradient-to-br from-red-500 to-rose-600" />
          </motion.div>

          {/* Phase 2: Filter bar */}
          <motion.div variants={filterBarVariants} className="relative flex flex-wrap gap-2 mb-6">
            {[
              { key: 'all', label: `All (${apps.length})`, color: 'text-blue-400', bg: 'bg-blue-500/15' },
              ...Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { color: 'text-white/50', bg: 'bg-white/5', label: status, warm: 0 };
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

          {/* Phase 3: Application cards */}
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div variants={listVariants} className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((app) => (
                  <ApplicationCard key={app.id} app={app} onWithdraw={handleWithdraw} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
