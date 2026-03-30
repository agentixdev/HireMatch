'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { CountryCode } from '@/types';

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
  'MongoDB', 'GraphQL', 'REST API', 'Git', 'CI/CD', 'Agile', 'Scrum',
  'Machine Learning', 'Data Analysis', 'Figma', 'Product Management',
  'Project Management', 'Communication', 'Leadership', 'SQL', 'Redis',
];

const PROCESSING_STAGES = [
  { label: 'Reading your resume...', sublabel: 'Extracting raw text and structure' },
  { label: 'Extracting skills & experience...', sublabel: 'Identifying key qualifications' },
  { label: 'Building your profile...', sublabel: 'Mapping data to your HireMatch profile' },
  { label: 'Generating match tags...', sublabel: 'Optimizing for recruiter discovery' },
];

const STAGE_COLORS = [
  { bg: 'rgba(59,130,246,0.08)', core: '#3B82F6', ring: 'rgba(59,130,246,0.3)' },
  { bg: 'rgba(168,85,247,0.1)', core: '#A855F7', ring: 'rgba(168,85,247,0.3)' },
  { bg: 'rgba(245,158,11,0.1)', core: '#F59E0B', ring: 'rgba(245,158,11,0.3)' },
  { bg: 'rgba(34,197,94,0.12)', core: '#22C55E', ring: 'rgba(34,197,94,0.3)' },
];

/* ─── Culture & Work-Style Constants ─── */

const CULTURE_VALUES = [
  { id: 'innovation', label: 'Innovation', icon: '💡' },
  { id: 'collaboration', label: 'Collaboration', icon: '🤝' },
  { id: 'work-life-balance', label: 'Work-Life Balance', icon: '⚖️' },
  { id: 'growth', label: 'Growth', icon: '📈' },
  { id: 'autonomy', label: 'Autonomy', icon: '🎯' },
  { id: 'stability', label: 'Stability', icon: '🏛️' },
  { id: 'diversity', label: 'Diversity', icon: '🌍' },
  { id: 'impact', label: 'Impact', icon: '🚀' },
  { id: 'excellence', label: 'Excellence', icon: '⭐' },
  { id: 'mentorship', label: 'Mentorship', icon: '🧑‍🏫' },
];

const WORK_STYLES = [
  { id: 'fast-paced', label: 'Fast-Paced', icon: '⚡' },
  { id: 'structured', label: 'Structured', icon: '📋' },
  { id: 'flexible', label: 'Flexible', icon: '🔄' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'data-driven', label: 'Data-Driven', icon: '📊' },
  { id: 'people-first', label: 'People-First', icon: '❤️' },
];

const INDUSTRY_PREFS = [
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'retail', label: 'Retail', icon: '🛍️' },
  { id: 'consulting', label: 'Consulting', icon: '📎' },
  { id: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
  { id: 'energy', label: 'Energy', icon: '⚡' },
  { id: 'legal', label: 'Legal', icon: '⚖️' },
];

const COMPANY_SIZES = [
  { id: 'startup', label: 'Startup', desc: '1-50 employees', icon: '🌱' },
  { id: 'scaleup', label: 'Scaleup', desc: '51-200 employees', icon: '🌿' },
  { id: 'mid-size', label: 'Mid-size', desc: '201-1,000 employees', icon: '🌳' },
  { id: 'enterprise', label: 'Enterprise', desc: '1,000+ employees', icon: '🏢' },
  { id: 'any', label: 'Any Size', desc: 'No preference', icon: '🌐' },
];

type OnboardingStep = 'choose-path' | 'resume-upload' | 'resume-processing' | 'manual-basic' | 'manual-skills' | 'manual-prefs' | 'culture-prefs' | 'review' | 'done';

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

/* ─── Animation Presets ─── */

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };
const fadeSlideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: springTransition,
};
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

/* ─── Reusable Input Component ─── */

