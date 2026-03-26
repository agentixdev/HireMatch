'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import type { Recruiter, Job } from '@/types';

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

      // Load jobs
      const { data: jobList } = await supabase
        .from('jobs')
        .select('*')
        .eq('recruiter_id', rec.id)
        .order('created_at', { ascending: false });

      const typedJobs = (jobList || []) as unknown as Job[];
      setJobs(typedJobs);

      // Stats
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

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

  const tierLimits: Record<string, { jobs: number; views: number }> = {
    free: { jobs: 3, views: 10 },
    pro: { jobs: Infinity, views: Infinity },
    enterprise: { jobs: Infinity, views: Infinity },
    agency: { jobs: Infinity, views: Infinity },
  };

  const limits = tierLimits[recruiter?.tier || 'free'];
  const canPostJob = recruiter?.tier !== 'free' || jobs.length < limits.jobs;

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Company Header */}
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {recruiter?.company_logo_url ? (
                  <img src={recruiter.company_logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-purple-500/20 flex items-center justify-center text-2xl font-bold text-purple-400">
                    {recruiter?.company_name?.charAt(0) || '?'}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">{recruiter?.company_name || 'Your Company'}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      recruiter?.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                      recruiter?.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                      recruiter?.tier === 'agency' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-white/5 text-white/60'
                    }`}>
                      {(recruiter?.tier || 'free').charAt(0).toUpperCase() + (recruiter?.tier || 'free').slice(1)} Plan
                    </span>
                    {recruiter?.tier === 'free' && (
                      <span className="text-sm text-white/50">
                        {t('viewsRemaining', { count: recruiter.candidate_views_remaining })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard/recruiter/profile')}
                  className="px-4 py-2 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5"
                >
                  {t('companyProfile')}
                </button>
                {canPostJob ? (
                  <button
                    onClick={() => router.push('/dashboard/recruiter/post-job')}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:bg-blue-700"
                  >
                    {t('postJob')}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    {t('upgradeToPro')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-blue-400">{stats.activeJobs}</div>
              <div className="text-sm text-white/50 mt-1">Active Jobs</div>
            </div>
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-purple-400">{stats.totalApplicants}</div>
              <div className="text-sm text-white/50 mt-1">Total Applicants</div>
            </div>
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
              <div className="text-3xl font-bold text-green-400">{stats.shortlisted}</div>
              <div className="text-sm text-white/50 mt-1">In Pipeline</div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{t('myJobs')}</h2>
              {recruiter?.tier === 'free' && (
                <span className="text-sm text-white/50">{jobs.length}/{limits.jobs} jobs used</span>
              )}
            </div>
            {jobs.length === 0 ? (
              <div className="p-12 text-center text-white/50">
                <p className="text-lg">No jobs posted yet</p>
                <button
                  onClick={() => router.push('/dashboard/recruiter/post-job')}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20"
                >
                  Post Your First Job
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-transparent cursor-pointer"
                    onClick={() => router.push(`/dashboard/recruiter/jobs/${job.id}`)}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">{job.title}</span>
                        {!job.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-white/5 text-white/50 rounded-full">Inactive</span>
                        )}
                        {job.is_featured && (
                          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">Featured</span>
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
