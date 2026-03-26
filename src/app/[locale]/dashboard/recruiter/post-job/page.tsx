'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import type { CountryCode, JobType, WorkMode } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const CURRENCIES = ['USD','EUR','GBP','CHF','CAD','INR','MXN','BRL','ARS','CNY','JPY','KRW','VND','PHP','SEK','DKK','NOK','PLN','CZK','RON'];

const PROCESSING_STAGES = [
  'Reading job description...',
  'Extracting requirements...',
  'Identifying skills...',
  'Structuring posting...',
];

const GENERATE_STAGES = [
  'Analyzing role requirements...',
  'Crafting job description...',
  'Generating skill tags...',
  'Finalizing posting...',
];

type Phase = 'choose' | 'paste' | 'generate' | 'form' | 'preview';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PostJobPage() {
  const t = useTranslations('recruiter');
  const router = useRouter();
  const supabase = createClient();

  // Auth
  const [recruiterId, setRecruiterId] = useState('');
  const [recruiterCountry, setRecruiterCountry] = useState<CountryCode>('us');
  const [recruiterIndustry, setRecruiterIndustry] = useState('');
  const [recruiterCompany, setRecruiterCompany] = useState('');

  // Navigation
  const [phase, setPhase] = useState<Phase>('choose');

  // AI Processing
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [stageLabels, setStageLabels] = useState(PROCESSING_STAGES);

  // Paste mode
  const [jdText, setJdText] = useState('');

  // Generate mode
  const [genRole, setGenRole] = useState('');
  const [genSeniority, setGenSeniority] = useState('mid');
  const [genSkills, setGenSkills] = useState<string[]>([]);
  const [genSkillInput, setGenSkillInput] = useState('');
  const [genWorkMode, setGenWorkMode] = useState('remote');
  const [genNotes, setGenNotes] = useState('');

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

  // Refinement
  const [refineFeedback, setRefineFeedback] = useState('');
  const [refining, setRefining] = useState(false);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown> | null>(null);
  const [refineHistory, setRefineHistory] = useState<string[]>([]);

  // Submit
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refineInputRef = useRef<HTMLTextAreaElement>(null);

  // ---- Load recruiter data ----
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: rec } = await supabase
        .from('recruiters')
        .select('id, country, industry, company_name')
        .eq('user_id', user.id)
        .single();

      if (!rec) { router.push('/dashboard/recruiter/onboarding'); return; }
      setRecruiterId(rec.id);
      setRecruiterCountry(rec.country as CountryCode);
      setRecruiterIndustry(rec.industry || '');
      setRecruiterCompany(rec.company_name || '');
      setCountry(rec.country as CountryCode);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Helpers ----
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

  const getFormState = useCallback(() => ({
    title, description, requirements, nice_to_haves: niceToHaves,
    skills_required: skillsRequired, job_type: jobType, work_mode: workMode,
    country, city, salary_min: salaryMin ? parseInt(salaryMin) : null,
    salary_max: salaryMax ? parseInt(salaryMax) : null,
    salary_currency: salaryCurrency, visa_sponsorship: visaSponsorship,
    experience_min: experienceMin ? parseInt(experienceMin) : null,
    experience_max: experienceMax ? parseInt(experienceMax) : null,
    education_level: educationLevel || null,
  }), [title, description, requirements, niceToHaves, skillsRequired, jobType, workMode, country, city, salaryMin, salaryMax, salaryCurrency, visaSponsorship, experienceMin, experienceMax, educationLevel]);

  const applyParsed = (p: Record<string, unknown>) => {
    if (p.title) setTitle(p.title as string);
    if (p.description) setDescription(p.description as string);
    if (p.requirements) setRequirements(p.requirements as string[]);
    if (p.nice_to_haves) setNiceToHaves(p.nice_to_haves as string[]);
    if (p.skills_required) setSkillsRequired(p.skills_required as string[]);
    if (p.experience_min != null) setExperienceMin(String(p.experience_min));
    if (p.experience_max != null) setExperienceMax(String(p.experience_max));
    if (p.education_level) setEducationLevel(p.education_level as string);
    if (p.job_type) setJobType(p.job_type as JobType);
    if (p.work_mode) setWorkMode(p.work_mode as WorkMode);
    if (p.salary_min != null) setSalaryMin(String(p.salary_min));
    if (p.salary_max != null) setSalaryMax(String(p.salary_max));
    if (p.salary_currency) setSalaryCurrency(p.salary_currency as string);
    if (p.city) setCity(p.city as string);
    if (p.visa_sponsorship != null) setVisaSponsorship(p.visa_sponsorship as boolean);
  };

  // ---- Processing animation ----
  const runProcessingAnimation = async (stages: string[]) => {
    setStageLabels(stages);
    setCompletedStages([]);
    setProcessingStage(0);
    setProcessing(true);

    for (let i = 0; i < stages.length; i++) {
      setProcessingStage(i);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setCompletedStages(prev => [...prev, i]);
    }
  };

  const stopProcessing = () => {
    setProcessing(false);
    setCompletedStages([]);
    setProcessingStage(0);
  };

  // ---- AI: Parse ----
  const handleAiParse = async () => {
    if (!jdText.trim()) return;
    setError('');

    const animationPromise = runProcessingAnimation(PROCESSING_STAGES);

    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText, mode: 'parse' }),
      });

      const data = await res.json();
      await animationPromise;

      if (!res.ok) { setError(data.error); stopProcessing(); return; }

      const p = data.parsed;
      if (!p.description) p.description = jdText;
      applyParsed(p);
      stopProcessing();
      setPhase('form');
    } catch {
      await animationPromise;
      setError('AI parsing failed');
      stopProcessing();
    }
  };

  // ---- AI: Generate ----
  const handleAiGenerate = async () => {
    if (!genRole.trim()) return;
    setError('');

    const animationPromise = runProcessingAnimation(GENERATE_STAGES);

    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          context: {
            role: genRole,
            seniority: genSeniority,
            company: recruiterCompany,
            industry: recruiterIndustry,
            skills: genSkills,
            workMode: genWorkMode,
            notes: genNotes,
          },
        }),
      });

      const data = await res.json();
      await animationPromise;

      if (!res.ok) { setError(data.error); stopProcessing(); return; }

      applyParsed(data.parsed);
      stopProcessing();
      setPhase('form');
    } catch {
      await animationPromise;
      setError('AI generation failed');
      stopProcessing();
    }
  };

  // ---- AI: Refine ----
  const handleRefine = async () => {
    if (!refineFeedback.trim() || refining) return;
    setRefining(true);
    setError('');
    setChangedFields(new Set());
    setPendingChanges(null);

    try {
      const currentState = getFormState();
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'refine',
          context: currentState,
          feedback: refineFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); setRefining(false); return; }

      const p = data.parsed;
      // Detect which fields changed
      const changed = new Set<string>();
      if (p.title && p.title !== title) changed.add('title');
      if (p.description && p.description !== description) changed.add('description');
      if (p.requirements && JSON.stringify(p.requirements) !== JSON.stringify(requirements)) changed.add('requirements');
      if (p.nice_to_haves && JSON.stringify(p.nice_to_haves) !== JSON.stringify(niceToHaves)) changed.add('niceToHaves');
      if (p.skills_required && JSON.stringify(p.skills_required) !== JSON.stringify(skillsRequired)) changed.add('skillsRequired');
      if (p.experience_min != null && String(p.experience_min) !== experienceMin) changed.add('experienceMin');
      if (p.experience_max != null && String(p.experience_max) !== experienceMax) changed.add('experienceMax');
      if (p.education_level && p.education_level !== educationLevel) changed.add('educationLevel');
      if (p.salary_min != null && String(p.salary_min) !== salaryMin) changed.add('salaryMin');
      if (p.salary_max != null && String(p.salary_max) !== salaryMax) changed.add('salaryMax');

      setPendingChanges(p);
      setChangedFields(changed);
      setRefineHistory(prev => [...prev, refineFeedback]);
      setRefineFeedback('');
    } catch {
      setError('Refinement failed');
    } finally {
      setRefining(false);
    }
  };

  const acceptChanges = () => {
    if (!pendingChanges) return;
    applyParsed(pendingChanges);
    setPendingChanges(null);
    // Keep changedFields glowing briefly then clear
    setTimeout(() => setChangedFields(new Set()), 2000);
  };

  const revertChanges = () => {
    setPendingChanges(null);
    setChangedFields(new Set());
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!title) { setError('Job title is required'); return; }
    if (!description) { setError('Job description is required'); return; }

    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title, description, requirements,
        nice_to_haves: niceToHaves,
        skills_required: skillsRequired,
        job_type: jobType, work_mode: workMode,
        country, city: city || null,
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

    const { error: rpcError } = await supabase.rpc('increment_jobs_posted', { rec_id: recruiterId });
    if (rpcError) {
      const { count } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('recruiter_id', recruiterId);
      await supabase.from('recruiters').update({ jobs_posted_count: count || 0 }).eq('id', recruiterId);
    }

    router.push('/dashboard/recruiter');
  };

  const handleSaveDraft = async () => {
    if (!title) { setError('Job title is required to save a draft'); return; }
    setSaving(true);
    setError('');

    const { error: insertError } = await supabase
      .from('jobs')
      .insert({
        recruiter_id: recruiterId,
        title, description, requirements,
        nice_to_haves: niceToHaves,
        skills_required: skillsRequired,
        job_type: jobType, work_mode: workMode,
        country, city: city || null,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        salary_currency: salaryCurrency,
        visa_sponsorship: visaSponsorship,
        experience_min: experienceMin ? parseInt(experienceMin) : null,
        experience_max: experienceMax ? parseInt(experienceMax) : null,
        education_level: educationLevel || null,
        industry: recruiterIndustry,
        match_tags: skillsRequired.map(s => s.toLowerCase()),
        is_active: false,
      });

    if (insertError) {
      setError('Failed to save draft');
      setSaving(false);
      return;
    }
    router.push('/dashboard/recruiter');
  };

  // ---- Field highlight helper ----
  const fieldGlow = (field: string) =>
    changedFields.has(field)
      ? 'ring-2 ring-blue-400/60 transition-all duration-700'
      : '';

  // ---- Shared input classes ----
  const inputCls = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none';
  const selectCls = inputCls;
  const labelCls = 'block text-sm font-medium text-white/70 mb-1';

  // ====================================================================
  // RENDER
  // ====================================================================

  return (
    <DashboardLayout role="recruiter">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('postJob')}</h1>
            {phase !== 'choose' && (
              <button
                onClick={() => setPhase('choose')}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1"
              >
                &larr; Back to creation methods
              </button>
            )}
          </div>
          <button onClick={() => router.back()} className="text-sm text-white/60 hover:text-white">
            Cancel
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Processing Animation Overlay */}
        <AnimatePresence>
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0F172A] rounded-2xl border border-white/10 p-8 max-w-md w-full mx-4 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">AI Processing</h3>
                </div>
                <div className="space-y-3">
                  {stageLabels.map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-center gap-3"
                    >
                      {completedStages.includes(i) ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      ) : processingStage === i ? (
                        <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${completedStages.includes(i) ? 'text-green-400' : processingStage === i ? 'text-white' : 'text-white/40'}`}>
                        {label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* PHASE 1: Choose Creation Method                              */}
          {/* ============================================================ */}
          {phase === 'choose' && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Paste Existing JD */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPhase('paste')}
                className="text-left bg-gradient-to-br from-blue-600/10 to-blue-800/10 rounded-2xl border border-blue-500/20 p-6 hover:border-blue-500/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Paste Existing JD</h3>
                <p className="text-sm text-white/50">Have a job description? Our AI will structure it instantly.</p>
              </motion.button>

              {/* Generate with AI */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPhase('generate')}
                className="text-left bg-gradient-to-br from-purple-600/10 to-indigo-800/10 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Generate with AI</h3>
                <p className="text-sm text-white/50">Tell us the role and we&apos;ll create a complete JD.</p>
              </motion.button>

              {/* Build Manually */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setPhase('form')}
                className="text-left bg-gradient-to-br from-emerald-600/10 to-teal-800/10 rounded-2xl border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Build Manually</h3>
                <p className="text-sm text-white/50">Full control over every detail.</p>
              </motion.button>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 2a: Paste & Parse                                      */}
          {/* ============================================================ */}
          {phase === 'paste' && (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl border border-blue-500/30 p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Paste Your Job Description</h2>
                  <p className="text-sm text-white/50">Our AI will extract and structure all the details.</p>
                </div>
              </div>

              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-blue-500/30 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-[#0F172A] text-white placeholder-gray-500"
                placeholder="Paste your full job description here — include responsibilities, requirements, skills, benefits, salary info, anything you have..."
              />

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setPhase('form')}
                  className="text-sm text-white/50 hover:text-white/70"
                >
                  Skip — fill in manually
                </button>
                <button
                  onClick={handleAiParse}
                  disabled={processing || !jdText.trim()}
                  className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Extract with AI
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 2b: Generate from Scratch                              */}
          {/* ============================================================ */}
          {phase === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-purple-600/10 to-indigo-600/10 rounded-2xl border border-purple-500/30 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Generate with AI</h2>
                  <p className="text-sm text-white/50">Tell us about the role and we&apos;ll craft a complete job description.</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Job Title / Role *</label>
                  <input
                    type="text"
                    value={genRole}
                    onChange={(e) => setGenRole(e.target.value)}
                    className={inputCls}
                    placeholder="Senior React Developer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Seniority Level</label>
                    <select value={genSeniority} onChange={(e) => setGenSeniority(e.target.value)} className={selectCls}>
                      <option value="intern">Intern / Entry Level</option>
                      <option value="junior">Junior (1-2 years)</option>
                      <option value="mid">Mid-Level (3-5 years)</option>
                      <option value="senior">Senior (5-8 years)</option>
                      <option value="staff">Staff / Principal (8+ years)</option>
                      <option value="lead">Lead / Manager</option>
                      <option value="director">Director / VP</option>
                      <option value="executive">C-Level / Executive</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Work Mode</label>
                    <select value={genWorkMode} onChange={(e) => setGenWorkMode(e.target.value)} className={selectCls}>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Key Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {genSkills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm rounded-full flex items-center gap-1">
                        {skill}
                        <button onClick={() => setGenSkills(genSkills.filter(s => s !== skill))} className="text-purple-400 hover:text-purple-200">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={genSkillInput}
                      onChange={(e) => setGenSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList(genSkills, setGenSkills, genSkillInput, setGenSkillInput))}
                      placeholder="Type a skill and press Enter..."
                      className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
                    />
                    <button
                      onClick={() => addToList(genSkills, setGenSkills, genSkillInput, setGenSkillInput)}
                      className="px-4 py-2 bg-white/5 text-white/70 rounded-lg text-sm hover:bg-white/10"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Additional Notes (optional)</label>
                  <textarea
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-none`}
                    placeholder="Any specific details — team size, tech stack, perks, tone preferences..."
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleAiGenerate}
                  disabled={processing || !genRole.trim()}
                  className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-purple-500/20 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Generate JD
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 3: Edit & Refine Form                                  */}
          {/* ============================================================ */}
          {phase === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 space-y-6">
                {/* Title */}
                <div className={fieldGlow('title')}>
                  <label className={labelCls}>Job Title *</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                    className={inputCls} placeholder="Senior Full Stack Developer" />
                </div>

                {/* Description */}
                <div className={fieldGlow('description')}>
                  <label className={labelCls}>Description *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8}
                    className={`${inputCls} resize-none`}
                    placeholder="Describe the role, responsibilities, and what success looks like..." />
                </div>

                {/* Requirements */}
                <div className={fieldGlow('requirements')}>
                  <label className="block text-sm font-medium text-white/70 mb-2">Requirements</label>
                  {requirements.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                          <span className="text-blue-500">&#8226;</span>
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
                <div className={fieldGlow('niceToHaves')}>
                  <label className="block text-sm font-medium text-white/70 mb-2">Nice to Have</label>
                  {niceToHaves.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {niceToHaves.map((nice, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                          <span className="text-green-400">&#8226;</span>
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
                <div className={fieldGlow('skillsRequired')}>
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
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm">Add</button>
                  </div>
                </div>

                {/* Job Type & Work Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Job Type</label>
                    <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)} className={selectCls}>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="freelance">Freelance</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Work Mode</label>
                    <select value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)} className={selectCls}>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Country</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode)} className={selectCls}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className={fieldGlow('city')}>
                    <label className={labelCls}>City</label>
                    <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                      className={inputCls} placeholder="New York" />
                  </div>
                </div>

                {/* Salary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className={fieldGlow('salaryMin')}>
                    <label className={labelCls}>Min Salary</label>
                    <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                      className={inputCls} placeholder="60000" />
                  </div>
                  <div className={fieldGlow('salaryMax')}>
                    <label className={labelCls}>Max Salary</label>
                    <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                      className={inputCls} placeholder="120000" />
                  </div>
                  <div>
                    <label className={labelCls}>Currency</label>
                    <select value={salaryCurrency} onChange={(e) => setSalaryCurrency(e.target.value)} className={selectCls}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Experience */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className={fieldGlow('experienceMin')}>
                    <label className={labelCls}>Min Experience (years)</label>
                    <input type="number" value={experienceMin} onChange={(e) => setExperienceMin(e.target.value)}
                      className={inputCls} placeholder="2" />
                  </div>
                  <div className={fieldGlow('experienceMax')}>
                    <label className={labelCls}>Max Experience (years)</label>
                    <input type="number" value={experienceMax} onChange={(e) => setExperienceMax(e.target.value)}
                      className={inputCls} placeholder="8" />
                  </div>
                  <div className={fieldGlow('educationLevel')}>
                    <label className={labelCls}>Education Level</label>
                    <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className={selectCls}>
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

                {/* ============================================================ */}
                {/* AI Refinement Chat                                           */}
                {/* ============================================================ */}
                <div className="border-t border-white/10 pt-6">
                  <div className="bg-gradient-to-br from-purple-600/5 to-blue-600/5 rounded-xl border border-purple-500/20 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      <h3 className="font-semibold text-white text-sm">AI Refinement</h3>
                    </div>

                    {/* History */}
                    {refineHistory.length > 0 && (
                      <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                        {refineHistory.map((msg, i) => (
                          <div key={i} className="text-xs text-white/40 bg-white/5 rounded-lg px-3 py-2">
                            {msg}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending changes banner */}
                    <AnimatePresence>
                      {pendingChanges && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"
                        >
                          <p className="text-sm text-blue-300 mb-2">
                            AI updated {changedFields.size} field{changedFields.size !== 1 ? 's' : ''}.
                            Changed fields are highlighted above.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={acceptChanges}
                              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500"
                            >
                              Accept Changes
                            </button>
                            <button
                              onClick={revertChanges}
                              className="px-4 py-1.5 bg-white/5 text-white/60 text-sm rounded-lg hover:bg-white/10"
                            >
                              Revert
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Input */}
                    <div className="flex gap-2">
                      <textarea
                        ref={refineInputRef}
                        value={refineFeedback}
                        onChange={(e) => setRefineFeedback(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleRefine();
                          }
                        }}
                        rows={2}
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                        placeholder="Make it more senior-focused, add remote perks, emphasize AI experience..."
                      />
                      <button
                        onClick={handleRefine}
                        disabled={refining || !refineFeedback.trim()}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 self-end"
                      >
                        {refining ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Thinking...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                            <span>Refine</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                  <button
                    onClick={() => setPhase('preview')}
                    disabled={!title}
                    className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-30"
                  >
                    Preview
                  </button>
                  <div className="flex gap-3">
                    <button onClick={handleSaveDraft} disabled={saving || !title}
                      className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50">
                      Save Draft
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                      className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
                      {saving ? 'Posting...' : 'Post Job'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* PHASE 4: Preview                                             */}
          {/* ============================================================ */}
          {phase === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl overflow-hidden">
                {/* Preview Header */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 px-8 py-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{title || 'Untitled Position'}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-white/60">
                        {jobType && (
                          <span className="px-2.5 py-0.5 bg-white/5 rounded-full capitalize">{jobType}</span>
                        )}
                        {workMode && (
                          <span className="px-2.5 py-0.5 bg-white/5 rounded-full capitalize">{workMode}</span>
                        )}
                        {city && country && (
                          <span>{city}, {COUNTRIES.find(c => c.code === country)?.name}</span>
                        )}
                        {!city && country && (
                          <span>{COUNTRIES.find(c => c.code === country)?.name}</span>
                        )}
                      </div>
                    </div>
                    {(salaryMin || salaryMax) && (
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-400">
                          {salaryMin && salaryMax
                            ? `${salaryCurrency} ${parseInt(salaryMin).toLocaleString()} - ${parseInt(salaryMax).toLocaleString()}`
                            : salaryMin
                              ? `From ${salaryCurrency} ${parseInt(salaryMin).toLocaleString()}`
                              : `Up to ${salaryCurrency} ${parseInt(salaryMax).toLocaleString()}`
                          }
                        </p>
                        <p className="text-xs text-white/40">per year</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  {/* Description */}
                  {description && (
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">About the Role</h3>
                      <p className="text-white/70 whitespace-pre-wrap leading-relaxed">{description}</p>
                    </div>
                  )}

                  {/* Requirements */}
                  {requirements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Requirements</h3>
                      <ul className="space-y-2">
                        {requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-white/70">
                            <span className="text-blue-400 mt-1">&#8226;</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Nice to Haves */}
                  {niceToHaves.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Nice to Have</h3>
                      <ul className="space-y-2">
                        {niceToHaves.map((nice, i) => (
                          <li key={i} className="flex items-start gap-2 text-white/60">
                            <span className="text-green-400 mt-1">&#8226;</span>
                            <span>{nice}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills */}
                  {skillsRequired.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {skillsRequired.map((skill) => (
                          <span key={skill} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                    {experienceMin && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Experience</p>
                        <p className="text-sm text-white/70">
                          {experienceMin}{experienceMax ? `-${experienceMax}` : '+'} years
                        </p>
                      </div>
                    )}
                    {educationLevel && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Education</p>
                        <p className="text-sm text-white/70 capitalize">{educationLevel === 'none' ? 'No degree required' : educationLevel}</p>
                      </div>
                    )}
                    {visaSponsorship && (
                      <div>
                        <p className="text-xs text-white/40 mb-1">Visa</p>
                        <p className="text-sm text-green-400">Sponsorship available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Actions */}
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setPhase('form')}
                  className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5"
                >
                  &larr; Back to Edit
                </button>
                <div className="flex gap-3">
                  <button onClick={handleSaveDraft} disabled={saving}
                    className="px-6 py-2.5 text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50">
                    Save Draft
                  </button>
                  <button onClick={handleSubmit} disabled={saving}
                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
                    {saving ? 'Posting...' : 'Post Job'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
