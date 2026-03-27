'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import type { Recruiter, Job } from '@/types';

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
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

/* ─── Tier theme config ─── */
const tierThemes: Record<string, { badge: string; glow: string; gradient: string; accent: string }> = {
  free: { badge: 'bg-white/5 text-white/60', glow: '', gradient: 'from-white/5 to-transparent', accent: 'text-white/60' },
  pro: { badge: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30', glow: 'shadow-blue-500/10', gradient: 'from-blue-600/8 via-transparent to-indigo-600/5', accent: 'text-blue-400' },
  enterprise: { badge: 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30', glow: 'shadow-purple-500/10', gradient: 'from-purple-600/8 via-transparent to-pink-600/5', accent: 'text-purple-400' },
  agency: { badge: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30', glow: 'shadow-amber-500/10', gradient: 'from-amber-600/8 via-transparent to-orange-600/5', accent: 'text-amber-400' },
};

/* ─── Stat Card ─── */
function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const animatedValue = useCountUp(value);
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 from-blue-500/10 to-blue-600/5',
    purple: 'text-purple-400 from-purple-500/10 to-purple-600/5',
    green: 'text-green-400 from-green-500/10 to-green-600/5',
  };
  return (
    <motion.div
      variants={statVariants}
      whileHover={{ y: -2, scale: 1.02 }}
      className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 relative overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]?.split(' ').slice(1).join(' ')} opacity-50`} />
      <div className="relative">
        <div className={`text-3xl font-bold ${colorMap[color]?.split(' ')[0]}`}>{animatedValue}</div>
        <div className="text-sm text-white/50 mt-1">{label}</div>
      </div>
    </motion.div>
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      const { data: rec } = await supabase
        .from('recruiters')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!rec) { router.push('/dashboard/recruiter/onboarding'); return; }
      setRecruiter(rec as unknown as Recruiter);

      const { data: jobList } = await supabase
        .from('jobs')
        .select('*')
        .eq('recruiter_id', rec.id)
        .order('created_at', { ascending: false });

      const typedJobs = (jobList || []) as unknown as Job[];
      setJobs(typedJobs);

      const activeJobs = typedJobs.filter(j => j.is_active).length;
      const totalApplicants = typedJobs.reduce((sum, j) => sum + j.applications_count, 0);

      const { count: shortlisted } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('recruiter_id', rec.id)
        .in('status', ['shortlisted', 'interview_scheduled', 'interview_completed']);

      setStats({ totalApplicants, activeJobs, shortlisted: shortlisted || 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="recruiter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const tierLimits: Record<string, { jobs: number; views: number }> = {
    free: { jobs: 3, views: 10 },
    pro: { jobs: Infinity, views: Infinity },
    enterprise: { jobs: Infinity, views: Infinity },
    agency: { jobs: Infinity, views: Infinity },
  };

  const tier = recruiter?.tier || 'free';
  const theme = tierThemes[tier] || tierThemes.free;
  const limits = tierLimits[tier];
  const canPostJob = tier !== 'free' || jobs.length < limits.jobs;

  return (
    <DashboardLayout role="recruiter" userName={recruiter?.company_name}>
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Company Header */}
        <motion.div variants={cardVariants} className={`bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 mb-8 relative overflow-hidden ${theme.glow ? `shadow-lg ${theme.glow}` : ''}`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {recruiter?.company_logo_url ? (
                <motion.img
                  src={recruiter.company_logo_url}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                />
              ) : (
                <motion.div
                  className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-500/20"
                  whileHover={{ scale: 1.08, rotate: -5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {recruiter?.company_name?.charAt(0) || '?'}
                </motion.div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{recruiter?.company_name || 'Your Company'}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <motion.span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${theme.badge}`}
                    whileHover={{ scale: 1.08 }}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                  </motion.span>
                  {tier === 'free' && (
                    <span className="text-sm text-white/50">
                      {t('viewsRemaining', { count: recruiter?.candidate_views_remaining ?? 0 })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                onClick={() => router.push('/dashboard/recruiter/profile')}
                className="px-4 py-2 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                {t('companyProfile')}
              </motion.button>
              {canPostJob ? (
                <motion.button
                  onClick={() => router.push('/dashboard/recruiter/post-job')}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20"
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  {t('postJob')}
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => router.push('/pricing')}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg shadow-purple-500/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {t('upgradeToPro')}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard value={stats.activeJobs} label="Active Jobs" color="blue" />
          <StatCard value={stats.totalApplicants} label="Total Applicants" color="purple" />
          <StatCard value={stats.shortlisted} label="In Pipeline" color="green" />
        </motion.div>

        {/* Jobs List */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{t('myJobs')}</h2>
            {tier === 'free' && (
              <span className="text-sm text-white/50">{jobs.length}/{limits.jobs} jobs used</span>
            )}
          </div>
          {jobs.length === 0 ? (
            <motion.div
              className="p-12 text-center text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-lg">No jobs posted yet</p>
              <p className="text-sm text-white/30 mt-1">Start attracting top talent</p>
              <motion.button
                onClick={() => router.push('/dashboard/recruiter/post-job')}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
                whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                Post Your First Job
              </motion.button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="divide-y divide-white/[0.04]">
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={listItemVariants}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)', x: 4 }}
                  className="px-6 py-4 flex items-center justify-between cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/recruiter/jobs/${job.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{job.title}</span>
                      {!job.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-full">Inactive</span>
                      )}
                      {job.is_featured && (
                        <motion.span
                          className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full"
                          animate={{ boxShadow: ['0 0 0 0 rgba(245,158,11,0)', '0 0 0 4px rgba(245,158,11,0.15)', '0 0 0 0 rgba(245,158,11,0)'] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
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
      </motion.div>
    </DashboardLayout>
  );
}
