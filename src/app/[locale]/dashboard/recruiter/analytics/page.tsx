'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import {
  springSnappy,
  springBouncy,
  springSmooth,
  staggerContainer,
  staggerItem,
  getTemperatureColors,
} from '@/lib/wow';

/* ─── Types ─── */
interface AnalyticsData {
  funnel: {
    applied: number;
    reviewed: number;
    shortlisted: number;
    interview: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  time_metrics: {
    avg_time_to_hire_days: number;
    avg_time_to_first_review_days: number;
    avg_time_to_shortlist_days: number;
  };
  job_performance: Array<{
    id: string;
    title: string;
    views: number;
    applications: number;
    conversion_rate: number;
    hired: number;
    is_active: boolean;
  }>;
  trends: {
    weekly_applications: Array<{ week: string; count: number }>;
    weekly_hires: Array<{ week: string; count: number }>;
  };
  overview: {
    total_applications: number;
    total_hires: number;
    hire_rate: number;
    active_jobs: number;
    avg_match_score: number;
  };
}

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return count;
}

/* ─── Processing Steps ─── */
const PROCESSING_STEPS = [
  'Analyzing applications...',
  'Calculating conversion rates...',
  'Mapping hiring funnel...',
  'Computing time metrics...',
  'Building your insights...',
];

/* ─── Animation Variants ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

/* ─── Score Ring (circular progress) ─── */
function CircularProgress({ value, size = 52, strokeWidth = 3 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const colors = getTemperatureColors(value);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={colors.primary} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{Math.round(value)}%</span>
      </div>
    </div>
  );
}

