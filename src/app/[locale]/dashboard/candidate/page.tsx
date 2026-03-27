'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import type { Candidate, Application } from '@/types';

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
      // Ease-out cubic
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

export default function CandidateDashboard() {
  const t = useTranslations('candidate');
  const router = useRouter();
  const supabase = createClient();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<(Application & { job?: { title: string; company?: string } })[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      const { data: cand } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!cand) { router.push('/dashboard/candidate/onboarding'); return; }
      setCandidate(cand as unknown as Candidate);

      const { data: apps } = await supabase
        .from('applications')
        .select('*, job:jobs(title)')
        .eq('candidate_id', cand.id)
        .order('created_at', { ascending: false });

      if (apps) setApplications(apps as unknown as typeof applications);

      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', cand.id);

      setMatchCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Skeleton loader */}
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

  const statusColors: Record<string, string> = {
    applied: 'bg-blue-500/20 text-blue-400',
    reviewed: 'bg-yellow-500/20 text-yellow-400',
    shortlisted: 'bg-purple-500/20 text-purple-400',
    interview_scheduled: 'bg-indigo-500/20 text-indigo-400',
    interview_completed: 'bg-indigo-500/20 text-indigo-400',
    offer_extended: 'bg-green-500/20 text-green-400',
    offer_accepted: 'bg-green-500/20 text-green-400',
    hired: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
    withdrawn: 'bg-white/5 text-white/70',
  };

  const inProgressCount = applications.filter(a =>
    ['shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'].includes(a.status)
  ).length;

  return (
    <DashboardLayout role="candidate" userName={candidate?.full_name}>
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Summary */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 mb-8 relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
          <div className="relative flex items-start gap-6">
            {candidate?.photo_url ? (
              <motion.img
                src={candidate.photo_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-500/30"
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            ) : (
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20"
                whileHover={{ scale: 1.08, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {candidate?.full_name?.charAt(0)}
              </motion.div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{candidate?.full_name}</h1>
              {candidate?.headline && (
                <p className="text-white/60 mt-1">{candidate.headline}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {candidate?.skills?.slice(0, 8).map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                    className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full hover:bg-blue-500/20 transition-colors cursor-default"
                  >
                    {skill}
                  </motion.span>
                ))}
                {(candidate?.skills?.length || 0) > 8 && (
                  <span className="px-3 py-1 bg-transparent text-white/50 text-sm rounded-full">
                    +{(candidate?.skills?.length || 0) - 8} more
                  </span>
                )}
              </div>
            </div>
            <motion.button
              onClick={() => router.push('/dashboard/candidate/profile')}
              className="px-4 py-2 text-sm font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
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

        {/* Applications */}
        <motion.div variants={cardVariants} className="bg-[#0F172A] rounded-xl ring-1 ring-white/10">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-lg font-semibold text-white">{t('myApplications')}</h2>
          </div>
          {applications.length === 0 ? (
            <motion.div
              className="p-12 text-center text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-lg">No applications yet</p>
              <p className="text-sm text-white/30 mt-1">Find your next opportunity</p>
              <motion.button
                onClick={() => router.push('/jobs')}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
                whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                Browse Jobs
              </motion.button>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} className="divide-y divide-white/[0.04]">
              {applications.map((app) => (
                <motion.div
                  key={app.id}
                  variants={listItemVariants}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)', x: 4 }}
                  className="px-6 py-4 flex items-center justify-between cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/candidate/applications`)}
                >
                  <div>
                    <div className="font-medium text-white">{app.job?.title || 'Job'}</div>
                    <div className="text-sm text-white/50 mt-1">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.match_score && (
                      <span className="text-sm font-medium text-blue-400">
                        {app.match_score}% match
                      </span>
                    )}
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
