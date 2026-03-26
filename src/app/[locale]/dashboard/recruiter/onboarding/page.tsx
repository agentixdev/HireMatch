'use client';

import { useState, useEffect } from 'react';
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

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Consulting', 'Legal', 'Media', 'Real Estate', 'Energy',
  'Agriculture', 'Transportation', 'Hospitality', 'Nonprofit', 'Government', 'Other',
];

const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+',
];

export default function RecruiterOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [cultureTags, setCultureTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/auth?mode=signin');
    }
    checkAuth();
  }, []);

  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !cultureTags.includes(trimmed)) {
      setCultureTags([...cultureTags, trimmed]);
      setNewTag('');
    }
  };

  const suggestedTags = [
    'Remote-first', 'Work-life balance', 'Fast-paced', 'Startup culture',
    'Diverse & inclusive', 'Innovation', 'Mentorship', 'Flat hierarchy',
    'Flexible hours', 'Professional growth', 'Team-oriented', 'Results-driven',
  ];

  const handleSave = async () => {
    if (!companyName) { setError('Company name is required'); return; }
    if (!industry) { setError('Please select an industry'); return; }

    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

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
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      setError('Failed to save. Please try again.');
      setSaving(false);
      return;
    }

    router.push('/dashboard/recruiter');
  };

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Set Up Your Company</h1>
            <p className="text-white/60 mt-2">Tell candidates about your company and culture.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400">{error}</div>
          )}

          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://acme.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Industry *</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Company Size</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>{size} employees</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Country</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  placeholder="San Francisco"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">About Your Company</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="What makes your company a great place to work?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Company Culture</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {cultureTags.map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm rounded-full flex items-center gap-1">
                    {tag}
                    <button onClick={() => setCultureTags(cultureTags.filter(t => t !== tag))} className="text-purple-500 hover:text-purple-300">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add culture tag..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
                />
                <button onClick={addTag} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.filter(t => !cultureTags.includes(t)).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setCultureTags([...cultureTags, tag])}
                    className="px-3 py-1 bg-white/[0.04] text-white/60 text-sm rounded-full ring-1 ring-white/[0.06] hover:bg-white/10"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
