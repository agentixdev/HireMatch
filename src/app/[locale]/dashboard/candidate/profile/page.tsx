'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import { motion, AnimatePresence } from 'framer-motion';
import type { Candidate, CountryCode, Education, WorkExperience } from '@/types';

/* ─── Constants ─── */

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: 'us', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ca', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'gb', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ch', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'de', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'it', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'be', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'at', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'pt', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'ie', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'se', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'dk', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'no', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'fi', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'pl', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'cz', name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'ro', name: 'Romania', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'in', name: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'mx', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'br', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'ar', name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}' },
  { code: 'cn', name: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'jp', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'kr', name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'vn', name: 'Vietnam', flag: '\u{1F1FB}\u{1F1F3}' },
  { code: 'ph', name: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}' },
];

const SKILL_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python',
  'Java', 'C#', 'Go', 'Rust', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL',
  'MongoDB', 'GraphQL', 'REST API', 'Git', 'CI/CD', 'Agile',
  'Machine Learning', 'Data Analysis', 'Figma', 'Product Management',
  'Leadership', 'SQL', 'Redis', 'Terraform', 'Swift', 'Kotlin',
];

const NOTICE_PERIODS = [
  { value: '', label: 'Not specified' },
  { value: 'immediately', label: 'Can start immediately' },
  { value: '1_week', label: '1 week' },
  { value: '2_weeks', label: '2 weeks' },
  { value: '1_month', label: '1 month' },
  { value: '2_months', label: '2 months' },
  { value: '3_months', label: '3 months+' },
];

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };

/* ─── Section Component (Progressive Disclosure) ─── */