function InputField({ label, value, onChange, placeholder, type = 'text', textarea = false, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean; rows?: number;
}) {
  const cls = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={`${cls} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

/* ─── Completeness Score Ring ─── */

function CompletenessRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, ...springTransition }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function CandidateOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<OnboardingStep>('choose-path');
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<ParsedCV | null>(null);

  // Processing stages
  const [processingStageIndex, setProcessingStageIndex] = useState(-1);
  const [stagesCompleted, setStagesCompleted] = useState<boolean[]>([false, false, false, false]);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [remotePreference, setRemotePreference] = useState<'remote' | 'hybrid' | 'onsite' | 'any'>('any');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [visaStatus, setVisaStatus] = useState('');
  const [openToRelocation, setOpenToRelocation] = useState(false);
  const [experienceYears, setExperienceYears] = useState('');
  const [education, setEducation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Culture preferences
  const [cultureValues, setCultureValues] = useState<string[]>([]);
  const [workStyles, setWorkStyles] = useState<string[]>([]);
  const [industryPrefs, setIndustryPrefs] = useState<string[]>([]);
  const [companySizePref, setCompanySizePref] = useState<string>('any');

  // Inline edit tracking for review
  const [editingField, setEditingField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth check + skip if already completed
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }
      const { data: cand } = await supabase.from('candidates').select('quiz_answers').eq('user_id', user.id).single();
      if (cand?.quiz_answers && Object.keys(cand.quiz_answers as Record<string, unknown>).length > 0) {
        router.push('/dashboard/candidate');
      }
    })();
  }, []);

  // Confetti on done
  useEffect(() => {
    if (step === 'done') {
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [step]);

  /* ─── Navigation helpers ─── */

  const goTo = useCallback((next: OnboardingStep, dir = 1) => {
    setDirection(dir);
    setError('');
    setStep(next);
  }, []);

  /* ─── Completeness score ─── */

  const completenessScore = (() => {
    let score = 0;
    if (fullName) score += 15;
    if (headline) score += 15;
    if (bio) score += 10;
    if (skills.length > 0) score += 15;
    if (skills.length >= 5) score += 5;
    if (country) score += 5;
    if (city) score += 5;
    if (remotePreference !== 'any') score += 5;
    if (visaStatus) score += 5;
    if (photoUrl) score += 10;
    if (parsed?.work_history?.length) score += 5;
    if (parsed?.education?.length) score += 5;
    return Math.min(score, 100);
  })();

  /* ─── AI Suggestions ─── */

  const aiSuggestions: string[] = [];
  if (!headline) aiSuggestions.push('Add a professional headline to stand out');
  if (skills.length < 5) aiSuggestions.push(`Add ${5 - skills.length} more skills to improve match quality`);
  if (!bio) aiSuggestions.push('Write a short bio to give recruiters a sense of who you are');
  if (!photoUrl) aiSuggestions.push('Upload a profile photo to increase response rates by 40%');
  if (!visaStatus) aiSuggestions.push('Set your visa status so recruiters know your work eligibility');

  /* ─── File Upload & Processing ─── */

  const handleFileUpload = useCallback(async (file: File) => {
    setError('');
    goTo('resume-processing');

    // Run animation in parallel with API call
    const animateStages = async () => {
      const stagesDone = [false, false, false, false];
      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        await new Promise((r) => setTimeout(r, 800));
        setProcessingStageIndex(i);
        stagesDone[i] = true;
        setStagesCompleted([...stagesDone]);
      }
    };

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const [, res] = await Promise.all([
        animateStages(),
        fetch('/api/parse-cv', { method: 'POST', body: formData }),
      ]);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        goTo('resume-upload', -1);
        return;
      }

      const p = data.parsed as ParsedCV;
      setParsed(p);
      setFullName(p.full_name || '');
      setHeadline(p.headline || '');
      setBio(p.bio || '');
      setSkills(p.skills || []);
      if (p.experience_years) setExperienceYears(String(p.experience_years));
      if (data.photo_url) setPhotoUrl(data.photo_url);

      // Ensure all stage checkmarks show before advancing
      const stagesDone = PROCESSING_STAGES.map(() => true);
      setStagesCompleted(stagesDone);
      setProcessingStageIndex(PROCESSING_STAGES.length - 1);

      // Brief pause to show all green checks before advancing
      await new Promise((r) => setTimeout(r, 500));
      goTo('culture-prefs');
    } catch {
      setError('Upload failed. Please try again.');
      goTo('resume-upload', -1);
    }
  }, [goTo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  /* ─── Skills ─── */

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((s) => s !== skill));

  const addSuggestedSkill = (skill: string) => {
    if (!skills.includes(skill)) setSkills((prev) => [...prev, skill]);
  };

  /* ─── Save ─── */

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
        open_to_relocation: openToRelocation,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        experience_years: experienceYears ? parseInt(experienceYears) : null,
        photo_url: photoUrl || null,
        match_tags: [
          ...skills.map((s) => s.toLowerCase()),
          ...cultureValues,
          ...workStyles,
        ],
        quiz_answers: {
          culture_values: cultureValues,
          work_styles: workStyles,
          industry_prefs: industryPrefs,
          company_size_pref: companySizePref,
        },
        updated_at: new Date().toISOString(),
      };

      if (parsed) {
        updateData.education = parsed.education;
        updateData.work_history = parsed.work_history;
        updateData.certifications = parsed.certifications;
        updateData.languages = parsed.languages;
        if (!updateData.experience_years && parsed.experience_years) {
          updateData.experience_years = parsed.experience_years;
        }
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

      goTo('done');
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Step index for progress bar ─── */

  const stepOrder: OnboardingStep[] = ['choose-path', 'resume-upload', 'culture-prefs', 'review', 'done'];
  const manualStepOrder: OnboardingStep[] = ['choose-path', 'manual-basic', 'manual-skills', 'manual-prefs', 'culture-prefs', 'review', 'done'];
  const isManualPath = step.startsWith('manual-') || step === 'culture-prefs';
  const currentSteps = isManualPath || (!parsed && step === 'review') ? manualStepOrder : stepOrder;
  const currentStepIdx = currentSteps.indexOf(step);

  /* ─── Skill suggestion filtering ─── */

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (s) => !skills.includes(s) && (newSkill ? s.toLowerCase().includes(newSkill.toLowerCase()) : true)
  ).slice(0, 8);

  /* ─── Render ─── */

  return (
    <DashboardLayout role="candidate">
      <main className="flex-1 bg-transparent min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-12">

          {/* ─── Progress Bar ─── */}
          {step !== 'resume-processing' && (
            <motion.div
              className="flex items-center justify-center gap-2 mb-12"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
            >
              {currentSteps.map((s, i) => {
                const isCurrent = s === step;
                const isPast = currentStepIdx > i;
                const labels: Record<string, string> = {
                  'choose-path': 'Path',
                  'resume-upload': 'Upload',
                  'manual-basic': 'Info',
                  'manual-skills': 'Skills',
                  'manual-prefs': 'Prefs',
                  'culture-prefs': 'Culture',
                  'review': 'Review',
                  'done': 'Done',
                };
                return (
                  <div key={s} className="flex items-center gap-2">
                    <motion.div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isCurrent ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' :
                        isPast ? 'bg-green-500 text-white' :
                        'bg-white/10 text-white/40'
                      }`}
                      whileHover={{ scale: 1.1 }}
                      transition={springTransition}
                    >
                      {isPast ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      ) : i + 1}
                    </motion.div>
                    <span className={`text-xs hidden sm:block ${isCurrent ? 'text-white font-medium' : 'text-white/40'}`}>
                      {labels[s] || ''}
                    </span>
                    {i < currentSteps.length - 1 && (
                      <div className={`w-8 h-0.5 ${isPast ? 'bg-green-500/50' : 'bg-white/10'}`} />
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* ─── Error Display ─── */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Step Content ─── */}
          <AnimatePresence mode="wait" custom={direction}>

            {/* ═══ STEP 1: Choose Your Path ═══ */}
            {step === 'choose-path' && (
              <motion.div key="choose-path" {...fadeSlideUp}>
                <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
                  Let&apos;s Build Your Profile
                </h1>
                <p className="text-white/50 text-center mb-10 text-lg">
                  Choose how you&apos;d like to get started
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Resume Card */}
                  <motion.button
                    onClick={() => goTo('resume-upload')}
                    className="group relative bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 text-left hover:ring-blue-500/50 transition-all"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                        <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Upload Your Resume</h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        Our AI will parse your CV in seconds and build your profile automatically
                      </p>
                      <div className="mt-5 flex items-center gap-2 text-blue-400 text-sm font-medium">
                        <span>Fastest way</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </motion.button>

                  {/* Manual Card */}
                  <motion.button
                    onClick={() => goTo('manual-basic')}
                    className="group relative bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 text-left hover:ring-indigo-500/50 transition-all"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springTransition}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5">
                        <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Build From Scratch</h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        Fill in your details manually for full control over your profile
                      </p>
                      <div className="mt-5 flex items-center gap-2 text-indigo-400 text-sm font-medium">
                        <span>Full control</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    </div>
                  </motion.button>
                </div>

                <motion.p
                  className="text-center text-white/30 text-sm mt-8"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                >
                  You can always edit and add more details later
                </motion.p>
              </motion.div>
            )}

            {/* ═══ STEP 2a: Resume Upload ═══ */}
            {step === 'resume-upload' && (
              <motion.div
                key="resume-upload"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10">
                  <h2 className="text-2xl font-bold text-white text-center">Upload Your Resume</h2>
                  <p className="text-white/50 text-center mt-2">
                    We&apos;ll extract your details and pre-fill your profile
                  </p>

                  <motion.div
                    className="mt-8 border-2 border-dashed border-white/10 rounded-2xl p-16 text-center hover:border-blue-400/50 transition-colors cursor-pointer relative overflow-hidden group"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.01 }}
                    transition={springTransition}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <motion.div
                      className="relative"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, ...springTransition }}
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-white/70 mb-2">
                        Drop your CV here or click to browse
                      </p>
                      <p className="text-sm text-white/40">
                        PDF, DOCX, DOC, or TXT (max 10MB)
                      </p>
                    </motion.div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </motion.div>

                  <div className="mt-6 flex justify-between items-center">
                    <button
                      onClick={() => goTo('choose-path', -1)}
                      className="text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      &larr; Back
                    </button>
                    <button
                      onClick={() => goTo('manual-basic')}
                      className="text-sm text-white/40 hover:text-white/60 transition-colors"
                    >
                      Fill in manually instead &rarr;
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2a-processing: AI Processing Animation ═══ */}
            {step === 'resume-processing' && (
              <motion.div
                key="resume-processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: stagesCompleted.every(Boolean) ? 1.02 : 1,
                  borderColor: stagesCompleted.every(Boolean) ? 'rgba(34,197,94,0.5)' : 'transparent',
                }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-10 sm:p-14 relative overflow-hidden">
                  {/* Temperature background */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ filter: 'blur(80px)' }}
                    animate={{
                      backgroundColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].bg,
                    }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />

                  {/* DNA Helix Loader */}
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    {/* Outer ring 1 — clockwise */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: '2px solid transparent',
                        borderTopColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                        borderRightColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Outer ring 2 — counter-clockwise */}
                    <motion.div
                      className="absolute inset-2 rounded-full"
                      style={{
                        border: '2px solid transparent',
                        borderBottomColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                        borderLeftColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                        opacity: 0.6,
                      }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Pulsing core */}
                    <motion.div
                      className="absolute inset-0 m-auto w-10 h-10 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core }}
                      animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.3, 0.6, 0.3],
                        backgroundColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Orbiting particles */}
                    {[0, 1, 2].map((p) => (
                      <motion.div
                        key={p}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core,
                          top: '50%',
                          left: '50%',
                          marginTop: -4,
                          marginLeft: -4,
                        }}
                        animate={{
                          x: [
                            Math.cos((p * 2 * Math.PI) / 3) * 36,
                            Math.cos((p * 2 * Math.PI) / 3 + Math.PI) * 36,
                            Math.cos((p * 2 * Math.PI) / 3 + 2 * Math.PI) * 36,
                          ],
                          y: [
                            Math.sin((p * 2 * Math.PI) / 3) * 36,
                            Math.sin((p * 2 * Math.PI) / 3 + Math.PI) * 36,
                            Math.sin((p * 2 * Math.PI) / 3 + 2 * Math.PI) * 36,
                          ],
                          opacity: [0.8, 1, 0.8],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: p * 0.15 }}
                      />
                    ))}

                    {/* Particle burst on completion */}
                    {stagesCompleted.every(Boolean) &&
                      Array.from({ length: 8 }).map((_, p) => (
                        <motion.div
                          key={`burst-${p}`}
                          className="absolute w-1.5 h-1.5 rounded-full bg-green-400"
                          style={{ top: '50%', left: '50%', marginTop: -3, marginLeft: -3 }}
                          initial={{ x: 0, y: 0, opacity: 1 }}
                          animate={{
                            x: Math.cos((p * 2 * Math.PI) / 8) * 60,
                            y: Math.sin((p * 2 * Math.PI) / 8) * 60,
                            opacity: 0,
                          }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                      ))}
                  </div>

                  <h2 className="relative text-2xl font-bold text-white text-center mb-8">
                    AI is analyzing your resume
                  </h2>

                  <div className="relative space-y-3 max-w-sm mx-auto">
                    {PROCESSING_STAGES.map((stage, i) => (
                      <AnimatePresence key={i}>
                        {processingStageIndex >= i && (
                          <motion.div
                            className="flex items-start gap-3"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}
                          >
                            {stagesCompleted[i] ? (
                              <motion.div
                                className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              >
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </motion.div>
                            ) : (
                              <div className="relative w-6 h-6 flex-shrink-0 mt-0.5">
                                {/* Active stage pulsing glow ring */}
                                <motion.div
                                  className="absolute inset-[-3px] rounded-full"
                                  style={{ backgroundColor: STAGE_COLORS[Math.min(i, 3)].ring }}
                                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <div
                                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                                  style={{ borderColor: STAGE_COLORS[Math.min(i, 3)].core, borderTopColor: 'transparent' }}
                                />
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${stagesCompleted[i] ? 'text-green-400' : 'text-white'}`}>
                                {stage.label}
                              </span>
                              <span className="text-xs text-white/40 mt-0.5">{stage.sublabel}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="relative mt-8 max-w-sm mx-auto">
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: STAGE_COLORS[Math.min(processingStageIndex, 3)].core }}
                        initial={{ width: '0%' }}
                        animate={{
                          width: `${((stagesCompleted.filter(Boolean).length) / PROCESSING_STAGES.length) * 100}%`,
                        }}
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                      />
                    </div>
                    <p className="text-xs text-white/30 text-center mt-3">
                      {stagesCompleted.filter(Boolean).length} of {PROCESSING_STAGES.length} steps complete
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2b-1: Manual — Basic Info ═══ */}
            {step === 'manual-basic' && (
              <motion.div
                key="manual-basic"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10">
                  <h2 className="text-2xl font-bold text-white">Basic Information</h2>
                  <p className="text-white/50 mt-2 mb-8">Tell us about yourself</p>

                  <div className="flex justify-center mb-8">
                    <AvatarUpload
                      bucket="avatars"
                      currentUrl={photoUrl}
                      onUpload={setPhotoUrl}
                      shape="circle"
                      size={96}
                    />
                  </div>

                  <div className="space-y-5">
                    <InputField label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" />
                    <InputField label="Professional Headline" value={headline} onChange={setHeadline} placeholder="Senior React Developer | 8 years experience" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1">Country</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value as CountryCode)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <InputField label="City" value={city} onChange={setCity} placeholder="San Francisco" />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => goTo('choose-path', -1)} className="px-6 py-2.5 text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors">
                      Back
                    </button>
                    <motion.button
                      onClick={() => goTo('manual-skills')}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={springTransition}
                    >
                      Continue
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2b-2: Manual — Skills & Experience ═══ */}
            {step === 'manual-skills' && (
              <motion.div
                key="manual-skills"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10">
                  <h2 className="text-2xl font-bold text-white">Skills & Experience</h2>
                  <p className="text-white/50 mt-2 mb-8">What are you great at?</p>

                  <div className="space-y-6">
                    {/* Skills */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
                        <AnimatePresence>
                          {skills.map((skill) => (
                            <motion.span
                              key={skill}
                              className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full flex items-center gap-1"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={springTransition}
                            >
                              {skill}
                              <button onClick={() => removeSkill(skill)} className="text-blue-500 hover:text-blue-300 ml-1">&times;</button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="Type a skill..."
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <motion.button
                          onClick={addSkill}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium"
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        >
                          Add
                        </motion.button>
                      </div>

                      {/* Suggestions */}
                      {filteredSuggestions.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs text-white/30 mb-1.5 block">Suggestions:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {filteredSuggestions.map((s) => (
                              <motion.button
                                key={s}
                                onClick={() => addSuggestedSkill(s)}
                                className="px-2.5 py-1 text-xs bg-white/[0.04] text-white/50 rounded-full ring-1 ring-white/10 hover:ring-blue-500/30 hover:text-blue-400 transition-colors"
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              >
                                + {s}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <InputField label="Years of Experience" value={experienceYears} onChange={setExperienceYears} placeholder="5" type="number" />
                      <InputField label="Education" value={education} onChange={setEducation} placeholder="BS Computer Science, MIT" />
                    </div>

                    <InputField label="Short Bio" value={bio} onChange={setBio} placeholder="Tell recruiters about yourself..." textarea rows={3} />
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => goTo('manual-basic', -1)} className="px-6 py-2.5 text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors">
                      Back
                    </button>
                    <motion.button
                      onClick={() => goTo('manual-prefs')}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={springTransition}
                    >
                      Continue
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2b-3: Manual — Preferences ═══ */}
            {step === 'manual-prefs' && (
              <motion.div
                key="manual-prefs"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10">
                  <h2 className="text-2xl font-bold text-white">Preferences</h2>
                  <p className="text-white/50 mt-2 mb-8">Help us find the right opportunities for you</p>

                  <div className="space-y-6">
                    {/* Remote Preference */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">Work Preference</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['remote', 'hybrid', 'onsite', 'any'] as const).map((pref) => (
                          <motion.button
                            key={pref}
                            type="button"
                            onClick={() => setRemotePreference(pref)}
                            className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-all capitalize ${
                              remotePreference === pref
                                ? 'border-blue-600 bg-blue-500/10 text-blue-400'
                                : 'border-white/[0.06] text-white/60 hover:border-white/10'
                            }`}
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          >
                            {pref}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Salary Range */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Salary Range (USD/year)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={salaryMin}
                          onChange={(e) => setSalaryMin(e.target.value)}
                          placeholder="Min e.g. 80000"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <input
                          type="number"
                          value={salaryMax}
                          onChange={(e) => setSalaryMax(e.target.value)}
                          placeholder="Max e.g. 150000"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Visa Status */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Visa / Work Authorization</label>
                      <select
                        value={visaStatus}
                        onChange={(e) => setVisaStatus(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="citizen">Citizen</option>
                        <option value="permanent_resident">Permanent Resident</option>
                        <option value="work_visa">Work Visa</option>
                        <option value="needs_sponsorship">Needs Sponsorship</option>
                      </select>
                    </div>

                    {/* Open to Relocation */}
                    <motion.button
                      type="button"
                      onClick={() => setOpenToRelocation(!openToRelocation)}
                      className={`flex items-center gap-3 p-4 rounded-lg ring-1 transition-all w-full text-left ${
                        openToRelocation ? 'ring-blue-500/50 bg-blue-500/10' : 'ring-white/10 hover:ring-white/20'
                      }`}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                        openToRelocation ? 'bg-blue-600' : 'bg-white/10'
                      }`}>
                        {openToRelocation && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${openToRelocation ? 'text-blue-400' : 'text-white/60'}`}>
                          Open to relocation
                        </span>
                        <p className="text-xs text-white/30 mt-0.5">Willing to move for the right opportunity</p>
                      </div>
                    </motion.button>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <button onClick={() => goTo('manual-skills', -1)} className="px-6 py-2.5 text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors">
                      Back
                    </button>
                    <motion.button
                      onClick={() => goTo('culture-prefs')}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={springTransition}
                    >
                      Continue
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP: Culture & Work-Style Preferences ═══ */}
            {step === 'culture-prefs' && (
              <motion.div
                key="culture-prefs"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10 relative overflow-hidden">
                  {/* Temperature background that shifts with selections */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ filter: 'blur(100px)' }}
                    animate={{
                      backgroundColor: cultureValues.length + workStyles.length + industryPrefs.length > 6
                        ? 'rgba(34,197,94,0.08)'
                        : cultureValues.length + workStyles.length > 3
                          ? 'rgba(59,130,246,0.08)'
                          : 'rgba(168,85,247,0.05)',
                    }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                  />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-white">Culture & Work Style</h2>
                      <motion.span
                        className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, ...springTransition }}
                      >
                        Almost there!
                      </motion.span>
                    </div>
                    <p className="text-white/50 mt-1 mb-8">Help us match you with companies that share your values</p>

                    {/* Culture Values (pick 3-5) */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        What do you value most? <span className="text-white/30">(pick 3-5)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {CULTURE_VALUES.map((val) => {
                          const selected = cultureValues.includes(val.id);
                          const atMax = cultureValues.length >= 5 && !selected;
                          return (
                            <motion.button
                              key={val.id}
                              type="button"
                              disabled={atMax}
                              onClick={() => {
                                if (selected) setCultureValues(prev => prev.filter(v => v !== val.id));
                                else setCultureValues(prev => [...prev, val.id]);
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                                selected
                                  ? 'bg-blue-500/20 text-blue-300 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                                  : atMax
                                    ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                                    : 'bg-white/[0.04] text-white/60 ring-1 ring-white/10 hover:ring-blue-500/30 hover:text-blue-400'
                              }`}
                              whileHover={!atMax ? { scale: 1.05 } : {}}
                              whileTap={!atMax ? { scale: 0.92 } : {}}
                              animate={selected ? { scale: [1, 1.12, 1] } : {}}
                              transition={springTransition}
                            >
                              <span>{val.icon}</span>
                              <span>{val.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Work Styles (pick 2-3) */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        How do you work best? <span className="text-white/30">(pick 2-3)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {WORK_STYLES.map((ws) => {
                          const selected = workStyles.includes(ws.id);
                          const atMax = workStyles.length >= 3 && !selected;
                          return (
                            <motion.button
                              key={ws.id}
                              type="button"
                              disabled={atMax}
                              onClick={() => {
                                if (selected) setWorkStyles(prev => prev.filter(v => v !== ws.id));
                                else setWorkStyles(prev => [...prev, ws.id]);
                              }}
                              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                                selected
                                  ? 'bg-purple-500/20 text-purple-300 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10'
                                  : atMax
                                    ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                                    : 'bg-white/[0.04] text-white/60 ring-1 ring-white/10 hover:ring-purple-500/30 hover:text-purple-400'
                              }`}
                              whileHover={!atMax ? { scale: 1.05 } : {}}
                              whileTap={!atMax ? { scale: 0.92 } : {}}
                              animate={selected ? { scale: [1, 1.12, 1] } : {}}
                              transition={springTransition}
                            >
                              <span>{ws.icon}</span>
                              <span>{ws.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Industry Preferences (pick up to 3) */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Preferred industries <span className="text-white/30">(up to 3)</span>
                      </label>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {INDUSTRY_PREFS.map((ind) => {
                          const selected = industryPrefs.includes(ind.id);
                          const atMax = industryPrefs.length >= 3 && !selected;
                          return (
                            <motion.button
                              key={ind.id}
                              type="button"
                              disabled={atMax}
                              onClick={() => {
                                if (selected) setIndustryPrefs(prev => prev.filter(v => v !== ind.id));
                                else setIndustryPrefs(prev => [...prev, ind.id]);
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                                selected
                                  ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                  : atMax
                                    ? 'bg-white/[0.02] text-white/20 cursor-not-allowed'
                                    : 'bg-white/[0.04] text-white/60 ring-1 ring-white/10 hover:ring-emerald-500/30 hover:text-emerald-400'
                              }`}
                              whileHover={!atMax ? { scale: 1.05 } : {}}
                              whileTap={!atMax ? { scale: 0.92 } : {}}
                              animate={selected ? { scale: [1, 1.12, 1] } : {}}
                              transition={springTransition}
                            >
                              <span>{ind.icon}</span>
                              <span>{ind.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ideal Company Size */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-white/70 mb-3">Ideal company size</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {COMPANY_SIZES.map((cs) => (
                          <motion.button
                            key={cs.id}
                            type="button"
                            onClick={() => setCompanySizePref(cs.id)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              companySizePref === cs.id
                                ? 'border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                                : 'border-white/[0.06] hover:border-white/20'
                            }`}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            animate={companySizePref === cs.id ? { scale: [1, 1.05, 1] } : {}}
                            transition={springTransition}
                          >
                            <div className="text-xl mb-1">{cs.icon}</div>
                            <div className={`text-xs font-semibold ${companySizePref === cs.id ? 'text-amber-300' : 'text-white/60'}`}>{cs.label}</div>
                            <div className="text-[10px] text-white/30 mt-0.5">{cs.desc}</div>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Selection progress indicator */}
                    <motion.div
                      className="mt-4 p-3 rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06] flex items-center justify-between"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className={cultureValues.length >= 3 ? 'text-green-400' : ''}>Values: {cultureValues.length}/3-5</span>
                        <span className={workStyles.length >= 2 ? 'text-green-400' : ''}>Styles: {workStyles.length}/2-3</span>
                        <span className={industryPrefs.length >= 1 ? 'text-green-400' : ''}>Industries: {industryPrefs.length}/3</span>
                      </div>
                      {cultureValues.length >= 3 && workStyles.length >= 2 && (
                        <motion.span
                          className="text-xs text-green-400 font-medium"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={springTransition}
                        >
                          Ready to continue!
                        </motion.span>
                      )}
                    </motion.div>
                  </div>

                  <div className="relative mt-8 flex justify-between">
                    <button
                      onClick={() => goTo(parsed ? 'resume-upload' : 'manual-prefs', -1)}
                      className="px-6 py-2.5 text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <motion.button
                      onClick={() => goTo('review')}
                      disabled={cultureValues.length < 3 || workStyles.length < 2}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      whileHover={cultureValues.length >= 3 && workStyles.length >= 2 ? { scale: 1.03 } : {}}
                      whileTap={cultureValues.length >= 3 && workStyles.length >= 2 ? { scale: 0.97 } : {}}
                      transition={springTransition}
                    >
                      Review Profile
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 3: Review & Enhance (both paths converge) ═══ */}
            {step === 'review' && (
              <motion.div
                key="review"
                custom={direction} variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={springTransition}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 sm:p-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Review Your Profile</h2>
                      <p className="text-white/50 mt-1">Click any field to edit inline</p>
                    </div>
                    <CompletenessRing score={completenessScore} />
                  </div>

                  {/* Profile Card Preview */}
                  <div className="bg-white/[0.03] rounded-xl p-6 ring-1 ring-white/[0.06]">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-4 mb-6">
                      <AvatarUpload
                        bucket="avatars"
                        currentUrl={photoUrl}
                        onUpload={setPhotoUrl}
                        shape="circle"
                        size={72}
                      />
                      <div className="flex-1 min-w-0">
                        {editingField === 'fullName' ? (
                          <input
                            autoFocus
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                            className="text-xl font-bold bg-white/5 border border-blue-500/50 rounded px-2 py-1 text-white outline-none w-full"
                          />
                        ) : (
                          <h3
                            onClick={() => setEditingField('fullName')}
                            className="text-xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors truncate"
                          >
                            {fullName || 'Your Name'}
                          </h3>
                        )}

                        {editingField === 'headline' ? (
                          <input
                            autoFocus
                            value={headline}
                            onChange={(e) => setHeadline(e.target.value)}
                            onBlur={() => setEditingField(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                            className="text-sm bg-white/5 border border-blue-500/50 rounded px-2 py-1 text-white/70 outline-none w-full mt-1"
                          />
                        ) : (
                          <p
                            onClick={() => setEditingField('headline')}
                            className="text-sm text-white/50 cursor-pointer hover:text-blue-400 transition-colors truncate mt-1"
                          >
                            {headline || 'Add a headline...'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="mb-5">
                      <label className="text-xs text-white/30 uppercase tracking-wider mb-1 block">Bio</label>
                      {editingField === 'bio' ? (
                        <textarea
                          autoFocus
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          onBlur={() => setEditingField(null)}
                          rows={3}
                          className="w-full text-sm bg-white/5 border border-blue-500/50 rounded px-3 py-2 text-white/70 outline-none resize-none"
                        />
                      ) : (
                        <p
                          onClick={() => setEditingField('bio')}
                          className="text-sm text-white/50 cursor-pointer hover:text-blue-400 transition-colors"
                        >
                          {bio || 'Click to add a bio...'}
                        </p>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="mb-5">
                      <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                          {skills.map((skill) => (
                            <motion.span
                              key={skill}
                              className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full flex items-center gap-1"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              layout
                            >
                              {skill}
                              <button onClick={() => removeSkill(skill)} className="text-blue-500 hover:text-blue-300 ml-1">&times;</button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="Add a skill..."
                          className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 text-sm outline-none"
                        />
                        <button onClick={addSkill} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-white/30 text-xs uppercase tracking-wider block mb-1">Location</span>
                        <span className="text-white/70">
                          {city ? `${city}, ` : ''}{COUNTRIES.find((c) => c.code === country)?.name || country}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/30 text-xs uppercase tracking-wider block mb-1">Work Style</span>
                        <span className="text-white/70 capitalize">{remotePreference}</span>
                      </div>
                      {visaStatus && (
                        <div>
                          <span className="text-white/30 text-xs uppercase tracking-wider block mb-1">Visa</span>
                          <span className="text-white/70 capitalize">{visaStatus.replace('_', ' ')}</span>
                        </div>
                      )}
                      {(salaryMin || salaryMax) && (
                        <div>
                          <span className="text-white/30 text-xs uppercase tracking-wider block mb-1">Salary</span>
                          <span className="text-white/70">
                            {salaryMin ? `$${Number(salaryMin).toLocaleString()}` : '?'} &ndash; {salaryMax ? `$${Number(salaryMax).toLocaleString()}` : '?'}
                          </span>
                        </div>
                      )}
                      {experienceYears && (
                        <div>
                          <span className="text-white/30 text-xs uppercase tracking-wider block mb-1">Experience</span>
                          <span className="text-white/70">{experienceYears} years</span>
                        </div>
                      )}
                    </div>

                    {/* Work History (from resume parse) */}
                    {parsed?.work_history && parsed.work_history.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-white/[0.06]">
                        <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Work History</label>
                        <div className="space-y-3">
                          {parsed.work_history.map((job, i) => (
                            <motion.div
                              key={i}
                              className="p-3 bg-white/[0.03] rounded-lg"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div className="font-medium text-white text-sm">{job.title}</div>
                              <div className="text-xs text-white/50">{job.company} &middot; {job.start_date} &mdash; {job.is_current ? 'Present' : job.end_date}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education (from resume parse) */}
                    {parsed?.education && parsed.education.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-white/[0.06]">
                        <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Education</label>
                        <div className="space-y-3">
                          {parsed.education.map((edu, i) => (
                            <motion.div
                              key={i}
                              className="p-3 bg-white/[0.03] rounded-lg"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div className="font-medium text-white text-sm">{edu.degree} in {edu.field}</div>
                              <div className="text-xs text-white/50">{edu.institution} &middot; {edu.start_year} &mdash; {edu.end_year || 'Present'}</div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Culture & Work-Style Preferences */}
                    {(cultureValues.length > 0 || workStyles.length > 0 || industryPrefs.length > 0) && (
                      <div className="mt-5 pt-5 border-t border-white/[0.06]">
                        <label className="text-xs text-white/30 uppercase tracking-wider mb-3 block">Culture & Work Preferences</label>
                        <div className="space-y-3">
                          {cultureValues.length > 0 && (
                            <div>
                              <span className="text-[10px] text-white/30 uppercase tracking-wider">Values</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {cultureValues.map((v, i) => (
                                  <motion.span
                                    key={v}
                                    className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05, ...springTransition }}
                                  >
                                    {CULTURE_VALUES.find(c => c.id === v)?.icon} {CULTURE_VALUES.find(c => c.id === v)?.label}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}
                          {workStyles.length > 0 && (
                            <div>
                              <span className="text-[10px] text-white/30 uppercase tracking-wider">Work Style</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {workStyles.map((v, i) => (
                                  <motion.span
                                    key={v}
                                    className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05, ...springTransition }}
                                  >
                                    {WORK_STYLES.find(c => c.id === v)?.icon} {WORK_STYLES.find(c => c.id === v)?.label}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}
                          {industryPrefs.length > 0 && (
                            <div>
                              <span className="text-[10px] text-white/30 uppercase tracking-wider">Industries</span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {industryPrefs.map((v, i) => (
                                  <motion.span
                                    key={v}
                                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05, ...springTransition }}
                                  >
                                    {INDUSTRY_PREFS.find(c => c.id === v)?.icon} {INDUSTRY_PREFS.find(c => c.id === v)?.label}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-white/30 uppercase tracking-wider">Company Size</span>
                            <div className="mt-1">
                              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full">
                                {COMPANY_SIZES.find(c => c.id === companySizePref)?.icon} {COMPANY_SIZES.find(c => c.id === companySizePref)?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Suggestions */}
                  {aiSuggestions.length > 0 && (
                    <motion.div
                      className="mt-6 p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 ring-1 ring-indigo-500/20 rounded-xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, ...springTransition }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-indigo-300">AI Suggestions</h4>
                      </div>
                      <ul className="space-y-2">
                        {aiSuggestions.map((suggestion, i) => (
                          <motion.li
                            key={i}
                            className="flex items-start gap-2 text-sm text-white/60"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1, ...springTransition }}
                          >
                            <span className="text-indigo-400 mt-0.5 flex-shrink-0">&bull;</span>
                            {suggestion}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  <div className="mt-8 flex justify-between">
                    <button
                      onClick={() => goTo('culture-prefs', -1)}
                      className="px-6 py-2.5 text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <motion.button
                      onClick={handleSave}
                      disabled={saving || !fullName}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={!saving && fullName ? { scale: 1.03 } : {}}
                      whileTap={!saving && fullName ? { scale: 0.97 } : {}}
                      transition={springTransition}
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </span>
                      ) : 'Complete Profile'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 4: Success ═══ */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springTransition, delay: 0.1 }}
              >
                <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-12 sm:p-16 text-center relative overflow-hidden">
                  {/* Celebration gradient background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-emerald-600/10 pointer-events-none"
                    animate={{ opacity: [0, 0.5, 0.3] }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                  />

                  <div className="relative">
                    <motion.div
                      className="text-7xl mb-6"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    >
                      &#x1F389;
                    </motion.div>

                    <motion.h2
                      className="text-3xl font-bold text-white mb-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, ...springTransition }}
                    >
                      Your profile is live!
                    </motion.h2>

                    <motion.p
                      className="text-white/50 text-lg mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      Recruiters can now discover you based on your unique profile.
                    </motion.p>

                    {/* Display top preferences */}
                    {(cultureValues.length > 0 || workStyles.length > 0) && (
                      <motion.div
                        className="mb-8 p-4 bg-white/[0.03] rounded-xl ring-1 ring-white/[0.06] max-w-md mx-auto"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, ...springTransition }}
                      >
                        <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Your match profile</p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {cultureValues.slice(0, 3).map((v, i) => (
                            <motion.span
                              key={v}
                              className="px-2.5 py-1 bg-blue-500/15 text-blue-300 text-xs rounded-full font-medium"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.8 + i * 0.08, ...springTransition }}
                            >
                              {CULTURE_VALUES.find(c => c.id === v)?.icon} {CULTURE_VALUES.find(c => c.id === v)?.label}
                            </motion.span>
                          ))}
                          {workStyles.slice(0, 2).map((v, i) => (
                            <motion.span
                              key={v}
                              className="px-2.5 py-1 bg-purple-500/15 text-purple-300 text-xs rounded-full font-medium"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.0 + i * 0.08, ...springTransition }}
                            >
                              {WORK_STYLES.find(c => c.id === v)?.icon} {WORK_STYLES.find(c => c.id === v)?.label}
                            </motion.span>
                          ))}
                          {industryPrefs.slice(0, 2).map((v, i) => (
                            <motion.span
                              key={v}
                              className="px-2.5 py-1 bg-emerald-500/15 text-emerald-300 text-xs rounded-full font-medium"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 1.1 + i * 0.08, ...springTransition }}
                            >
                              {INDUSTRY_PREFS.find(c => c.id === v)?.icon} {INDUSTRY_PREFS.find(c => c.id === v)?.label}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      className="flex flex-col sm:flex-row items-center justify-center gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, ...springTransition }}
                    >
                      <motion.button
                        onClick={() => router.push('/dashboard/candidate')}
                        className="px-10 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-blue-500/25 font-semibold text-lg"
                        whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(99, 102, 241, 0.3)' }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Find My Matches
                      </motion.button>
                      <motion.button
                        onClick={() => router.push('/jobs')}
                        className="px-8 py-3 ring-1 ring-white/10 text-white/70 rounded-xl hover:bg-white/5 font-medium"
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      >
                        Browse Jobs
                      </motion.button>
                    </motion.div>

                    <motion.button
                      onClick={() => router.push('/dashboard/candidate')}
                      className="mt-6 text-sm text-white/30 hover:text-white/50 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                    >
                      Go to Dashboard
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </DashboardLayout>
  );
}