/* ─── Overview Stat Card ─── */
function OverviewCard({ label, value, suffix, icon, color, ring }: {
  label: string; value: number; suffix?: string; icon: string; color: string;
  ring?: boolean;
}) {
  const animated = useCountUp(ring ? 0 : value);
  const colorMap: Record<string, { text: string; bg: string; icon: string }> = {
    blue: { text: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5', icon: 'bg-blue-500/15' },
    green: { text: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5', icon: 'bg-emerald-500/15' },
    purple: { text: 'text-purple-400', bg: 'from-purple-500/10 to-purple-600/5', icon: 'bg-purple-500/15' },
    amber: { text: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5', icon: 'bg-amber-500/15' },
    cyan: { text: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-600/5', icon: 'bg-cyan-500/15' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, scale: 1.02, transition: springSnappy }}
      className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-5 relative overflow-hidden cursor-default"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} opacity-50`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg ${c.icon} flex items-center justify-center`}>
            <Icon icon={icon} className={`w-5 h-5 ${c.text}`} />
          </div>
          {ring && <CircularProgress value={value} />}
        </div>
        {!ring && (
          <div className={`text-2xl font-bold ${c.text}`}>
            {animated}{suffix || ''}
          </div>
        )}
        {ring && (
          <div className={`text-2xl font-bold ${c.text}`}>
            {Math.round(value)}{suffix || ''}
          </div>
        )}
        <div className="text-sm text-white/50 mt-1">{label}</div>
      </div>
    </motion.div>
  );
}

/* ─── Funnel Stage ─── */
const FUNNEL_STAGES = [
  { key: 'applied', label: 'Applied', color: 'from-blue-500 to-blue-600' },
  { key: 'reviewed', label: 'Reviewed', color: 'from-sky-500 to-sky-600' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'from-cyan-500 to-cyan-600' },
  { key: 'interview', label: 'Interview', color: 'from-teal-500 to-teal-600' },
  { key: 'offered', label: 'Offered', color: 'from-emerald-500 to-emerald-600' },
  { key: 'hired', label: 'Hired', color: 'from-green-500 to-amber-500' },
] as const;

/* ─── Time Metric Card ─── */
function TimeCard({ label, days, icon }: { label: string; days: number; icon: string }) {
  const animated = useCountUp(Math.round(days * 10)) / 10;
  const color = days === 0 ? 'text-white/30' : days <= 3 ? 'text-emerald-400' : days <= 7 ? 'text-amber-400' : 'text-red-400';
  const bgColor = days === 0 ? 'bg-white/5' : days <= 3 ? 'bg-emerald-500/10' : days <= 7 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const barColor = days === 0 ? 'bg-white/10' : days <= 3 ? 'bg-emerald-500' : days <= 7 ? 'bg-amber-500' : 'bg-red-500';
  const barWidth = days === 0 ? 0 : Math.min((days / 30) * 100, 100);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3, scale: 1.02, transition: springSnappy }}
      className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-5 relative overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon icon={icon} className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-white/50">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {days === 0 ? '--' : animated.toFixed(1)}
        {days > 0 && <span className="text-sm font-normal text-white/30 ml-1">days</span>}
      </div>
      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─── */
export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [processingStep, setProcessingStep] = useState(0);
  const [sortCol, setSortCol] = useState<'views' | 'applications' | 'conversion_rate' | 'hired'>('applications');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Processing animation
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProcessingStep(prev => prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      // Get recruiter name
      const { data: rec } = await supabase
        .from('recruiters')
        .select('company_name')
        .eq('user_id', user.id)
        .single();
      if (rec) setUserName(rec.company_name || '');

      const res = await fetch('/api/recruiter/analytics');
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || 'Failed to load analytics');
        setLoading(false);
        return;
      }

      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  // Sorting for job performance
  const sortedJobs = data?.job_performance
    ? [...data.job_performance].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
      })
    : [];

  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => (
    <Icon
      icon={sortCol === col
        ? sortDir === 'desc' ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'
        : 'solar:sort-vertical-linear'}
      className={`w-3.5 h-3.5 ${sortCol === col ? 'text-blue-400' : 'text-white/20'}`}
    />
  );

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <DashboardLayout role="recruiter" userName={userName || undefined}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Pulsing orb */}
            <motion.div
              className="relative w-24 h-24 mb-8"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 blur-xl" />
              <motion.div
                className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600/40 to-indigo-600/40"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon icon="solar:chart-2-bold" className="w-10 h-10 text-blue-400" />
              </div>
            </motion.div>

            <motion.h2
              className="text-xl font-semibold text-white mb-4"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Crunching your hiring data...
            </motion.h2>

            <AnimatePresence mode="wait">
              <motion.p
                key={processingStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-blue-300/60"
              >
                {PROCESSING_STEPS[processingStep]}
              </motion.p>
            </AnimatePresence>

            <div className="mt-6 h-1 bg-white/10 rounded-full overflow-hidden w-64">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                initial={{ width: '5%' }}
                animate={{ width: `${Math.min(95, ((processingStep + 1) / PROCESSING_STEPS.length) * 100)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>

            {/* Temperature background shift */}
            <motion.div
              className="fixed inset-0 pointer-events-none z-0"
              animate={{
                background: [
                  'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)',
                  'radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, transparent 70%)',
                  'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <DashboardLayout role="recruiter" userName={userName || undefined}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="p-6 bg-red-500/10 ring-1 ring-red-500/20 rounded-xl inline-block">
            <Icon icon="solar:danger-triangle-bold" className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ─── Empty State ─── */
  if (!data || data.overview.total_applications === 0) {
    return (
      <DashboardLayout role="recruiter" userName={userName || undefined}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSmooth}
          >
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Icon icon="solar:chart-2-bold" className="w-10 h-10 text-blue-400/60" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">No hiring data yet</h2>
            <p className="text-white/40 max-w-md mx-auto mb-8">
              Post a job and start receiving applications to unlock powerful hiring analytics and insights.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/dashboard/recruiter/post-job"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
              >
                <Icon icon="solar:add-circle-bold" className="w-5 h-5" />
                Post Your First Job
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const { funnel, time_metrics, trends, overview } = data;
  const funnelTotal = Math.max(funnel.applied + funnel.reviewed + funnel.shortlisted + funnel.interview + funnel.offered + funnel.hired, 1);

  // Cumulative funnel: each stage = count at that stage + all later stages
  const funnelData = FUNNEL_STAGES.map(stage => {
    const count = funnel[stage.key as keyof typeof funnel];
    return { ...stage, count };
  });

  // Max for bar scaling
  const maxFunnelCount = Math.max(...funnelData.map(s => s.count), 1);

  // Max for trends chart
  const maxWeeklyApp = Math.max(...trends.weekly_applications.map(w => w.count), 1);
  const maxWeeklyHire = Math.max(...trends.weekly_hires.map(w => w.count), 1);
  const maxWeekly = Math.max(maxWeeklyApp, maxWeeklyHire, 1);

  // Match score temperature
  const matchColors = getTemperatureColors(overview.avg_match_score);

  return (
    <DashboardLayout role="recruiter" userName={userName || undefined}>
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ── */}
        <motion.div variants={staggerItem} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Hiring Analytics</h1>
              <p className="text-sm text-white/40 mt-1">
                Insights from your hiring pipeline
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg ring-1 ring-white/10">
              <Icon icon="solar:calendar-linear" className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/50">Last 12 weeks</span>
            </div>
          </div>
        </motion.div>

        {/* ── Overview Cards ── */}
        <motion.div variants={staggerContainer} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <OverviewCard label="Total Applications" value={overview.total_applications} icon="solar:inbox-in-bold" color="blue" />
          <OverviewCard label="Total Hires" value={overview.total_hires} icon="solar:user-check-bold" color="green" />
          <OverviewCard label="Hire Rate" value={overview.hire_rate} suffix="%" icon="solar:graph-up-bold" color="purple" ring />
          <OverviewCard label="Active Jobs" value={overview.active_jobs} icon="solar:case-round-bold" color="amber" />
          <OverviewCard
            label="Avg Match Score"
            value={overview.avg_match_score}
            icon="solar:stars-bold"
            color={overview.avg_match_score >= 75 ? 'green' : overview.avg_match_score >= 50 ? 'amber' : 'cyan'}
          />
        </motion.div>

        {/* ── Hiring Funnel ── */}
        <motion.div variants={staggerItem} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Icon icon="solar:filter-bold" className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Hiring Funnel</h2>
            <span className="text-xs text-white/30 ml-auto">
              {funnel.rejected} rejected
            </span>
          </div>

          <div className="space-y-3">
            {funnelData.map((stage, i) => {
              const prevCount = i > 0 ? funnelData[i - 1].count : funnelTotal;
              const dropoff = prevCount > 0 && i > 0
                ? Math.round((stage.count / prevCount) * 100)
                : 100;
              const barPct = (stage.count / maxFunnelCount) * 100;

              return (
                <div key={stage.key} className="flex items-center gap-4">
                  <div className="w-24 sm:w-28 text-sm text-white/60 text-right flex-shrink-0">
                    {stage.label}
                  </div>
                  <div className="flex-1 h-9 bg-white/[0.03] rounded-lg overflow-hidden relative">
                    <motion.div
                      className={`h-full rounded-lg bg-gradient-to-r ${stage.color} relative`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(barPct, 2)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                    </motion.div>
                    <div className="absolute inset-y-0 left-3 flex items-center">
                      <motion.span
                        className="text-sm font-semibold text-white drop-shadow-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        {stage.count}
                      </motion.span>
                    </div>
                  </div>
                  <div className="w-14 text-right flex-shrink-0">
                    {i > 0 ? (
                      <span className={`text-xs font-medium ${
                        dropoff >= 70 ? 'text-emerald-400' : dropoff >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {dropoff}%
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">--</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Time Metrics ── */}
        <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <TimeCard
            label="Avg Time to First Review"
            days={time_metrics.avg_time_to_first_review_days}
            icon="solar:eye-bold"
          />
          <TimeCard
            label="Avg Time to Shortlist"
            days={time_metrics.avg_time_to_shortlist_days}
            icon="solar:star-bold"
          />
          <TimeCard
            label="Avg Time to Hire"
            days={time_metrics.avg_time_to_hire_days}
            icon="solar:user-check-bold"
          />
        </motion.div>

        {/* ── Weekly Trends ── */}
        <motion.div variants={staggerItem} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Icon icon="solar:graph-up-bold" className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Weekly Trends</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-white/40">Applications</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-white/40">Hires</span>
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex items-end gap-1.5 sm:gap-2 h-44">
            {trends.weekly_applications.map((week, i) => {
              const appHeight = (week.count / maxWeekly) * 100;
              const hireCount = trends.weekly_hires[i]?.count || 0;
              const hireHeight = (hireCount / maxWeekly) * 100;

              return (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/60 mb-1 whitespace-nowrap">
                    {week.count} / {hireCount}
                  </div>
                  <div className="flex items-end gap-0.5 flex-1 w-full justify-center">
                    {/* Application bar */}
                    <motion.div
                      className="bg-blue-500/80 rounded-t w-[45%] min-h-[2px] relative group/bar"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(appHeight, 1.5)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                      whileHover={{ backgroundColor: 'rgba(59,130,246,1)' }}
                    />
                    {/* Hire bar */}
                    <motion.div
                      className="bg-emerald-500/80 rounded-t w-[45%] min-h-[2px]"
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(hireHeight, hireCount > 0 ? 3 : 0)}%` }}
                      transition={{ duration: 0.6, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                      whileHover={{ backgroundColor: 'rgba(16,185,129,1)' }}
                    />
                  </div>
                  {/* Week label */}
                  <span className="text-[9px] sm:text-[10px] text-white/30 truncate w-full text-center mt-1">
                    {week.week}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Job Performance Table ── */}
        <motion.div variants={staggerItem} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Icon icon="solar:case-round-bold" className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Job Performance</h2>
            <span className="text-xs text-white/30 ml-auto">{sortedJobs.length} jobs</span>
          </div>

          {sortedJobs.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No jobs posted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_70px_80px] gap-2 px-6 py-3 border-b border-white/[0.04] text-xs text-white/40 min-w-[600px]">
                <span>Job Title</span>
                <button onClick={() => handleSort('views')} className="flex items-center gap-1 hover:text-white/60 transition-colors text-right justify-end">
                  Views <SortIcon col="views" />
                </button>
                <button onClick={() => handleSort('applications')} className="flex items-center gap-1 hover:text-white/60 transition-colors text-right justify-end">
                  Applications <SortIcon col="applications" />
                </button>
                <button onClick={() => handleSort('conversion_rate')} className="flex items-center gap-1 hover:text-white/60 transition-colors text-right justify-end">
                  Conversion <SortIcon col="conversion_rate" />
                </button>
                <button onClick={() => handleSort('hired')} className="flex items-center gap-1 hover:text-white/60 transition-colors text-right justify-end">
                  Hired <SortIcon col="hired" />
                </button>
                <span className="text-right">Status</span>
              </div>

              {/* Table rows */}
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {sortedJobs.map((job) => (
                  <motion.div key={job.id} variants={staggerItem}>
                    <div
                      className="grid grid-cols-[1fr_80px_100px_100px_70px_80px] gap-2 px-6 py-3.5 border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors min-w-[600px]"
                      onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon
                          icon={expandedJob === job.id ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'}
                          className="w-3.5 h-3.5 text-white/20 flex-shrink-0"
                        />
                        <span className="text-sm text-white truncate">{job.title}</span>
                      </div>
                      <span className="text-sm text-white/60 text-right">{job.views.toLocaleString()}</span>
                      <span className="text-sm text-white/60 text-right">{job.applications}</span>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          job.conversion_rate >= 10 ? 'bg-emerald-500/15 text-emerald-400' :
                          job.conversion_rate >= 5 ? 'bg-amber-500/15 text-amber-400' :
                          'bg-white/5 text-white/40'
                        }`}>
                          {job.conversion_rate}%
                        </span>
                      </div>
                      <span className="text-sm text-white/60 text-right">{job.hired}</span>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          job.is_active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-white/5 text-white/40'
                        }`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded row */}
                    <AnimatePresence>
                      {expandedJob === job.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={springBouncy}
                          className="overflow-hidden"
                        >
                          <div className="px-6 py-4 bg-white/[0.01] border-b border-white/[0.04]">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">View-to-Apply</p>
                                <p className="text-sm font-medium text-white">{job.conversion_rate}%</p>
                                <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(job.conversion_rate * 5, 100)}%` }}
                                    transition={{ duration: 0.8 }}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Applicants</p>
                                <p className="text-sm font-medium text-white">{job.applications}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Hire Rate</p>
                                <p className="text-sm font-medium text-white">
                                  {job.applications > 0 ? Math.round((job.hired / job.applications) * 100) : 0}%
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Hires</p>
                                <p className="text-sm font-medium text-emerald-400">{job.hired}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Link
                                href={`/dashboard/recruiter/jobs/${job.id}`}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Job Details
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
