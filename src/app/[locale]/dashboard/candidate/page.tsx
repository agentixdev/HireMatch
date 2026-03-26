'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import type { Candidate, Application } from '@/types';

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

      // Load applications with job titles
      const { data: apps } = await supabase
        .from('applications')
        .select('*, job:jobs(title)')
        .eq('candidate_id', cand.id)
        .order('created_at', { ascending: false });

      if (apps) setApplications(apps as unknown as typeof applications);

      // Count matches
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', cand.id);

      setMatchCount(count || 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

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

  return (
    <DashboardLayout role="candidate" userName={candidate?.full_name}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Summary */}
          <div className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6 mb-8">
            <div className="flex items-start gap-6">
              {candidate?.photo_url ? (
                <img src={candidate.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-400">
                  {candidate?.full_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{candidate?.full_name}</h1>
                {candidate?.headline && (
                  <p className="text-white/60 mt-1">{candidate.headline}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {candidate?.skills?.slice(0, 8).map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                  {(candidate?.skills?.length || 0) > 8 && (
                    <span className="px-3 py-1 bg-transparent text-white/50 text-sm rounded-full">
                      +{(candidate?.skills?.length || 0) - 8} more
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/candidate/profile')}
                className="px-4 py-2 text-sm font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/5"
              >
                {t('editProfile')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6">
              <div className="text-3xl font-bold text-blue-400">{applications.length}</div>
              <div className="text-sm text-white/50 mt-1">{t('myApplications')}</div>
            </div>
            <div className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6">
              <div className="text-3xl font-bold text-purple-400">{matchCount}</div>
              <div className="text-sm text-white/50 mt-1">{t('matchedJobs')}</div>
            </div>
            <div className="bg-[#0F172A] rounded-xl ring-1 ring-white/10 p-6">
              <div className="text-3xl font-bold text-green-400">
                {applications.filter(a => ['shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'].includes(a.status)).length}
              </div>
              <div className="text-sm text-white/50 mt-1">In Progress</div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-[#0F172A] rounded-xl ring-1 ring-white/10">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">{t('myApplications')}</h2>
            </div>
            {applications.length === 0 ? (
              <div className="p-12 text-center text-white/50">
                <p className="text-lg">No applications yet</p>
                <button
                  onClick={() => router.push('/jobs')}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {applications.map((app) => (
                  <div key={app.id} className="px-6 py-4 flex items-center justify-between hover:bg-transparent">
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
    </DashboardLayout>
  );
}
