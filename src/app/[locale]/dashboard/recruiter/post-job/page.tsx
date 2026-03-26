'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import type { CountryCode, JobType, WorkMode } from '@/types';

const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: 'us', name: 'United States' }, { code: 'ca', name: 'Canada' },
  { code: 'gb', name: 'United Kingdom' }, { code: 'ch', name: 'Switzerland' },
  { code: 'de', name: 'Germany' }, { code: 'fr', name: 'France' },
  { code: 'es', name: 'Spain' }, { code: 'it', name: 'Italy' },
  { code: 'nl', name: 'Netherlands' }, { code: 'be', name: 'Belgium' },
  { code: 'at', name: 'Austria' }, { code: 'pt', name: 'Portugal' },
  { code: 'ie', name: 'Ireland' }, { code: 'se', name: 'Sweden' },
  { code: 'dk', name: 'Denmark' }, { code: 'no', name: 'Norway' },
  { code: 'fi', name: 'Finland' }, { code: 'pl', name: 'Poland' },
  { code: 'cz', name: 'Czech Republic' }, { code: 'ro', name: 'Romania' },
  { code: 'in', name: 'India' }, { code: 'mx', name: 'Mexico' },
  { code: 'br', name: 'Brazil' }, { code: 'ar', name: 'Argentina' },
  { code: 'cn', name: 'China' }, { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' }, { code: 'vn', name: 'Vietnam' },
  { code: 'ph', name: 'Philippines' },
];

