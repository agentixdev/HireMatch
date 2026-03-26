'use client';

import { useEffect, useState } from 'react';
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

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  applied: { color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Applied' },
  reviewed: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', label: 'Reviewed' },
  shortlisted: { color: 'text-purple-400', bg: 'bg-purple-500/15', label: 'Shortlisted' },
  interview_scheduled: { color: 'text-indigo-400', bg: 'bg-indigo-500/15', label: 'Interview' },
  interview_completed: { color: 'text-indigo-400', bg: 'bg-indigo-500/15', label: 'Interviewed' },
  offer_extended: { color: 'text-green-400', bg: 'bg-green-500/15', label: 'Offer' },
  offer_accepted: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Accepted' },
  hired: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Hired!' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Rejected' },
  withdrawn: { color: 'text-white/50', bg: 'bg-white/5', label: 'Withdrawn' },
};

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

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);
  const statusCounts = apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  if (loading) return <DashboardLayout role="candidate"><div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout role="candidate" userName={userName}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">My Applications</h1>
          <span className="text-sm text-white/40">{apps.length} total</span>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === 'all' ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30' : 'text-white/40 hover:text-white/60 bg-white/5'}`}
          >All ({apps.length})</button>
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status] || { color: 'text-white/50', bg: 'bg-white/5', label: status };
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === status ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30` : 'text-white/40 hover:text-white/60 bg-white/5'}`}
              >{cfg.label} ({count})</button>
            );
          })}
        </div>

        {/* Applications list */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center"
          >
            <p className="text-lg text-white/50 mb-4">No applications yet</p>
            <Link href="/jobs" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 inline-block">
              Browse Jobs
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((app, i) => {
                const cfg = STATUS_CONFIG[app.status] || { color: 'text-white/50', bg: 'bg-white/5', label: app.status };
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: i * 0.05 }}
                    className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 flex items-center justify-between hover:ring-white/20 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <Link href={app.job ? `/jobs/${app.job.id}` : '#'} className="text-white font-medium hover:text-blue-400 transition-colors">
                        {app.job?.title || 'Job'}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        {app.job?.city && <span>{app.job.city}</span>}
                        {app.job?.work_mode && <span className="capitalize">{app.job.work_mode}</span>}
                        <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.match_score && (
                        <span className="text-sm font-medium text-blue-400">{app.match_score}%</span>
                      )}
                      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
