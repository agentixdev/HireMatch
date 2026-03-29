'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { createClient } from '@/lib/supabase';
import type { CountryCode } from '@/types';
import confetti from 'canvas-confetti';

/* ================================================================
   CONSTANTS
   ================================================================ */

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

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
  'Retail', 'Consulting', 'Legal', 'Media', 'Real Estate', 'Energy',
  'Agriculture', 'Transportation', 'Hospitality', 'Nonprofit', 'Government', 'Other',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

const CULTURE_VALUES = [
  { id: 'innovation', label: 'Innovation & Creativity', icon: 'solar:lightbulb-bolt-bold', color: 'from-amber-500 to-orange-500' },
  { id: 'collaboration', label: 'Collaboration & Teamwork', icon: 'solar:users-group-two-rounded-bold', color: 'from-blue-500 to-cyan-500' },
  { id: 'growth', label: 'Learning & Growth', icon: 'solar:graph-up-bold', color: 'from-green-500 to-emerald-500' },
  { id: 'transparency', label: 'Transparency & Trust', icon: 'solar:eye-bold', color: 'from-violet-500 to-purple-500' },
  { id: 'diversity', label: 'Diversity & Inclusion', icon: 'solar:global-bold', color: 'from-pink-500 to-rose-500' },
  { id: 'excellence', label: 'Excellence & Quality', icon: 'solar:star-bold', color: 'from-yellow-500 to-amber-500' },
  { id: 'agility', label: 'Agility & Speed', icon: 'solar:bolt-bold', color: 'from-red-500 to-orange-500' },
  { id: 'balance', label: 'Work-Life Balance', icon: 'solar:heart-bold', color: 'from-teal-500 to-cyan-500' },
  { id: 'impact', label: 'Social Impact', icon: 'solar:hand-heart-bold', color: 'from-emerald-500 to-green-500' },
  { id: 'autonomy', label: 'Autonomy & Ownership', icon: 'solar:shield-user-bold', color: 'from-indigo-500 to-blue-500' },
  { id: 'mentorship', label: 'Mentorship & Coaching', icon: 'solar:diploma-bold', color: 'from-purple-500 to-violet-500' },
  { id: 'results', label: 'Results-Oriented', icon: 'solar:target-bold', color: 'from-sky-500 to-blue-500' },
];

const WORK_STYLES = [
  { id: 'remote_first', label: 'Remote-First', desc: 'Distributed teams, async communication', icon: 'solar:home-2-bold' },
  { id: 'hybrid_flex', label: 'Hybrid Flexible', desc: 'Mix of office and remote days', icon: 'solar:buildings-2-bold' },
  { id: 'office_centric', label: 'Office-Centric', desc: 'In-person collaboration focus', icon: 'solar:buildings-3-bold' },
  { id: 'async_first', label: 'Async-First', desc: 'Written communication, flexible hours', icon: 'solar:document-text-bold' },
  { id: 'sprint_based', label: 'Sprint-Based', desc: 'Agile cycles with focused sprints', icon: 'solar:bolt-bold' },
  { id: 'flat_org', label: 'Flat Organization', desc: 'Minimal hierarchy, direct access', icon: 'solar:users-group-rounded-bold' },
];

const HIRING_PRIORITIES = [
  'Engineering', 'Product', 'Design', 'Data Science', 'Marketing',
  'Sales', 'Operations', 'Finance', 'HR', 'Customer Success', 'Legal', 'Executive',
];

/* ================================================================
   TEMPERATURE BACKGROUNDS
   ================================================================ */

type CultureTemp = 'cool-analytical' | 'warm-creative' | 'balanced' | 'hot-startup' | 'steady-enterprise';

const TEMP_GRADIENTS: Record<CultureTemp, string> = {
  'cool-analytical': 'from-[#0B1628] via-[#0E1D3A] to-[#0B1628]',
  'warm-creative': 'from-[#1A0F0A] via-[#2A1510] to-[#1A0F0A]',
  'balanced': 'from-[#0B1120] via-[#0F172A] to-[#0B1120]',
  'hot-startup': 'from-[#1A0A1A] via-[#2A1025] to-[#1A0A1A]',
  'steady-enterprise': 'from-[#0A1A15] via-[#0E2A1F] to-[#0A1A15]',
};