export default function PostJobPage() {
  const t = useTranslations('recruiter');
  const router = useRouter();
  const supabase = createClient();

  const [recruiterId, setRecruiterId] = useState('');
  const [recruiterCountry, setRecruiterCountry] = useState<CountryCode>('us');
  const [recruiterIndustry, setRecruiterIndustry] = useState('');

  // AI assist
  const [jdText, setJdText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [showAiAssist, setShowAiAssist] = useState(true);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newReq, setNewReq] = useState('');
  const [niceToHaves, setNiceToHaves] = useState<string[]>([]);
  const [newNice, setNewNice] = useState('');
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [jobType, setJobType] = useState<JobType>('full-time');
  const [workMode, setWorkMode] = useState<WorkMode>('remote');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [experienceMin, setExperienceMin] = useState('');
  const [experienceMax, setExperienceMax] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: rec } = await supabase
        .from('recruiters')
        .select('id, country, industry')
        .eq('user_id', user.id)
        .single();

      if (!rec) { router.push('/dashboard/recruiter/onboarding'); return; }
      setRecruiterId(rec.id);
      setRecruiterCountry(rec.country as CountryCode);
      setRecruiterIndustry(rec.industry);
      setCountry(rec.country as CountryCode);
    }
    load();
  }, []);

  const handleAiParse = async () => {
    if (!jdText.trim()) return;
    setParsing(true);
    setError('');

    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); setParsing(false); return; }

      const p = data.parsed;
      setTitle(p.title || title);
      setRequirements(p.requirements || []);
      setNiceToHaves(p.nice_to_haves || []);
      setSkillsRequired(p.skills_required || []);
      if (p.experience_min) setExperienceMin(String(p.experience_min));
      if (p.experience_max) setExperienceMax(String(p.experience_max));
      if (p.education_level) setEducationLevel(p.education_level);
      setDescription(jdText);
      setShowAiAssist(false);
    } catch {
      setError('AI parsing failed');
    } finally {
      setParsing(false);
    }
  };

  const addToList = (
    list: string[], setList: (v: string[]) => void,
    value: string, setValue: (v: string) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setValue('');
    }
  };

  const handleSubmit = async () => {
    if (!title) { setError('Job title is required'); return; }
    if (!description) { setError('Job description is required'); return; }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title,
        description,
        requirements,
        nice_to_haves: niceToHaves,
        skills_required: skillsRequired,
        job_type: jobType,
        work_mode: workMode,
        country,
        city: city || null,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        salary_currency: salaryCurrency,
        visa_sponsorship: visaSponsorship,
        experience_min: experienceMin ? parseInt(experienceMin) : null,
        experience_max: experienceMax ? parseInt(experienceMax) : null,
        education_level: educationLevel || null,
        industry: recruiterIndustry,
        match_tags: skillsRequired.map(s => s.toLowerCase()),
        is_active: true,
      });

    if (insertError) {
      setError('Failed to post job');
      setSaving(false);
      return;
    }

    // Increment recruiter job count (best-effort)
    const { error: rpcError } = await supabase.rpc('increment_jobs_posted', { rec_id: recruiterId });
    if (rpcError) {
      // fallback: count jobs manually
      const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('recruiter_id', recruiterId);
      await supabase.from('recruiters').update({ jobs_posted_count: count || 0 }).eq('id', recruiterId);
    }

    router.push('/dashboard/recruiter');
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">{t('postJob')}</h1>
            <button onClick={() => router.back()} className="text-sm text-white/60 hover:text-white">Cancel</button>
          </div>

          {error && <div className="mb-6 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400">{error}</div>}

          {/* AI Assist */}
          {showAiAssist && (
            <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl border border-blue-500/30 p-6 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">✨</span>
                <h2 className="font-semibold text-white">{t('aiAssist')}</h2>
              </div>
              <p className="text-sm text-white/60 mb-4">{t('parseJobDescription')}</p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-[#0F172A]"
                placeholder="Paste your full job description here and AI will extract the key details..."
              />
              <div className="flex justify-between mt-3">
                <button onClick={() => setShowAiAssist(false)} className="text-sm text-white/50 hover:text-white/70">
                  Skip — fill in manually
                </button>
                <button
                  onClick={handleAiParse}
                  disabled={parsing || !jdText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm font-medium"
                >
                  {parsing ? 'Parsing...' : 'Extract with AI'}
                </button>
              </div>
            </div>
          )}

          {/* Job Form */}
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Job Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Senior Full Stack Developer" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Describe the role, responsibilities, and what success looks like..." />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Requirements</label>
              {requirements.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="text-blue-500">•</span>
                      <span className="flex-1">{req}</span>
                      <button onClick={() => setRequirements(requirements.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400">&times;</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input type="text" value={newReq} onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList(requirements, setRequirements, newReq, setNewReq))}
                  placeholder="Add requirement..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" />
                <button onClick={() => addToList(requirements, setRequirements, newReq, setNewReq)}
                  className="px-4 py-2 bg-white/5 text-white/70 rounded-lg text-sm hover:bg-white/10">Add</button>
              </div>
            </div>

            {/* Nice to haves */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Nice to Have</label>
              {niceToHaves.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {niceToHaves.map((nice, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="text-green-400">•</span>
                      <span className="flex-1">{nice}</span>
                      <button onClick={() => setNiceToHaves(niceToHaves.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400">&times;</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input type="text" value={newNice} onChange={(e) => setNewNice(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList(niceToHaves, setNiceToHaves, newNice, setNewNice))}
                  placeholder="Add nice-to-have..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" />
                <button onClick={() => addToList(niceToHaves, setNiceToHaves, newNice, setNewNice)}
                  className="px-4 py-2 bg-white/5 text-white/70 rounded-lg text-sm hover:bg-white/10">Add</button>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Required Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skillsRequired.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full flex items-center gap-1">
                    {skill}
                    <button onClick={() => setSkillsRequired(skillsRequired.filter(s => s !== skill))} className="text-blue-500 hover:text-blue-300">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList(skillsRequired, setSkillsRequired, newSkill, setNewSkill))}
                  placeholder="Add skill..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" />
                <button onClick={() => addToList(skillsRequired, setSkillsRequired, newSkill, setNewSkill)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm hover:bg-blue-700">Add</button>
              </div>
            </div>

            {/* Job Type & Work Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Job Type</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="freelance">Freelance</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Work Mode</label>
                <select value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="New York" />
              </div>
            </div>

            {/* Salary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Min Salary</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="60000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Max Salary</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="120000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Currency</label>
                <select value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  {['USD','EUR','GBP','CHF','CAD','INR','MXN','BRL','ARS','CNY','JPY','KRW','VND','PHP','SEK','DKK','NOK','PLN','CZK','RON'].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Min Experience (years)</label>
                <input type="number" value={experienceMin} onChange={(e) => setExperienceMin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Max Experience (years)</label>
                <input type="number" value={experienceMax} onChange={(e) => setExperienceMax(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Education Level</label>
                <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  <option value="">Any</option>
                  <option value="none">No Degree Required</option>
                  <option value="bachelor">Bachelor&apos;s</option>
                  <option value="master">Master&apos;s</option>
                  <option value="phd">PhD</option>
                </select>
              </div>
            </div>

            {/* Visa Sponsorship */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="visa" checked={visaSponsorship} onChange={(e) => setVisaSponsorship(e.target.checked)}
                className="w-4 h-4 text-blue-400 rounded border-white/10" />
              <label htmlFor="visa" className="text-sm text-white/70">
                This position offers visa sponsorship
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
              <button onClick={() => router.back()}
                className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Posting...' : 'Post Job'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
