'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import type { Candidate, CountryCode } from '@/types';

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

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [remotePreference, setRemotePreference] = useState<string>('any');
  const [visaStatus, setVisaStatus] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [cvParsedAt, setCvParsedAt] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState('');
  const [cvSuccess, setCvSuccess] = useState('');
  const cvInputRef = useRef<HTMLInputElement>(null);

  const handleCvUpload = useCallback(async (file: File) => {
    setCvUploading(true);
    setCvError('');
    setCvSuccess('');
    try {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setCvError(data.error || 'Upload failed');
        setCvUploading(false);
        return;
      }
      // Update local state with parsed data
      if (data.parsed) {
        const p = data.parsed;
        if (p.full_name) setFullName(p.full_name);
        if (p.headline) setHeadline(p.headline);
        if (p.bio) setBio(p.bio);
        if (p.skills?.length) setSkills(p.skills);
      }
      if (data.cv_url) setCvUrl(data.cv_url);
      setCvParsedAt(new Date().toISOString());
      setCvSuccess('CV uploaded and parsed! Review the updated fields below, then save.');
    } catch {
      setCvError('CV upload failed. Please try again.');
    } finally {
      setCvUploading(false);
    }
  }, []);

  const handleCvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleCvUpload(file);
  }, [handleCvUpload]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!data) { router.push('/dashboard/candidate/onboarding'); return; }

      const c = data as unknown as Candidate;
      setCandidate(c);
      setFullName(c.full_name);
      setHeadline(c.headline || '');
      setBio(c.bio || '');
      setSkills(c.skills || []);
      setCountry(c.country);
      setCity(c.city || '');
      setRemotePreference(c.remote_preference);
      setVisaStatus(c.visa_status || '');
      setSalaryMin(c.salary_expectation_min?.toString() || '');
      setSalaryMax(c.salary_expectation_max?.toString() || '');
      setIsPublic(c.is_public);
      setPhotoUrl(c.photo_url || '');
      setCvUrl((data as Record<string, unknown>).cv_url as string || '');
      setCvParsedAt((data as Record<string, unknown>).cv_parsed_at as string || '');
      setLoading(false);
    }
    load();
  }, []);

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        full_name: fullName,
        headline,
        bio,
        skills,
        country,
        city,
        remote_preference: remotePreference,
        visa_status: visaStatus || null,
        salary_expectation_min: salaryMin ? parseInt(salaryMin) : null,
        salary_expectation_max: salaryMax ? parseInt(salaryMax) : null,
        is_public: isPublic,
        photo_url: photoUrl || null,
        match_tags: skills.map(s => s.toLowerCase()),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      setError('Failed to save');
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

  return (
    <DashboardLayout role="candidate" userName={candidate?.full_name}>
      <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
            <button
              onClick={() => router.push('/dashboard/candidate')}
              className="text-sm text-white/60 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-sm">Profile saved!</div>}

          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-center">
              <AvatarUpload
                bucket="avatars"
                currentUrl={photoUrl}
                onUpload={setPhotoUrl}
                shape="circle"
                size={96}
              />
            </div>

            {/* CV Upload / Re-upload */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Resume / CV</label>
              {cvError && <div className="mb-2 p-2 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-xs">{cvError}</div>}
              {cvSuccess && <div className="mb-2 p-2 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-xs">{cvSuccess}</div>}

              {cvUrl && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.06]">
                  <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">Current CV uploaded</p>
                    {cvParsedAt && (
                      <p className="text-xs text-white/40">Parsed {new Date(cvParsedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 shrink-0">View</a>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${cvUploading ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10 hover:border-blue-400/40 hover:bg-blue-500/[0.02]'}`}
                onDrop={handleCvDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => cvInputRef.current?.click()}
              >
                {cvUploading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-blue-400 font-medium">Parsing your CV with AI...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-white/60">
                      {cvUrl ? 'Drop a new CV to update, or click to browse' : 'Drop your CV here, or click to browse'}
                    </p>
                    <p className="text-xs text-white/30 mt-1">PDF, DOCX, or TXT (max 10MB)</p>
                  </>
                )}
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCvUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Headline</label>
                <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full flex items-center gap-1">
                    {skill}
                    <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="text-blue-500 hover:text-blue-300">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add skill..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" />
                <button onClick={addSkill} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm">Add</button>
              </div>
            </div>

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
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Work Preference</label>
                <select value={remotePreference} onChange={(e) => setRemotePreference(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Visa Status</label>
                <select value={visaStatus} onChange={(e) => setVisaStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  <option value="">Select...</option>
                  <option value="citizen">Citizen</option>
                  <option value="permanent_resident">Permanent Resident</option>
                  <option value="work_visa">Work Visa</option>
                  <option value="needs_sponsorship">Needs Sponsorship</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Min Salary Expectation</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Max Salary Expectation</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500" placeholder="80000" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-400 rounded border-white/10" />
              <label htmlFor="isPublic" className="text-sm text-white/70">
                Make my profile visible to recruiters
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => router.push('/dashboard/candidate')}
                className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
    </DashboardLayout>
  );
}