function ProfileSection({
  title,
  icon,
  description,
  children,
  defaultOpen = false,
  badge,
  temperature,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  temperature?: 'cool' | 'warm' | 'hot';
}) {
  const [open, setOpen] = useState(defaultOpen);

  const tempBg = temperature === 'hot'
    ? 'from-green-500/[0.04] to-emerald-500/[0.02]'
    : temperature === 'warm'
    ? 'from-blue-500/[0.04] to-indigo-500/[0.02]'
    : 'from-white/[0.02] to-transparent';

  return (
    <motion.div
      layout
      className={`bg-gradient-to-br ${tempBg} ring-1 ring-white/10 rounded-xl overflow-hidden`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left group"
      >
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-blue-400 shrink-0 group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {badge}
          </div>
          {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={springTransition}
          className="text-white/30 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Completeness Ring ─── */

function CompletenessRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={c}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

/* ─── Main ─── */

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saveCount, setSaveCount] = useState(0); // micro-feedback pulse

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

  // Availability
  const [availableNow, setAvailableNow] = useState(false);
  const [noticePeriod, setNoticePeriod] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [openToRelocation, setOpenToRelocation] = useState(false);

  // CV-parsed fields
  const [experienceYears, setExperienceYears] = useState(0);
  const [education, setEducation] = useState<Education[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkExperience[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // CV upload
  const [cvUrl, setCvUrl] = useState('');
  const [cvParsedAt, setCvParsedAt] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvProcessingStage, setCvProcessingStage] = useState(-1);
  const [cvError, setCvError] = useState('');
  const [cvSuccess, setCvSuccess] = useState('');
  const cvInputRef = useRef<HTMLInputElement>(null);

  /* ─── CV Upload with dramatic processing ─── */

  const handleCvUpload = useCallback(async (file: File) => {
    setCvUploading(true);
    setCvError('');
    setCvSuccess('');
    setCvProcessingStage(0);

    // Animate stages
    const stages = ['Reading document...', 'Extracting skills...', 'Building profile...', 'Done!'];
    for (let i = 0; i < stages.length - 1; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setCvProcessingStage(i + 1);
    }

    try {
      const formData = new FormData();
      formData.append('cv', file);
      const res = await fetch('/api/parse-cv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setCvError(data.error || 'Upload failed');
        setCvUploading(false);
        setCvProcessingStage(-1);
        return;
      }
      if (data.parsed) {
        const p = data.parsed;
        if (p.full_name) setFullName(p.full_name);
        if (p.headline) setHeadline(p.headline);
        if (p.bio) setBio(p.bio);
        if (p.skills?.length) setSkills(p.skills);
        if (p.experience_years) setExperienceYears(p.experience_years);
        if (p.education?.length) setEducation(p.education);
        if (p.work_history?.length) setWorkHistory(p.work_history);
        if (p.certifications?.length) setCertifications(p.certifications);
        if (p.languages?.length) setLanguages(p.languages);
      }
      if (data.cv_url) setCvUrl(data.cv_url);
      if (data.photo_url && !photoUrl) setPhotoUrl(data.photo_url);
      setCvParsedAt(new Date().toISOString());
      setCvProcessingStage(stages.length - 1);
      await new Promise((r) => setTimeout(r, 400));
      setCvSuccess(data.photo_url ? 'CV parsed + photo extracted! Review below.' : 'CV parsed successfully! Review the updated fields below.');
    } catch {
      setCvError('CV upload failed. Please try again.');
    } finally {
      setCvUploading(false);
      setCvProcessingStage(-1);
    }
  }, []);

  const handleCvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleCvUpload(file);
  }, [handleCvUpload]);

  /* ─── Load data ─── */

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
      const raw = data as Record<string, unknown>;
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
      setCvUrl(raw.cv_url as string || '');
      setCvParsedAt(raw.cv_parsed_at as string || '');
      setAvailableNow(raw.available_now as boolean || false);
      setNoticePeriod(raw.notice_period as string || '');
      setAvailableFrom(raw.available_from as string || '');
      setOpenToRelocation(raw.open_to_relocation as boolean || false);
      setExperienceYears(c.experience_years || 0);
      setEducation(c.education || []);
      setWorkHistory(c.work_history || []);
      setCertifications(c.certifications || []);
      setLanguages(c.languages || []);
      setLoading(false);
    }
    load();
  }, []);

  /* ─── Skills ─── */

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  /* ─── Save ─── */

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
        available_now: availableNow,
        notice_period: noticePeriod || null,
        available_from: availableFrom || null,
        open_to_relocation: openToRelocation,
        experience_years: experienceYears,
        education,
        work_history: workHistory,
        certifications,
        languages,
        match_tags: skills.map(s => s.toLowerCase()),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      setError('Failed to save');
    } else {
      setSuccess(true);
      setSaveCount((c) => c + 1);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  /* ─── Completeness ─── */

  const completeness = (() => {
    let s = 0;
    if (fullName) s += 10;
    if (headline) s += 12;
    if (bio) s += 10;
    if (skills.length > 0) s += 10;
    if (skills.length >= 5) s += 8;
    if (city) s += 5;
    if (remotePreference !== 'any') s += 5;
    if (visaStatus) s += 5;
    if (photoUrl) s += 10;
    if (cvUrl) s += 10;
    if (availableNow || noticePeriod) s += 5;
    if (salaryMin || salaryMax) s += 5;
    if (isPublic) s += 5;
    if (experienceYears > 0) s += 5;
    if (education.length > 0) s += 5;
    if (workHistory.length > 0) s += 5;
    if (certifications.length > 0) s += 3;
    if (languages.length > 0) s += 2;
    return Math.min(s, 100);
  })();

  /* ─── Loading ─── */

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const processingStages = ['Reading document...', 'Extracting skills...', 'Building profile...', 'Done!'];

  return (
    <DashboardLayout role="candidate" userName={candidate?.full_name}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header with completeness */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
        >
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
            <p className="text-sm text-white/40 mt-1">
              {completeness < 50 ? 'Complete your profile to get noticed by top recruiters' :
               completeness < 80 ? 'Good progress! A few more details will boost your visibility' :
               'Your profile is looking great!'}
            </p>
          </div>
          <CompletenessRing score={completeness} />
        </motion.div>

        {/* Feedback banners */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              key={`save-${saveCount}`}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springTransition}
              className="mb-4 p-3 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 15 }}
              >
                &#10003;
              </motion.span>
              Profile saved successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {/* Section 1: Photo & Identity */}
          <ProfileSection
            title="Photo & Identity"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>}
            description="Your name, photo, and professional headline"
            defaultOpen={true}
            badge={!photoUrl ? <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-400 rounded">Add photo</span> : undefined}
          >
            <div className="space-y-5">
              <div className="flex justify-center">
                <AvatarUpload bucket="avatars" currentUrl={photoUrl} onUpload={setPhotoUrl} shape="circle" size={96} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Headline</label>
                  <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Senior React Developer | 8yr exp"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  placeholder="Tell recruiters what makes you unique..."
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none resize-none transition-all" />
              </div>
            </div>
          </ProfileSection>

          {/* Section 2: Resume / CV */}
          <ProfileSection
            title="Resume / CV"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
            description={cvUrl ? 'CV uploaded — upload a new version anytime' : 'Upload your CV for AI-powered profile building'}
            badge={cvUrl
              ? <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 rounded">Uploaded</span>
              : <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-400 rounded">Recommended</span>
            }
          >
            <div className="space-y-3">
              <AnimatePresence>
                {cvError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="p-2 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-xs">{cvError}</motion.div>
                )}
                {cvSuccess && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={springTransition}
                    className="p-2 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-xs flex items-center gap-2">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' as const, stiffness: 500, damping: 15 }}>&#10003;</motion.span>
                    {cvSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              {cvUrl && !cvUploading && (
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">Current CV</p>
                    {cvParsedAt && <p className="text-xs text-white/30">Parsed {new Date(cvParsedAt).toLocaleDateString()}</p>}
                  </div>
                  <a href={cvUrl} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 text-xs text-blue-400 ring-1 ring-blue-500/30 rounded-md hover:bg-blue-500/10 transition-colors">View</a>
                </div>
              )}

              {/* Processing reveal */}
              {cvUploading && cvProcessingStage >= 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-blue-500/[0.05] ring-1 ring-blue-500/20 rounded-lg"
                >
                  <div className="space-y-2">
                    {processingStages.map((stage, i) => (
                      <motion.div
                        key={stage}
                        initial={{ opacity: 0, x: -10 }}
                        animate={i <= cvProcessingStage ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
                        transition={{ ...springTransition, delay: i * 0.1 }}
                        className="flex items-center gap-2"
                      >
                        {i < cvProcessingStage ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring' as const, stiffness: 500, damping: 15 }}
                            className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white font-bold"
                          >&#10003;</motion.span>
                        ) : i === cvProcessingStage ? (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/10" />
                        )}
                        <span className={`text-xs ${i <= cvProcessingStage ? 'text-white/80' : 'text-white/30'}`}>{stage}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!cvUploading && (
                <div
                  className="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer border-white/10 hover:border-blue-400/40 hover:bg-blue-500/[0.02]"
                  onDrop={handleCvDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => cvInputRef.current?.click()}
                >
                  <p className="text-sm text-white/60">
                    {cvUrl ? 'Drop a new CV to update, or click to browse' : 'Drop your CV here, or click to browse'}
                  </p>
                  <p className="text-xs text-white/30 mt-1">PDF, DOCX, or TXT (max 10MB) &mdash; AI will auto-fill your profile</p>
                  <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCvUpload(f); e.target.value = ''; }} />
                </div>
              )}
            </div>
          </ProfileSection>

          {/* Section 3: Skills & Expertise */}
          <ProfileSection
            title="Skills & Expertise"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            description={`${skills.length} skill${skills.length !== 1 ? 's' : ''} added`}
            badge={skills.length < 3 ? <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 rounded">Add more</span> : undefined}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {skills.map((skill) => (
                    <motion.span
                      key={skill}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={springTransition}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-sm rounded-full flex items-center gap-1.5 ring-1 ring-blue-500/20"
                    >
                      {skill}
                      <button onClick={() => setSkills(skills.filter(s => s !== skill))}
                        className="text-blue-500/60 hover:text-blue-300 transition-colors">&times;</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Type a skill..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                <motion.button whileTap={{ scale: 0.95 }} onClick={addSkill}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20">Add</motion.button>
              </div>
              {/* Quick suggestions */}
              <div>
                <p className="text-xs text-white/30 mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 12).map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSkills([...skills, s])}
                      className="px-2 py-1 text-[11px] text-white/40 bg-white/[0.03] rounded-md ring-1 ring-white/[0.06] hover:text-blue-400 hover:ring-blue-500/20 hover:bg-blue-500/5 transition-all"
                    >
                      + {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </ProfileSection>

          {/* Section: Experience & Work History */}
          <ProfileSection
            title="Experience & Work History"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>}
            description={`${experienceYears} years experience, ${workHistory.length} role${workHistory.length !== 1 ? 's' : ''}`}
            temperature="warm"
            badge={workHistory.length === 0 ? <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-400 rounded">Add roles</span> : undefined}
          >
            <div className="space-y-5">
              {/* Experience years */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Years of Experience</label>
                <div className="flex items-center gap-3">
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={() => setExperienceYears(Math.max(0, experienceYears - 1))}
                    className="w-9 h-9 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-bold">-</motion.button>
                  <motion.span
                    key={experienceYears}
                    initial={{ scale: 1.3, color: '#60a5fa' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={springTransition}
                    className="text-2xl font-bold text-white w-12 text-center"
                  >{experienceYears}</motion.span>
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={() => setExperienceYears(experienceYears + 1)}
                    className="w-9 h-9 rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all text-lg font-bold">+</motion.button>
                  <span className="text-xs text-white/40 ml-1">years</span>
                </div>
              </div>

              {/* Work history entries */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-3 uppercase tracking-wider">Work History</label>
                <div className="space-y-3">
                  <AnimatePresence>
                    {workHistory.map((entry, idx) => (
                      <motion.div
                        key={`work-${idx}`}
                        layout
                        initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={springTransition}
                        className="p-4 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.08] space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Company</label>
                              <input type="text" value={entry.company}
                                onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], company: e.target.value }; setWorkHistory(n); }}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Job Title</label>
                              <input type="text" value={entry.title}
                                onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], title: e.target.value }; setWorkHistory(n); }}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                            </div>
                          </div>
                          <motion.button whileTap={{ scale: 0.9 }}
                            onClick={() => setWorkHistory(workHistory.filter((_, i) => i !== idx))}
                            className="ml-2 mt-4 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </motion.button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Start Date</label>
                            <input type="month" value={entry.start_date}
                              onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], start_date: e.target.value }; setWorkHistory(n); }}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">End Date</label>
                            <input type="month" value={entry.end_date || ''} disabled={entry.is_current}
                              onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], end_date: e.target.value }; setWorkHistory(n); }}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all disabled:opacity-30" />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={entry.is_current}
                                onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], is_current: e.target.checked, end_date: e.target.checked ? undefined : n[idx].end_date }; setWorkHistory(n); }}
                                className="w-4 h-4 rounded bg-white/5 border-white/20 text-blue-500 focus:ring-blue-500/50" />
                              <span className="text-xs text-white/50">Present</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Description</label>
                          <textarea value={entry.description || ''} rows={2}
                            onChange={(e) => { const n = [...workHistory]; n[idx] = { ...n[idx], description: e.target.value }; setWorkHistory(n); }}
                            placeholder="Key achievements and responsibilities..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none transition-all" />
                        </div>
                        {/* Skills pills for this role */}
                        {entry.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {entry.skills.map((sk) => (
                              <span key={sk} className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 rounded-full ring-1 ring-indigo-500/20">{sk}</span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setWorkHistory([...workHistory, { company: '', title: '', start_date: '', is_current: false, skills: [] }])}
                  className="mt-3 w-full py-2.5 text-sm text-blue-400 ring-1 ring-blue-500/20 rounded-lg hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Experience
                </motion.button>
              </div>
            </div>
          </ProfileSection>

          {/* Section: Education */}
          <ProfileSection
            title="Education"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>}
            description={`${education.length} degree${education.length !== 1 ? 's' : ''} added`}
            temperature="cool"
            badge={education.length === 0 ? <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-400 rounded">Add education</span> : undefined}
          >
            <div className="space-y-3">
              <AnimatePresence>
                {education.map((entry, idx) => (
                  <motion.div
                    key={`edu-${idx}`}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springTransition}
                    className="p-4 bg-white/[0.03] rounded-lg ring-1 ring-white/[0.08] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Institution</label>
                          <input type="text" value={entry.institution}
                            onChange={(e) => { const n = [...education]; n[idx] = { ...n[idx], institution: e.target.value }; setEducation(n); }}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Degree</label>
                          <input type="text" value={entry.degree}
                            onChange={(e) => { const n = [...education]; n[idx] = { ...n[idx], degree: e.target.value }; setEducation(n); }}
                            placeholder="BS, MS, PhD..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Field of Study</label>
                          <input type="text" value={entry.field}
                            onChange={(e) => { const n = [...education]; n[idx] = { ...n[idx], field: e.target.value }; setEducation(n); }}
                            placeholder="Computer Science"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                        className="ml-2 mt-4 p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">Start Year</label>
                        <input type="number" value={entry.start_year || ''}
                          onChange={(e) => { const n = [...education]; n[idx] = { ...n[idx], start_year: parseInt(e.target.value) || 0 }; setEducation(n); }}
                          placeholder="2018"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-white/40 mb-1 uppercase tracking-wider">End Year</label>
                        <input type="number" value={entry.end_year || ''}
                          onChange={(e) => { const n = [...education]; n[idx] = { ...n[idx], end_year: parseInt(e.target.value) || undefined }; setEducation(n); }}
                          placeholder="2022"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => setEducation([...education, { institution: '', degree: '', field: '', start_year: 0 }])}
                className="w-full py-2.5 text-sm text-blue-400 ring-1 ring-blue-500/20 rounded-lg hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Education
              </motion.button>
            </div>
          </ProfileSection>

          {/* Section: Certifications & Languages */}
          <ProfileSection
            title="Certifications & Languages"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>}
            description={`${certifications.length} cert${certifications.length !== 1 ? 's' : ''}, ${languages.length} language${languages.length !== 1 ? 's' : ''}`}
          >
            <div className="space-y-5">
              {/* Certifications */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Certifications</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <AnimatePresence>
                    {certifications.map((cert) => (
                      <motion.span
                        key={cert}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={springTransition}
                        className="px-3 py-1.5 bg-amber-500/10 text-amber-400 text-sm rounded-full flex items-center gap-1.5 ring-1 ring-amber-500/20"
                      >
                        {cert}
                        <button onClick={() => setCertifications(certifications.filter(c => c !== cert))}
                          className="text-amber-500/60 hover:text-amber-300 transition-colors">&times;</button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newCertification} onChange={(e) => setNewCertification(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newCertification.trim(); if (t && !certifications.includes(t)) { setCertifications([...certifications, t]); setNewCertification(''); } } }}
                    placeholder="AWS Solutions Architect, PMP..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-all" />
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => { const t = newCertification.trim(); if (t && !certifications.includes(t)) { setCertifications([...certifications, t]); setNewCertification(''); } }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-amber-500/20">Add</motion.button>
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Languages</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <AnimatePresence>
                    {languages.map((lang) => (
                      <motion.span
                        key={lang}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={springTransition}
                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm rounded-full flex items-center gap-1.5 ring-1 ring-emerald-500/20"
                      >
                        {lang}
                        <button onClick={() => setLanguages(languages.filter(l => l !== lang))}
                          className="text-emerald-500/60 hover:text-emerald-300 transition-colors">&times;</button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newLanguage.trim(); if (t && !languages.includes(t)) { setLanguages([...languages, t]); setNewLanguage(''); } } }}
                    placeholder="English, Spanish, Mandarin..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all" />
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => { const t = newLanguage.trim(); if (t && !languages.includes(t)) { setLanguages([...languages, t]); setNewLanguage(''); } }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20">Add</motion.button>
                </div>
              </div>
            </div>
          </ProfileSection>

          {/* Section 4: Availability — HOT temperature */}
          <ProfileSection
            title="Availability"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            description="Let recruiters know when you can start"
            temperature="hot"
            defaultOpen={true}
            badge={availableNow
              ? <span className="relative flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 rounded">
                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" /></span>
                  Available now
                </span>
              : undefined
            }
          >
            <div className="space-y-5">
              {/* Available Now toggle */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-white">Available Now</p>
                  <p className="text-xs text-white/40 mt-0.5">Show a green badge on your profile card</p>
                </div>
                <motion.button
                  onClick={() => setAvailableNow(!availableNow)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${availableNow ? 'bg-green-500' : 'bg-white/10'}`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: availableNow ? 26 : 4 }}
                    transition={springTransition}
                  />
                </motion.button>
              </div>

              <AnimatePresence>
                {availableNow && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={springTransition}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-green-500/[0.05] ring-1 ring-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>
                        <span className="text-xs font-medium">Recruiters will see you&apos;re ready to start immediately</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Notice Period</label>
                  <select value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                    {NOTICE_PERIODS.map((np) => <option key={np.value} value={np.value}>{np.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Available From</label>
                  <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
              </div>

              {/* Open to relocation */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-white">Open to Relocation</p>
                  <p className="text-xs text-white/40 mt-0.5">Willing to move for the right opportunity</p>
                </div>
                <motion.button
                  onClick={() => setOpenToRelocation(!openToRelocation)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${openToRelocation ? 'bg-blue-500' : 'bg-white/10'}`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: openToRelocation ? 26 : 4 }}
                    transition={springTransition}
                  />
                </motion.button>
              </div>
            </div>
          </ProfileSection>

          {/* Section 5: Location & Preferences */}
          <ProfileSection
            title="Location & Preferences"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" /></svg>}
            description="Where you want to work"
            temperature="warm"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Country</label>
                  <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Work Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['remote', 'hybrid', 'onsite', 'any'] as const).map((pref) => (
                    <motion.button
                      key={pref}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRemotePreference(pref)}
                      className={`p-2.5 rounded-lg text-sm font-medium capitalize transition-all ring-1 ${
                        remotePreference === pref
                          ? 'ring-blue-500/50 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10'
                          : 'ring-white/[0.06] text-white/50 hover:ring-white/10 hover:text-white/70'
                      }`}
                    >{pref}</motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Visa / Work Authorization</label>
                <select value={visaStatus} onChange={(e) => setVisaStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                  <option value="">Select...</option>
                  <option value="citizen">Citizen</option>
                  <option value="permanent_resident">Permanent Resident</option>
                  <option value="work_visa">Work Visa</option>
                  <option value="needs_sponsorship">Needs Sponsorship</option>
                </select>
              </div>
            </div>
          </ProfileSection>

          {/* Section 6: Salary & Visibility */}
          <ProfileSection
            title="Compensation & Visibility"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            description="Salary expectations and profile visibility"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Min Salary (USD/yr)</label>
                  <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="50000"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Max Salary (USD/yr)</label>
                  <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="80000"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg ring-1 ring-white/[0.06]">
                <div>
                  <p className="text-sm font-medium text-white">Visible to Recruiters</p>
                  <p className="text-xs text-white/40 mt-0.5">Your profile appears in search results and candidate browse</p>
                </div>
                <motion.button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-white/10'}`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    animate={{ left: isPublic ? 26 : 4 }}
                    transition={springTransition}
                  />
                </motion.button>
              </div>
            </div>
          </ProfileSection>

          {/* Save bar */}
          <motion.div
            className="flex justify-end gap-3 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/dashboard/candidate')}
              className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 font-medium transition-all hover:shadow-blue-500/30"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </span>
              ) : 'Save Profile'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
