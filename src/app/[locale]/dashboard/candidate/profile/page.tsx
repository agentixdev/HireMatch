'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';
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
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
            <button
              onClick={() => router.push('/dashboard/candidate')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Profile saved!</div>}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full flex items-center gap-1">
                    {skill}
                    <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="text-blue-400 hover:text-blue-600">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add skill..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={addSkill} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Preference</label>
                <select value={remotePreference} onChange={(e) => setRemotePreference(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Status</label>
                <select value={visaStatus} onChange={(e) => setVisaStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary Expectation</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary Expectation</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="80000" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                Make my profile visible to recruiters
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => router.push('/dashboard/candidate')}
                className="px-6 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
