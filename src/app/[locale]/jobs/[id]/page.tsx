import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import ApplyButton from '@/components/ApplyButton';
import type { Job, Recruiter } from '@/types';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('jobs')
    .select('*, recruiter:recruiters(id, company_name, company_logo_url, company_website, industry, company_size, country, city, bio, culture_tags)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!data) notFound();

  const job = data as unknown as Job & { recruiter: Recruiter };

  // Increment view count (fire-and-forget)
  supabase.from('jobs').update({ views_count: job.views_count + 1 }).eq('id', id).then(() => {});

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null;
    const fmt = (n: number) => new Intl.NumberFormat().format(n);
    const cur = currency || 'USD';
    if (min && max) return `${cur} ${fmt(min)} - ${fmt(max)}`;
    if (min) return `${cur} ${fmt(min)}+`;
    return `Up to ${cur} ${fmt(max!)}`;
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Job Header */}
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {job.recruiter?.company_logo_url ? (
                  <img src={job.recruiter.company_logo_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center text-2xl font-bold text-white/40">
                    {job.recruiter?.company_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-white">{job.title}</h1>
                  <p className="text-lg text-white/60 mt-1">{job.recruiter?.company_name}</p>
                </div>
              </div>
              <ApplyButton jobId={job.id} recruiterId={job.recruiter_id} />
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 mt-6">
              <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                {job.city ? `${job.city}, ` : ''}{job.country.toUpperCase()}
              </span>
              <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-sm rounded-full capitalize">
                {job.work_mode}
              </span>
              <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full capitalize">
                {job.job_type}
              </span>
              {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-full font-medium">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                </span>
              )}
              {job.visa_sponsorship && (
                <span className="px-3 py-1.5 bg-green-500/10 text-green-400 text-sm rounded-full">
                  Visa Sponsorship Available
                </span>
              )}
              {job.experience_min != null && (
                <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                  {job.experience_min}{job.experience_max ? `-${job.experience_max}` : '+'} years
                </span>
              )}
            </div>

            {/* Skills */}
            {job.skills_required.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-white/50 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills_required.map((skill) => (
                    <span key={skill} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
                <h2 className="text-lg font-semibold text-white mb-4">About This Role</h2>
                <div className="prose prose-gray max-w-none text-white/70 whitespace-pre-wrap">
                  {job.description}
                </div>
              </div>

              {/* Requirements */}
              {job.requirements.length > 0 && (
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-4">Requirements</h2>
                  <ul className="space-y-2">
                    {job.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/70">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Nice to haves */}
              {job.nice_to_haves.length > 0 && (
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
                  <h2 className="text-lg font-semibold text-white mb-4">Nice to Have</h2>
                  <ul className="space-y-2">
                    {job.nice_to_haves.map((nice, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/60">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{nice}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar — Company info */}
            <div className="space-y-6">
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-white mb-3">About {job.recruiter?.company_name}</h3>
                {job.recruiter?.bio && (
                  <p className="text-sm text-white/60 mb-4">{job.recruiter.bio}</p>
                )}
                <div className="space-y-2 text-sm">
                  {job.recruiter?.industry && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Industry</span>
                      <span className="text-white">{job.recruiter.industry}</span>
                    </div>
                  )}
                  {job.recruiter?.company_size && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Size</span>
                      <span className="text-white">{job.recruiter.company_size} employees</span>
                    </div>
                  )}
                  {job.recruiter?.company_website && (
                    <div className="flex justify-between">
                      <span className="text-white/50">Website</span>
                      <a href={job.recruiter.company_website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Visit
                      </a>
                    </div>
                  )}
                </div>
                {job.recruiter?.culture_tags && job.recruiter.culture_tags.length > 0 && (
                  <div className="mt-4">
                    <span className="text-xs text-white/50">Culture</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {job.recruiter.culture_tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
