'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import type { Recruiter, CountryCode } from '@/types';

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

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Consulting', 'Legal', 'Media', 'Real Estate', 'Energy',
  'Agriculture', 'Transportation', 'Hospitality', 'Nonprofit', 'Government', 'Other',
];

export default function RecruiterProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [cultureTags, setCultureTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data } = await supabase
        .from('recruiters')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!data) { router.push('/dashboard/recruiter/onboarding'); return; }

      const r = data as unknown as Recruiter;
      setCompanyName(r.company_name);
      setWebsite(r.company_website || '');
      setIndustry(r.industry);
      setCompanySize(r.company_size);
      setCountry(r.country);
      setCity(r.city || '');
      setBio(r.bio || '');
      setCultureTags(r.culture_tags || []);
      setLogoUrl(r.company_logo_url || '');
      setLoading(false);
    }
    load();
  }, []);

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !cultureTags.includes(trimmed)) {
      setCultureTags([...cultureTags, trimmed]);
      setNewTag('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('recruiters')
      .update({
        company_name: companyName,
        company_website: website || null,
        industry,
        company_size: companySize,
        country,
        city: city || null,
        bio: bio || null,
        culture_tags: cultureTags,
        company_logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) setError('Failed to save');
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

  return (
    <DashboardLayout role="recruiter">
      <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Company Profile</h1>
            <button onClick={() => router.push('/dashboard/recruiter')} className="text-sm text-white/60 hover:text-white">
              Back to Dashboard
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-sm">Profile saved!</div>}

          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 space-y-6">
            <div className="flex justify-center">
              <AvatarUpload
                bucket="logos"
                currentUrl={logoUrl}
                onUpload={setLogoUrl}
                shape="square"
                size={96}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Company Name</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Website</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Industry</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Company Size</label>
                <select value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500">
                  {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map(s =>
                    <option key={s} value={s}>{s} employees</option>)}
                </select>
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

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">About</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Culture Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {cultureTags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm rounded-full flex items-center gap-1">
                    {tag}
                    <button onClick={() => setCultureTags(cultureTags.filter(t => t !== tag))} className="text-purple-500 hover:text-purple-300">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag..." className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm" />
                <button onClick={addTag} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Add</button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => router.push('/dashboard/recruiter')}
                className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5">Cancel</button>
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
