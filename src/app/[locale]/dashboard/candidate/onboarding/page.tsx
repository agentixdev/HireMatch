'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
import type { CountryCode } from '@/types';

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'be', name: 'Belgium', flag: '🇧🇪' },
  { code: 'at', name: 'Austria', flag: '🇦🇹' },
  { code: 'pt', name: 'Portugal', flag: '🇵🇹' },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪' },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰' },
  { code: 'no', name: 'Norway', flag: '🇳🇴' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱' },
  { code: 'cz', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'ro', name: 'Romania', flag: '🇷🇴' },
  { code: 'in', name: 'India', flag: '🇮🇳' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷' },
  { code: 'cn', name: 'China', flag: '🇨🇳' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷' },
  { code: 'vn', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭' },
];

type Step = 'upload' | 'review' | 'details' | 'done';

interface ParsedCV {
  full_name: string;
  headline: string;
  skills: string[];
  experience_years: number;
  education: Array<{ institution: string; degree: string; field: string; start_year: number; end_year?: number }>;
  work_history: Array<{ company: string; title: string; description: string; start_date: string; end_date?: string; is_current: boolean; skills: string[] }>;
  certifications: string[];
  languages: string[];
  bio: string;
}

export default function CandidateOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('upload');
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedCV | null>(null);
  const [error, setError] = useState('');

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [remotePreference, setRemotePreference] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [visaStatus, setVisaStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/auth?mode=signin');
    }
    checkAuth();
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('cv', file);

      const res = await fetch('/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setUploading(false);
        return;
      }

      const p = data.parsed as ParsedCV;
      setParsed(p);
      setFullName(p.full_name);
      setHeadline(p.headline);
      setBio(p.bio);
      setSkills(p.skills);
      setStep('review');
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleSkipUpload = () => {
    setStep('details');
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const updateData: Record<string, unknown> = {
        full_name: fullName,
        headline,
        bio,
        skills,
        country,
        city,
        remote_preference: remotePreference,
        visa_status: visaStatus || null,
        match_tags: skills.map(s => s.toLowerCase()),
        updated_at: new Date().toISOString(),
      };

      if (parsed) {
        updateData.education = parsed.education;
        updateData.work_history = parsed.work_history;
        updateData.certifications = parsed.certifications;
        updateData.languages = parsed.languages;
        updateData.experience_years = parsed.experience_years;
      }

      const { error: updateError } = await supabase
        .from('candidates')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        setError('Failed to save profile');
        setSaving(false);
        return;
      }

      setStep('done');
      setTimeout(() => router.push('/dashboard/candidate'), 2000);
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {['upload', 'review', 'details', 'done'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-blue-600 text-white' :
                  ['upload', 'review', 'details', 'done'].indexOf(step) > i ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {['upload', 'review', 'details', 'done'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 3 && <div className="w-12 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Upload CV */}
          {step === 'upload' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 text-center">Upload Your CV</h2>
              <p className="text-gray-600 text-center mt-2">
                Our AI will parse your resume and create your profile automatically.
              </p>

              <div
                className="mt-8 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('cv-input')?.click()}
              >
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-blue-600 font-medium">Parsing your CV with AI...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-4">📄</div>
                    <p className="text-lg font-medium text-gray-700">
                      Drag & drop your CV here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 mt-2">PDF, DOCX, or TXT (max 10MB)</p>
                  </>
                )}
                <input
                  id="cv-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={handleSkipUpload}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip — I&apos;ll fill in my profile manually
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review AI-parsed data */}
          {step === 'review' && parsed && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900">Review Your Profile</h2>
              <p className="text-gray-600 mt-2">
                Our AI extracted this from your CV. Edit anything that needs correction.
              </p>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Senior React Developer | 8 years experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {skills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full flex items-center gap-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="text-blue-400 hover:text-blue-600 ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Add a skill..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                    <button onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                      Add
                    </button>
                  </div>
                </div>

                {parsed.work_history.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                    <div className="space-y-3">
                      {parsed.work_history.map((job, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">{job.title}</div>
                          <div className="text-sm text-gray-600">{job.company} · {job.start_date} — {job.is_current ? 'Present' : job.end_date}</div>
                          {job.description && <div className="text-sm text-gray-500 mt-1">{job.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parsed.education.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                    <div className="space-y-3">
                      {parsed.education.map((edu, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-lg">
                          <div className="font-medium text-gray-900">{edu.degree} in {edu.field}</div>
                          <div className="text-sm text-gray-600">{edu.institution} · {edu.start_year} — {edu.end_year || 'Present'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setStep('upload')} className="px-6 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Re-upload
                </button>
                <button onClick={() => setStep('details')} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Looks Good — Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Additional Details */}
          {step === 'details' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900">A Few More Details</h2>
              <p className="text-gray-600 mt-2">Help us find better matches for you.</p>

              <div className="mt-8 space-y-6">
                {!parsed && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Professional Headline</label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {skills.map((skill) => (
                          <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full flex items-center gap-1">
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="text-blue-400 hover:text-blue-600 ml-1">&times;</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="Add a skill..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <button onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as CountryCode)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="San Francisco"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Preference</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['remote', 'hybrid', 'onsite', 'any'] as const).map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setRemotePreference(pref)}
                        className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-all capitalize ${
                          remotePreference === pref
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visa / Work Authorization</label>
                  <select
                    value={visaStatus}
                    onChange={(e) => setVisaStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="citizen">Citizen</option>
                    <option value="permanent_resident">Permanent Resident</option>
                    <option value="work_visa">Work Visa</option>
                    <option value="needs_sponsorship">Needs Sponsorship</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setStep(parsed ? 'review' : 'upload')} className="px-6 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !fullName}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Complete Profile'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900">Profile Created!</h2>
              <p className="text-gray-600 mt-2">
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
