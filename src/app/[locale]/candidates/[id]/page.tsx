import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import type { Candidate } from '@/types';

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!data) notFound();

  const candidate = data as unknown as Candidate;

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Profile Header */}
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
            <div className="flex items-start gap-6">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt="" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center text-3xl font-bold text-blue-400">
                  {candidate.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{candidate.full_name}</h1>
                {candidate.headline && (
                  <p className="text-lg text-white/60 mt-1">{candidate.headline}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                  {candidate.city && <span>{candidate.city}</span>}
                  <span className="capitalize">{candidate.country.toUpperCase()}</span>
                  <span className="capitalize">{candidate.remote_preference}</span>
                  {candidate.experience_years > 0 && (
                    <span>{candidate.experience_years} years experience</span>
                  )}
                </div>
              </div>
            </div>

            {candidate.bio && (
              <p className="mt-6 text-white/70 leading-relaxed">{candidate.bio}</p>
            )}

            {/* Skills */}
            {candidate.skills.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Work Experience */}
          {Array.isArray(candidate.work_history) && candidate.work_history.length > 0 && (
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 mt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Experience</h2>
              <div className="space-y-6">
                {candidate.work_history.map((job, i) => (
                  <div key={i} className="border-l-2 border-blue-500/30 pl-6">
                    <h3 className="font-semibold text-white">{job.title}</h3>
                    <p className="text-sm text-white/60">{job.company}</p>
                    <p className="text-sm text-white/50">
                      {job.start_date} — {job.is_current ? 'Present' : job.end_date}
                    </p>
                    {job.description && (
                      <p className="mt-2 text-sm text-white/70">{job.description}</p>
                    )}
                    {job.skills?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {job.skills.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-white/5 text-white/60 text-xs rounded-full">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {Array.isArray(candidate.education) && candidate.education.length > 0 && (
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 mt-6">
              <h2 className="text-lg font-semibold text-white mb-4">Education</h2>
              <div className="space-y-4">
                {candidate.education.map((edu, i) => (
                  <div key={i} className="border-l-2 border-purple-500/30 pl-6">
                    <h3 className="font-semibold text-white">{edu.degree} in {edu.field}</h3>
                    <p className="text-sm text-white/60">{edu.institution}</p>
                    <p className="text-sm text-white/50">{edu.start_year} — {edu.end_year || 'Present'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages & Certifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {candidate.languages?.length > 0 && (
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Languages</h2>
                <div className="flex flex-wrap gap-2">
                  {candidate.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm">{lang}</span>
                  ))}
                </div>
              </div>
            )}
            {candidate.certifications?.length > 0 && (
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Certifications</h2>
                <ul className="space-y-1">
                  {candidate.certifications.map((cert) => (
                    <li key={cert} className="text-sm text-white/70 flex items-center gap-2">
                      <span className="text-green-400">✓</span> {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