const TEMP_ACCENTS: Record<CultureTemp, { ring: string; btn: string; glow: string }> = {
  'cool-analytical': { ring: 'ring-blue-500/30', btn: 'from-blue-600 to-cyan-600', glow: 'shadow-blue-500/20' },
  'warm-creative': { ring: 'ring-orange-500/30', btn: 'from-orange-600 to-amber-600', glow: 'shadow-orange-500/20' },
  'balanced': { ring: 'ring-indigo-500/30', btn: 'from-blue-600 to-indigo-600', glow: 'shadow-indigo-500/20' },
  'hot-startup': { ring: 'ring-pink-500/30', btn: 'from-pink-600 to-purple-600', glow: 'shadow-pink-500/20' },
  'steady-enterprise': { ring: 'ring-emerald-500/30', btn: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
};

/* ================================================================
   SPRING ANIMATION VARIANTS
   ================================================================ */

const pageTransition = {
  initial: { opacity: 0, x: 60, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -60, scale: 0.96 },
};

const springConfig = { type: 'spring' as const, stiffness: 300, damping: 28 };

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: springConfig },
};

/* ================================================================
   STEP PROGRESS BAR
   ================================================================ */

function StepProgressBar({ currentStep, totalSteps, temperature }: { currentStep: number; totalSteps: number; temperature: CultureTemp }) {
  const accent = TEMP_ACCENTS[temperature];
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex-1 flex items-center gap-2">
          <motion.div
            className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]"
            initial={false}
          >
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${accent.btn}`}
              initial={{ width: '0%' }}
              animate={{ width: i < currentStep ? '100%' : i === currentStep ? '50%' : '0%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </motion.div>
          {i < totalSteps - 1 && (
            <motion.div
              className={`w-2 h-2 rounded-full ${i < currentStep ? `bg-gradient-to-r ${accent.btn}` : 'bg-white/10'}`}
              animate={{ scale: i === currentStep ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 1.5, repeat: i === currentStep ? Infinity : 0 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   STEP LABELS
   ================================================================ */

const STEPS = [
  { label: 'Company Info', icon: 'solar:buildings-2-bold', desc: 'Tell us about your company' },
  { label: 'Culture & Values', icon: 'solar:heart-bold', desc: 'Define your culture DNA' },
  { label: 'Hiring Needs', icon: 'solar:users-group-two-rounded-bold', desc: 'What are you looking for?' },
  { label: 'Review', icon: 'solar:check-circle-bold', desc: 'Confirm and launch' },
];

/* ================================================================
   AI SUGGESTION CHIP
   ================================================================ */

function AISuggestionChip({ tag, onAdd, added }: { tag: string; onAdd: () => void; added: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onAdd}
      disabled={added}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        added
          ? 'bg-green-500/15 text-green-400 ring-1 ring-green-500/30 cursor-default'
          : 'bg-white/[0.04] text-white/50 ring-1 ring-white/[0.08] hover:bg-white/10 hover:text-white/80'
      }`}
      layout
    >
      {added ? (
        <span className="flex items-center gap-1">
          <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5" />
          {tag}
        </span>
      ) : (
        <span>+ {tag}</span>
      )}
    </motion.button>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function RecruiterOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  // Step management
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1: Company Info
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [country, setCountry] = useState<CountryCode>('us');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');

  // Step 2: Culture & Values
  const [cultureTags, setCultureTags] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [workStyles, setWorkStyles] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Step 3: Hiring Needs
  const [hiringPriorities, setHiringPriorities] = useState<string[]>([]);
  const [teamGrowth, setTeamGrowth] = useState<string>('');
  const [idealCandidate, setIdealCandidate] = useState('');

  // AI & UI state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [temperature, setTemperature] = useState<CultureTemp>('balanced');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const bioDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auth check + redirect if already onboarded
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      // If already onboarded, skip to dashboard
      const { data: rec } = await supabase
        .from('recruiters')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .single();
      if (rec?.onboarding_completed_at) {
        router.push('/dashboard/recruiter');
      }
    }
    checkAuth();
  }, []);

  // AI suggestion generation when bio changes
  const generateAISuggestions = useCallback(async (description: string) => {
    if (description.length < 30) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/recruiter/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          industry,
          company_size: companySize,
          bio: description,
          culture_tags: cultureTags,
          _mode: 'suggest',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggested_culture_tags) {
          setAiSuggestions(data.suggested_culture_tags);
        }
        if (data.culture_temperature) {
          setTemperature(data.culture_temperature as CultureTemp);
        }
      }
    } catch {
      // Silently fail — AI suggestions are nice-to-have
    }
    setAiLoading(false);
  }, [companyName, industry, companySize, cultureTags]);

  // Debounced bio analysis
  useEffect(() => {
    if (bioDebounce.current) clearTimeout(bioDebounce.current);
    if (bio.length >= 30) {
      bioDebounce.current = setTimeout(() => generateAISuggestions(bio), 1200);
    }
    return () => { if (bioDebounce.current) clearTimeout(bioDebounce.current); };
  }, [bio, generateAISuggestions]);

  // Detect temperature from selected values
  useEffect(() => {
    if (selectedValues.includes('innovation') || selectedValues.includes('agility')) {
      setTemperature('warm-creative');
    } else if (selectedValues.includes('excellence') || selectedValues.includes('results')) {
      setTemperature('cool-analytical');
    } else if (selectedValues.includes('autonomy') || selectedValues.includes('agility')) {
      setTemperature('hot-startup');
    } else if (selectedValues.includes('balance') || selectedValues.includes('transparency')) {
      setTemperature('steady-enterprise');
    } else {
      setTemperature('balanced');
    }
  }, [selectedValues]);

  // Navigation
  const goNext = () => {
    if (step === 0 && !companyName) { setError('Company name is required'); return; }
    if (step === 0 && !industry) { setError('Please select an industry'); return; }
    setError('');
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setError('');
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  // Add culture tag
  const addTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !cultureTags.includes(trimmed)) {
      setCultureTags([...cultureTags, trimmed]);
      setNewTag('');
    }
  };

  // Toggle value
  const toggleValue = (id: string) => {
    setSelectedValues((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // Toggle work style
  const toggleWorkStyle = (id: string) => {
    setWorkStyles((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  // Toggle hiring priority
  const toggleHiringPriority = (dept: string) => {
    setHiringPriorities((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  // Final save
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/recruiter/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          company_website: website || null,
          industry,
          company_size: companySize,
          country,
          city: city || null,
          bio: bio || null,
          culture_tags: cultureTags,
          values_dna: {
            core_values: selectedValues,
            work_styles: workStyles,
          },
          work_style: {
            styles: workStyles,
          },
          hiring_needs: {
            priorities: hiringPriorities,
            team_growth: teamGrowth,
            ideal_candidate: idealCandidate,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Save failed');
      }

      // Success!
      setCompleted(true);

      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'],
      });

      // Navigate after celebration
      setTimeout(() => {
        router.push('/dashboard/recruiter');
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
    setSaving(false);
  };

  const accent = TEMP_ACCENTS[temperature];

  /* ================================================================
     COMPLETION SCREEN
     ================================================================ */
  if (completed) {
    return (
      <div className={`min-h-screen bg-gradient-to-b ${TEMP_GRADIENTS[temperature]} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r ${accent.btn} flex items-center justify-center shadow-2xl ${accent.glow}`}
          >
            <Icon icon="solar:check-circle-bold" className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-white mb-3"
          >
            You&apos;re All Set!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-white/50 text-lg mb-2"
          >
            {companyName} is ready to find top talent.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-white/30 text-sm"
          >
            Redirecting to your dashboard...
          </motion.p>

          {/* Pulsing dots */}
          <motion.div className="flex justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full bg-gradient-to-r ${accent.btn}`}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className={`min-h-screen bg-gradient-to-b ${TEMP_GRADIENTS[temperature]} transition-colors duration-1000`}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold text-white">Set Up Your Company</h1>
          <p className="text-white/40 mt-1 text-sm">Tell candidates what makes your company unique.</p>
        </motion.div>

        {/* Step Labels */}
        <div className="flex justify-between mb-2 px-2">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => { if (i < step) { setDirection(-1); setStep(i); } }}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                i === step ? 'text-white' : i < step ? 'text-white/40 hover:text-white/60 cursor-pointer' : 'text-white/20 cursor-default'
              }`}
              disabled={i > step}
              aria-label={`Step ${i + 1}: ${s.label}`}
              aria-current={i === step ? 'step' : undefined}
            >
              <Icon icon={s.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Progress Bar */}
        <StepProgressBar currentStep={step} totalSteps={4} temperature={temperature} />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div role="alert" className="p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <div className={`bg-[#0F172A]/80 backdrop-blur-sm ring-1 ${accent.ring} rounded-2xl p-8 overflow-hidden`}>
          <AnimatePresence mode="wait" custom={direction}>
            {/* ============ STEP 0: Company Info ============ */}
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={direction}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springConfig}
              >
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-5">
                  {/* Company Name */}
                  <motion.div variants={staggerItem}>
                    <label htmlFor="company-name" className="block text-sm font-medium text-white/70 mb-1.5">Company Name *</label>
                    <input
                      id="company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                      placeholder="Acme Corp"
                      aria-required="true"
                    />
                  </motion.div>

                  {/* Website */}
                  <motion.div variants={staggerItem}>
                    <label htmlFor="company-website" className="block text-sm font-medium text-white/70 mb-1.5">Website</label>
                    <input
                      id="company-website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      placeholder="https://acme.com"
                    />
                  </motion.div>

                  {/* Industry + Size */}
                  <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="company-industry" className="block text-sm font-medium text-white/70 mb-1.5">Industry *</label>
                      <select
                        id="company-industry"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        aria-required="true"
                      >
                        <option value="">Select...</option>
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="company-size" className="block text-sm font-medium text-white/70 mb-1.5">Company Size</label>
                      <select
                        id="company-size"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                      >
                        <option value="">Select...</option>
                        {COMPANY_SIZES.map((size) => (
                          <option key={size} value={size}>{size} employees</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>

                  {/* Country + City */}
                  <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="company-country" className="block text-sm font-medium text-white/70 mb-1.5">Country</label>
                      <select
                        id="company-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value as CountryCode)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="company-city" className="block text-sm font-medium text-white/70 mb-1.5">City</label>
                      <input
                        id="company-city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none"
                        placeholder="San Francisco"
                      />
                    </div>
                  </motion.div>

                  {/* Bio with AI */}
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="company-bio" className="text-sm font-medium text-white/70">About Your Company</label>
                      {aiLoading && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1.5 text-xs text-blue-400"
                        >
                          <Icon icon="solar:magic-stick-3-bold" className="w-3.5 h-3.5 animate-pulse" />
                          AI analyzing...
                        </motion.span>
                      )}
                    </div>
                    <textarea
                      id="company-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none transition-all"
                      placeholder="Describe your company culture, mission, and what makes it a great place to work. The AI will analyze this to suggest culture tags and matching criteria."
                    />
                    {bio.length > 0 && bio.length < 30 && (
                      <p className="text-xs text-white/30 mt-1">
                        Write at least 30 characters to activate AI suggestions
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ============ STEP 1: Culture & Values DNA ============ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springConfig}
              >
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
                  {/* Core Values Selection */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-lg font-semibold text-white mb-1">Core Values</h3>
                    <p className="text-white/40 text-sm mb-4">Select the values that define your company DNA (pick 3-5).</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {CULTURE_VALUES.map((value) => {
                        const selected = selectedValues.includes(value.id);
                        return (
                          <motion.button
                            key={value.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleValue(value.id)}
                            className={`relative p-3.5 rounded-xl text-left transition-all ${
                              selected
                                ? `bg-gradient-to-br ${value.color} bg-opacity-10 ring-2 ring-white/20`
                                : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Icon icon={value.icon} className={`w-5 h-5 ${selected ? 'text-white' : 'text-white/40'}`} />
                              {selected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute top-2 right-2"
                                >
                                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-white/80" />
                                </motion.div>
                              )}
                            </div>
                            <p className={`text-xs font-medium ${selected ? 'text-white' : 'text-white/60'}`}>
                              {value.label}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Work Style */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-lg font-semibold text-white mb-1">Work Style</h3>
                    <p className="text-white/40 text-sm mb-4">How does your team operate?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {WORK_STYLES.map((style) => {
                        const selected = workStyles.includes(style.id);
                        return (
                          <motion.button
                            key={style.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleWorkStyle(style.id)}
                            className={`flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
                              selected
                                ? `bg-blue-500/10 ring-2 ring-blue-500/30`
                                : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                          >
                            <Icon icon={style.icon} className={`w-6 h-6 flex-shrink-0 ${selected ? 'text-blue-400' : 'text-white/30'}`} />
                            <div>
                              <p className={`text-sm font-medium ${selected ? 'text-blue-300' : 'text-white/70'}`}>{style.label}</p>
                              <p className="text-xs text-white/30">{style.desc}</p>
                            </div>
                            {selected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                                <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-blue-400" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Culture Tags with AI Suggestions */}
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-lg font-semibold text-white">Culture Tags</h3>
                      {aiSuggestions.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Icon icon="solar:magic-stick-3-bold" className="w-3 h-3" />
                          AI-suggested
                        </span>
                      )}
                    </div>

                    {/* Selected tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <AnimatePresence>
                        {cultureTags.map((tag) => (
                          <motion.span
                            key={tag}
                            layout
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            className="px-3 py-1.5 bg-purple-500/15 text-purple-400 text-xs font-medium rounded-full flex items-center gap-1.5"
                          >
                            {tag}
                            <button onClick={() => setCultureTags(cultureTags.filter(t => t !== tag))} className="text-purple-500 hover:text-purple-300 transition-colors" aria-label={`Remove ${tag}`}>
                              <Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Manual add */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add custom culture tag..."
                        aria-label="Add custom culture tag"
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                      <button onClick={addTag} className="px-4 py-2.5 bg-purple-600/80 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors">
                        Add
                      </button>
                    </div>

                    {/* AI Suggestions */}
                    {aiSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {aiSuggestions.filter(s => !cultureTags.includes(s)).map((tag) => (
                          <AISuggestionChip
                            key={tag}
                            tag={tag}
                            added={cultureTags.includes(tag)}
                            onAdd={() => setCultureTags([...cultureTags, tag])}
                          />
                        ))}
                      </motion.div>
                    )}

                    {/* Default suggestions if no AI */}
                    {aiSuggestions.length === 0 && (
                      <div className="flex flex-wrap gap-2">
                        {['Remote-first', 'Work-life balance', 'Fast-paced', 'Startup culture',
                          'Diverse & inclusive', 'Innovation', 'Mentorship', 'Flat hierarchy',
                          'Flexible hours', 'Professional growth', 'Team-oriented', 'Results-driven',
                        ].filter(t => !cultureTags.includes(t)).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setCultureTags([...cultureTags, tag])}
                            className="px-3 py-1.5 bg-white/[0.04] text-white/40 text-xs rounded-full ring-1 ring-white/[0.06] hover:bg-white/10 hover:text-white/70 transition-all"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ============ STEP 2: Hiring Needs ============ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springConfig}
              >
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
                  {/* Hiring Departments */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-lg font-semibold text-white mb-1">Hiring Priorities</h3>
                    <p className="text-white/40 text-sm mb-4">Which departments are you hiring for?</p>
                    <div className="flex flex-wrap gap-2">
                      {HIRING_PRIORITIES.map((dept) => {
                        const selected = hiringPriorities.includes(dept);
                        return (
                          <motion.button
                            key={dept}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => toggleHiringPriority(dept)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              selected
                                ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30'
                                : 'bg-white/[0.04] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/10'
                            }`}
                          >
                            {selected && (
                              <Icon icon="solar:check-circle-bold" className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />
                            )}
                            {dept}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Team Growth Plan */}
                  <motion.div variants={staggerItem}>
                    <h3 className="text-lg font-semibold text-white mb-1">Growth Plan</h3>
                    <p className="text-white/40 text-sm mb-4">How quickly are you looking to grow?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'aggressive', label: 'Aggressive', desc: '10+ hires in 3 months', icon: 'solar:rocket-bold' },
                        { id: 'steady', label: 'Steady', desc: '3-9 hires in 6 months', icon: 'solar:graph-up-bold' },
                        { id: 'selective', label: 'Selective', desc: '1-2 key hires', icon: 'solar:target-bold' },
                      ].map((option) => {
                        const selected = teamGrowth === option.id;
                        return (
                          <motion.button
                            key={option.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setTeamGrowth(option.id)}
                            className={`flex flex-col items-center p-5 rounded-xl text-center transition-all ${
                              selected
                                ? `bg-gradient-to-b ${accent.btn} bg-opacity-10 ring-2 ring-white/20`
                                : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                          >
                            <Icon icon={option.icon} className={`w-8 h-8 mb-2 ${selected ? 'text-white' : 'text-white/30'}`} />
                            <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-white/60'}`}>{option.label}</p>
                            <p className={`text-xs mt-1 ${selected ? 'text-white/70' : 'text-white/30'}`}>{option.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Ideal Candidate */}
                  <motion.div variants={staggerItem}>
                    <label htmlFor="ideal-candidate" className="text-lg font-semibold text-white mb-1 block">Ideal Candidate</label>
                    <p className="text-white/40 text-sm mb-3">Describe your dream hire in a few sentences.</p>
                    <textarea
                      id="ideal-candidate"
                      value={idealCandidate}
                      onChange={(e) => setIdealCandidate(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                      placeholder="A product-minded engineer who thrives in ambiguity, ships fast, and cares about user experience..."
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {/* ============ STEP 3: Review ============ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springConfig}
              >
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
                  <motion.div variants={staggerItem}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${accent.btn} flex items-center justify-center shadow-lg ${accent.glow}`}>
                        <span className="text-white font-bold text-lg">{companyName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{companyName}</h2>
                        <p className="text-white/40 text-sm">{industry} &middot; {companySize ? `${companySize} employees` : 'Size not set'}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Company Details */}
                  <motion.div variants={staggerItem} className="bg-white/[0.03] rounded-xl p-5 ring-1 ring-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Company Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/30">Location</p>
                        <p className="text-white">{city || 'Not set'}, {COUNTRIES.find(c => c.code === country)?.name}</p>
                      </div>
                      <div>
                        <p className="text-white/30">Website</p>
                        <p className="text-white truncate">{website || 'Not set'}</p>
                      </div>
                    </div>
                    {bio && (
                      <div className="mt-3">
                        <p className="text-white/30 text-sm">About</p>
                        <p className="text-white/70 text-sm mt-1">{bio}</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Culture DNA */}
                  <motion.div variants={staggerItem} className="bg-white/[0.03] rounded-xl p-5 ring-1 ring-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Culture DNA</h3>
                    {selectedValues.length === 0 && workStyles.length === 0 && cultureTags.length === 0 && (
                      <p className="text-white/30 text-sm">No culture data added yet. You can go back to add values, work styles, and tags.</p>
                    )}
                    {selectedValues.length > 0 && (
                      <div className="mb-3">
                        <p className="text-white/30 text-xs mb-2">Core Values</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedValues.map((v) => {
                            const value = CULTURE_VALUES.find((cv) => cv.id === v);
                            return value ? (
                              <span key={v} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${value.color} text-white/90`}>
                                <Icon icon={value.icon} className="w-3.5 h-3.5" />
                                {value.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {workStyles.length > 0 && (
                      <div className="mb-3">
                        <p className="text-white/30 text-xs mb-2">Work Style</p>
                        <div className="flex flex-wrap gap-2">
                          {workStyles.map((w) => {
                            const style = WORK_STYLES.find((ws) => ws.id === w);
                            return style ? (
                              <span key={w} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full">
                                {style.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    {cultureTags.length > 0 && (
                      <div>
                        <p className="text-white/30 text-xs mb-2">Culture Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {cultureTags.map((tag) => (
                            <span key={tag} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 text-xs font-medium rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Hiring Needs */}
                  <motion.div variants={staggerItem} className="bg-white/[0.03] rounded-xl p-5 ring-1 ring-white/[0.06]">
                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Hiring Needs</h3>
                    {hiringPriorities.length === 0 && !teamGrowth && !idealCandidate && (
                      <p className="text-white/30 text-sm">No hiring needs added yet. You can go back to add priorities and growth plans.</p>
                    )}
                    {hiringPriorities.length > 0 && (
                      <div className="mb-3">
                        <p className="text-white/30 text-xs mb-2">Priority Departments</p>
                        <div className="flex flex-wrap gap-2">
                          {hiringPriorities.map((d) => (
                            <span key={d} className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-medium rounded-full">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {teamGrowth && (
                      <div className="mb-3">
                        <p className="text-white/30 text-xs mb-1">Growth Plan</p>
                        <p className="text-white/70 text-sm capitalize">{teamGrowth}</p>
                      </div>
                    )}
                    {idealCandidate && (
                      <div>
                        <p className="text-white/30 text-xs mb-1">Ideal Candidate</p>
                        <p className="text-white/70 text-sm">{idealCandidate}</p>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={goNext}
                className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r ${accent.btn} rounded-xl shadow-lg ${accent.glow} hover:shadow-xl transition-all`}
              >
                Continue
                <Icon icon="solar:arrow-right-linear" className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r ${accent.btn} rounded-xl shadow-lg ${accent.glow} hover:shadow-xl transition-all disabled:opacity-50`}
              >
                {saving ? (
                  <>
                    <Icon icon="solar:spinner-bold" className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
