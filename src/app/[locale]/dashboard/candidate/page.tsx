'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
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
    applied: 'bg-blue-100 text-blue-700',
    reviewed: 'bg-yellow-100 text-yellow-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview_scheduled: 'bg-indigo-100 text-indigo-700',
    interview_completed: 'bg-indigo-100 text-indigo-700',
    offer_extended: 'bg-green-100 text-green-700',
    offer_accepted: 'bg-green-100 text-green-700',
    hired: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-700',
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start gap-6">
              {candidate?.photo_url ? (
                <img src={candidate.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                  {candidate?.full_name?.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{candidate?.full_name}</h1>
                {candidate?.headline && (
                  <p className="text-gray-600 mt-1">{candidate.headline}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {candidate?.skills?.slice(0, 8).map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                  {(candidate?.skills?.length || 0) > 8 && (
                    <span className="px-3 py-1 bg-gray-50 text-gray-500 text-sm rounded-full">
                      +{(candidate?.skills?.length || 0) - 8} more
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/candidate/profile')}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
              >
                {t('editProfile')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-3xl font-bold text-blue-600">{applications.length}</div>
              <div className="text-sm text-gray-500 mt-1">{t('myApplications')}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-3xl font-bold text-purple-600">{matchCount}</div>
              <div className="text-sm text-gray-500 mt-1">{t('matchedJobs')}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-3xl font-bold text-green-600">
                {applications.filter(a => ['shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'].includes(a.status)).length}
              </div>
              <div className="text-sm text-gray-500 mt-1">In Progress</div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('myApplications')}</h2>
            </div>
            {applications.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg">No applications yet</p>
                <button
                  onClick={() => router.push('/jobs')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Jobs
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <div key={app.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <div className="font-medium text-gray-900">{app.job?.title || 'Job'}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.match_score && (
                        <span className="text-sm font-medium text-blue-600">
                          {app.match_score}% match
                        </span>
                      )}
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[app.status] || 'bg-gray-100 text-gray-700'}`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
