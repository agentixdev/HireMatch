'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import confetti from 'canvas-confetti';

/* ================================================================
   PHASE DEFINITIONS — progressive disclosure
   ================================================================ */

type Phase = 'resume' | 'jobs' | 'actions' | 'social';

const PHASES: { id: Phase; label: string; icon: string; description: string; temp: string }[] = [
  { id: 'resume', label: 'Resume Enhancer', icon: '📄', description: 'AI rewrites your resume for maximum impact', temp: 'from-blue-600/20 to-cyan-600/20' },
  { id: 'jobs', label: 'Job Finder', icon: '🎯', description: 'Discover jobs perfectly matched to your profile', temp: 'from-emerald-600/20 to-teal-600/20' },
  { id: 'actions', label: 'Career Actions', icon: '🚀', description: 'Get a personalized action plan to level up', temp: 'from-amber-600/20 to-orange-600/20' },
  { id: 'social', label: 'Social Content', icon: '📣', description: 'Generate posts that attract recruiters', temp: 'from-purple-600/20 to-pink-600/20' },
];

const PHASE_COLORS: Record<Phase, { accent: string; ring: string; bg: string; text: string; hex: string }> = {
  resume:  { accent: 'text-cyan-400',    ring: 'ring-cyan-500/30',    bg: 'bg-cyan-500/10',    text: 'text-cyan-300',    hex: '#06b6d4' },
  jobs:    { accent: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', hex: '#10b981' },
  actions: { accent: 'text-amber-400',   ring: 'ring-amber-500/30',   bg: 'bg-amber-500/10',   text: 'text-amber-300',   hex: '#f59e0b' },
  social:  { accent: 'text-purple-400',  ring: 'ring-purple-500/30',  bg: 'bg-purple-500/10',  text: 'text-purple-300',  hex: '#a855f7' },
};

/* ================================================================
   PROCESSING MESSAGES — dramatic reveal
   ================================================================ */

const PROCESSING_MESSAGES: Record<Phase, string[]> = {
  resume: [
    'Analyzing your current resume...',
    'Identifying improvement areas...',
    'Rewriting with power verbs & metrics...',
    'Polishing your professional brand...',
    'Finalizing enhanced resume...',
  ],
  jobs: [
    'Scanning active job listings...',
    'Cross-referencing your skills...',
    'Calculating match scores...',
    'Ranking opportunities by fit...',
    'Preparing your matches...',
  ],
  actions: [
    'Evaluating your profile strength...',
    'Analyzing market demand for your skills...',
    'Identifying career growth opportunities...',
    'Mapping your competitive positioning...',
    'Building your action plan...',
  ],
  social: [
    'Studying your professional brand...',
    'Crafting attention-grabbing hooks...',
    'Optimizing for platform algorithms...',
    'Generating share-worthy content...',
    'Polishing your posts...',
  ],
};

/* ================================================================
   COMPONENT
   ================================================================ */

export default function AICoachPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth & profile
  const [loading, setLoading] = useState(true);
  const [candidateName, setCandidateName] = useState('');
  const [hasProfile, setHasProfile] = useState(false);

  // Phase state
  const [activePhase, setActivePhase] = useState<Phase>('resume');
  const [unlockedPhases, setUnlockedPhases] = useState<Set<Phase>>(new Set(['resume']));

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<Phase | null>(null);

  // Results
  const [results, setResults] = useState<Record<Phase, unknown>>({} as Record<Phase, unknown>);
  const [error, setError] = useState('');

  // Resume-specific
  const [jobDescription, setJobDescription] = useState('');

  // Social-specific
  const [platform, setPlatform] = useState<'linkedin' | 'twitter'>('linkedin');

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Apply-to-profile state
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // Spring animation for temperature
  const springProgress = useSpring(0, { stiffness: 40, damping: 15 });
  const bgOpacity = useTransform(springProgress, [0, 1], [0.05, 0.15]);

  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Auth check ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth?mode=signin'); return; }
      supabase.from('candidates').select('full_name').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setCandidateName(data.full_name || 'there');
          setHasProfile(true);
        }
        setLoading(false);
      });
    }).catch(() => { router.push('/auth?mode=signin'); });
  }, []);

  // ── Processing animation ──
  useEffect(() => {
    if (!processing || !processingPhase) return;
    const messages = PROCESSING_MESSAGES[processingPhase];
    const interval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev < messages.length - 1) return prev + 1;
        return prev;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [processing, processingPhase]);

  // ── Temperature rise during processing ──
  useEffect(() => {
    springProgress.set(processing ? 1 : 0);
  }, [processing, springProgress]);

  // ── Apply enhancement to profile ──
  const applyToProfile = useCallback(async (field: string, value: unknown, buttonId: string) => {
    setApplyingId(buttonId);
    try {
      const res = await fetch('/api/candidate/apply-enhancement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      });
      if (!res.ok) throw new Error('Failed');
      setAppliedIds(prev => new Set([...prev, buttonId]));
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.7 },
        colors: ['#22c55e', '#10b981', '#34d399'],
      });
    } catch {
      setError('Failed to apply enhancement to profile');
    } finally {
      setApplyingId(null);
    }
  }, []);

  // ── Copy to clipboard ──
  const copyText = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);

    // Micro-feedback
    confetti({
      particleCount: 15,
      spread: 40,
      origin: { y: 0.8 },
      colors: ['#3b82f6', '#8b5cf6'],
      scalar: 0.6,
    });
  }, []);

  // ── Run AI phase ──
  const runPhase = useCallback(async (phase: Phase) => {
    setError('');
    setProcessing(true);
    setProcessingPhase(phase);
    setProcessingStep(0);

    try {
      const body: Record<string, string> = { action: '' };

      switch (phase) {
        case 'resume':
          body.action = 'improve-resume';
          if (jobDescription.trim()) body.jobDescription = jobDescription;
          break;
        case 'jobs':
          body.action = 'find-jobs';
          break;
        case 'actions':
          body.action = 'recommend-actions';
          break;
        case 'social':
          body.action = 'social-content';
          body.platform = platform;
          break;
      }

      const res = await fetch('/api/candidate/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');

      // Store result
      setResults(prev => ({ ...prev, [phase]: json.data }));

      // Unlock next phase
      const idx = PHASES.findIndex(p => p.id === phase);
      if (idx < PHASES.length - 1) {
        const nextPhase = PHASES[idx + 1].id;
        setUnlockedPhases(prev => new Set([...prev, nextPhase]));
      }

      // Victory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [PHASE_COLORS[phase].hex, '#ffffff', '#6366f1'],
      });

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setProcessing(false);
      setProcessingPhase(null);
    }
  }, [jobDescription, platform]);

  // ── Loading state ──
  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasProfile) {
    return (
      <DashboardLayout role="candidate">
        <div className="text-center py-20">
          <h2 className="text-xl font-bold text-white mb-3">Complete your profile first</h2>
          <p className="text-white/50 mb-6">Upload your CV or fill in your profile to unlock the AI Coach.</p>
          <Link href="/dashboard/candidate/onboarding" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors">
            Set Up Profile
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const colors = PHASE_COLORS[activePhase];
  const phaseInfo = PHASES.find(p => p.id === activePhase)!;
  const phaseResult = results[activePhase];

  return (
    <DashboardLayout role="candidate">
      {/* Temperature background */}
      <motion.div
        className={`fixed inset-0 bg-gradient-to-br ${phaseInfo.temp} pointer-events-none z-0`}
        style={{ opacity: bgOpacity }}
        key={activePhase}
        initial={{ opacity: 0 }}
        animate={{ opacity: processing ? 0.15 : 0.05 }}
        transition={{ duration: 1.5 }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <h1 className="text-3xl font-bold text-white">
            AI Career Coach
          </h1>
          <p className="text-white/50 mt-1">
            Hey {candidateName} — let AI supercharge your career in 4 phases.
          </p>
        </motion.div>

        {/* ── Phase pills ── */}
        <div className="flex flex-wrap gap-3">
          {PHASES.map((phase, i) => {
            const unlocked = unlockedPhases.has(phase.id);
            const isActive = activePhase === phase.id;
            const hasResult = !!results[phase.id];
            const phaseColor = PHASE_COLORS[phase.id];

            return (
              <motion.button
                key={phase.id}
                onClick={() => unlocked && setActivePhase(phase.id)}
                disabled={!unlocked || processing}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 200 }}
                className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? `${phaseColor.bg} ${phaseColor.text} ring-2 ${phaseColor.ring} shadow-lg`
                    : unlocked
                    ? 'bg-white/5 text-white/60 hover:bg-white/10 ring-1 ring-white/10'
                    : 'bg-white/[0.02] text-white/20 cursor-not-allowed ring-1 ring-white/5'
                }`}
              >
                <span className="text-lg">{phase.icon}</span>
                <span>{phase.label}</span>
                {hasResult && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-green-400"
                  />
                )}
                {!unlocked && (
                  <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Phase content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePhase}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={`bg-[#0F172A]/80 backdrop-blur-sm ring-1 ring-white/10 rounded-2xl p-6 sm:p-8`}
          >
            {/* Phase header */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{phaseInfo.icon}</span>
              <h2 className={`text-xl font-bold ${colors.accent}`}>{phaseInfo.label}</h2>
            </div>
            <p className="text-white/40 text-sm mb-6">{phaseInfo.description}</p>

            {/* Phase-specific inputs */}
            {activePhase === 'resume' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Target job description <span className="text-white/30">(optional — paste a JD to tailor your resume)</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste a job description here to get a tailored resume improvement..."
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 ring-1 ring-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-cyan-500/40 transition-colors resize-none"
                />
              </div>
            )}

            {activePhase === 'social' && (
              <div className="flex gap-3 mb-6">
                {(['linkedin', 'twitter'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      platform === p
                        ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10 ring-1 ring-white/10'
                    }`}
                  >
                    {p === 'linkedin' ? 'LinkedIn' : 'Twitter / X'}
                  </button>
                ))}
              </div>
            )}

            {/* Run button */}
            {!processing && (
              <motion.button
                onClick={() => runPhase(activePhase)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r ${
                  activePhase === 'resume' ? 'from-cyan-600 to-blue-600 shadow-cyan-500/20' :
                  activePhase === 'jobs' ? 'from-emerald-600 to-teal-600 shadow-emerald-500/20' :
                  activePhase === 'actions' ? 'from-amber-600 to-orange-600 shadow-amber-500/20' :
                  'from-purple-600 to-pink-600 shadow-purple-500/20'
                } shadow-lg transition-all hover:shadow-xl`}
              >
                {phaseResult ? `Re-run ${phaseInfo.label}` : `Launch ${phaseInfo.label}`}
              </motion.button>
            )}

            {/* ── Processing overlay ── */}
            <AnimatePresence>
              {processing && processingPhase === activePhase && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="bg-black/30 rounded-xl p-8 text-center">
                    {/* Pulsing orb */}
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`w-16 h-16 rounded-full mx-auto mb-6 ${
                        activePhase === 'resume' ? 'bg-cyan-500/30' :
                        activePhase === 'jobs' ? 'bg-emerald-500/30' :
                        activePhase === 'actions' ? 'bg-amber-500/30' :
                        'bg-purple-500/30'
                      } flex items-center justify-center`}
                    >
                      <span className="text-2xl">{phaseInfo.icon}</span>
                    </motion.div>

                    {/* Step messages */}
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={processingStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`text-sm font-medium ${colors.text}`}
                      >
                        {PROCESSING_MESSAGES[activePhase][processingStep]}
                      </motion.p>
                    </AnimatePresence>

                    {/* Progress bar */}
                    <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden max-w-xs mx-auto">
                      <motion.div
                        className={`h-full rounded-full ${
                          activePhase === 'resume' ? 'bg-cyan-500' :
                          activePhase === 'jobs' ? 'bg-emerald-500' :
                          activePhase === 'actions' ? 'bg-amber-500' :
                          'bg-purple-500'
                        }`}
                        initial={{ width: '5%' }}
                        animate={{ width: `${Math.min(95, (processingStep + 1) / PROCESSING_MESSAGES[activePhase].length * 100)}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Results ── */}
        <div ref={resultsRef}>
          <AnimatePresence mode="wait">
            {phaseResult != null && !processing ? (
              <motion.div
                key={`result-${activePhase}`}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                className="space-y-6"
              >
                {activePhase === 'resume' && <ResumeResults data={phaseResult as ResumeData} copyText={copyText} copiedId={copiedId} applyToProfile={applyToProfile} applyingId={applyingId} appliedIds={appliedIds} />}
                {activePhase === 'jobs' && <JobResults data={phaseResult as JobsData} />}
                {activePhase === 'actions' && <ActionResults data={phaseResult as ActionsData} applyToProfile={applyToProfile} applyingId={applyingId} appliedIds={appliedIds} setActivePhase={setActivePhase} runPhase={runPhase} />}
                {activePhase === 'social' && <SocialResults data={phaseResult as SocialData} copyText={copyText} copiedId={copiedId} platform={platform} />}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ================================================================
   TYPES
   ================================================================ */

interface ResumeData {
  improved_headline: string;
  improved_bio: string;
  improved_skills: string[];
  added_skills: string[];
  work_history_improvements: Array<{ company: string; original_description: string; improved_description: string }>;
  headline_score_before: number;
  headline_score_after: number;
  bio_score_before: number;
  bio_score_after: number;
  overall_score_before: number;
  overall_score_after: number;
  key_improvements: string[];
}

interface JobsData {
  matches: Array<{
    job_index: number;
    match_score: number;
    match_reasons: string[];
    gaps: string[];
    tip: string;
    job: {
      id: string;
      title: string;
      industry: string;
      city: string;
      country: string;
      work_mode: string;
      salary_min: number;
      salary_max: number;
      salary_currency: string;
      skills_required: string[];
      recruiter: { company_name: string; company_logo_url: string } | null;
    };
  }>;
  message?: string;
}

interface ActionPayload {
  field?: string;
  value?: unknown;
  label?: string;
  skills?: string[];
  url?: string;
  generate_type?: string;
  context?: string;
}

interface CriticalAction {
  action: string;
  impact: string;
  effort: string;
  reason: string;
  action_type?: 'update_field' | 'go_to_resume' | 'go_to_social' | 'upload_cv' | 'upload_photo' | 'add_skills' | 'external_link' | 'generate';
  action_payload?: ActionPayload;
}

interface ActionsData {
  profile_grade: string;
  profile_score: number;
  critical_actions: CriticalAction[];
  skill_gaps: string[];
  certification_suggestions: string[];
  career_trajectory: string;
  market_demand: string;
  salary_insight: string;
}

interface SocialData {
  posts: Array<{
    type: string;
    content: string;
    hook: string;
    estimated_engagement: string;
    best_time_to_post: string;
  }>;
  profile_optimization: {
    headline_suggestion: string;
    about_section: string;
    banner_idea: string;
  };
}

/* ================================================================
   RESULT COMPONENTS
   ================================================================ */

function ScoreComparison({ label, before, after }: { label: string; before: number; after: number }) {
  const improvement = after - before;
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <p className="text-xs text-white/40 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-lg text-white/40 font-mono">{before}</span>
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="text-2xl font-bold text-emerald-400 font-mono"
        >
          {after}
        </motion.span>
        <span className="text-xs text-emerald-400/70 font-medium">+{improvement}%</span>
      </div>
    </div>
  );
}

function CopyButton({ text, id, copiedId, copyText }: { text: string; id: string; copiedId: string | null; copyText: (t: string, id: string) => void }) {
  return (
    <button
      onClick={() => copyText(text, id)}
      className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 ring-1 ring-white/10 rounded-lg text-white/50 hover:text-white/80 transition-all flex items-center gap-1.5"
    >
      {copiedId === id ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Copy
        </>
      )}
    </button>
  );
}

/* ── Apply Button ── */
function ApplyButton({ id, label, onClick, applyingId, appliedIds }: {
  id: string;
  label: string;
  onClick: () => void;
  applyingId: string | null;
  appliedIds: Set<string>;
}) {
  const applied = appliedIds.has(id);
  const applying = applyingId === id;

  return (
    <motion.button
      onClick={onClick}
      disabled={applied || applying}
      whileHover={!applied && !applying ? { scale: 1.03 } : undefined}
      whileTap={!applied && !applying ? { scale: 0.97 } : undefined}
      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
        applied
          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 cursor-default'
          : applying
          ? 'bg-white/5 text-white/30 ring-1 ring-white/10 cursor-wait'
          : 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-600/30 cursor-pointer'
      }`}
    >
      {applied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Applied
        </>
      ) : applying ? (
        <>
          <div className="w-3 h-3 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
          Applying...
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          {label}
        </>
      )}
    </motion.button>
  );
}

/* ── Resume Results ── */
function ResumeResults({ data, copyText, copiedId, applyToProfile, applyingId, appliedIds }: {
  data: ResumeData;
  copyText: (t: string, id: string) => void;
  copiedId: string | null;
  applyToProfile: (field: string, value: unknown, id: string) => Promise<void>;
  applyingId: string | null;
  appliedIds: Set<string>;
}) {
  return (
    <div className="space-y-6">
      {/* Apply All — hero button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 ring-1 ring-emerald-500/30 rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Apply All Enhancements to Your Profile</h3>
            <p className="text-xs text-white/40 mt-1">One click to update your headline, bio, skills, and work history</p>
          </div>
          <ApplyButton
            id="apply-all-resume"
            label="Apply All"
            applyingId={applyingId}
            appliedIds={appliedIds}
            onClick={() => applyToProfile('all_resume', {
              headline: data.improved_headline,
              bio: data.improved_bio,
              skills: data.improved_skills,
              added_skills: data.added_skills,
              work_history: data.work_history_improvements,
            }, 'apply-all-resume')}
          />
        </div>
      </motion.div>

      {/* Score cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreComparison label="Headline Score" before={data.headline_score_before} after={data.headline_score_after} />
        <ScoreComparison label="Bio Score" before={data.bio_score_before} after={data.bio_score_after} />
        <ScoreComparison label="Overall Resume" before={data.overall_score_before} after={data.overall_score_after} />
      </div>

      {/* Improved headline */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cyan-400">Enhanced Headline</h3>
          <div className="flex gap-2">
            <ApplyButton id="apply-headline" label="Apply" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('headline', data.improved_headline, 'apply-headline')} />
            <CopyButton text={data.improved_headline} id="headline" copiedId={copiedId} copyText={copyText} />
          </div>
        </div>
        <p className="text-white font-medium">{data.improved_headline}</p>
      </motion.div>

      {/* Improved bio */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cyan-400">Enhanced Bio</h3>
          <div className="flex gap-2">
            <ApplyButton id="apply-bio" label="Apply" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('bio', data.improved_bio, 'apply-bio')} />
            <CopyButton text={data.improved_bio} id="bio" copiedId={copiedId} copyText={copyText} />
          </div>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{data.improved_bio}</p>
      </motion.div>

      {/* Added skills */}
      {data.added_skills && data.added_skills.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-cyan-400">Skills You Should Add</h3>
            <ApplyButton id="apply-skills" label="Add to Profile" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('skills', data.added_skills, 'apply-skills')} />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.added_skills.map(skill => (
              <span key={skill} className="px-3 py-1 bg-cyan-500/10 text-cyan-300 text-xs rounded-full ring-1 ring-cyan-500/20">
                + {skill}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Work history improvements */}
      {data.work_history_improvements && data.work_history_improvements.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-cyan-400">Work History Upgrades</h3>
          {data.work_history_improvements.map((wh, i) => (
            <div key={i} className="space-y-2">
              <p className="text-white font-medium text-sm">{wh.company}</p>
              {wh.original_description && (
                <div className="bg-red-500/5 rounded-lg p-3">
                  <p className="text-xs text-red-400/60 mb-1">Before:</p>
                  <p className="text-white/40 text-xs line-through">{wh.original_description}</p>
                </div>
              )}
              <div className="bg-emerald-500/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-emerald-400/60">After:</p>
                  <CopyButton text={wh.improved_description} id={`wh-${i}`} copiedId={copiedId} copyText={copyText} />
                </div>
                <p className="text-white/80 text-xs">{wh.improved_description}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Key improvements summary */}
      {data.key_improvements && data.key_improvements.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 ring-1 ring-cyan-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Key Improvements Made</h3>
          <ul className="space-y-2">
            {data.key_improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-emerald-400 mt-0.5">✓</span>
                {imp}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

/* ── Job Results ── */
function JobResults({ data }: { data: JobsData }) {
  if (data.message || !data.matches?.length) {
    return (
      <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8 text-center">
        <p className="text-white/50">{data.message || 'No matching jobs found. Check back as new jobs are posted.'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data.matches.map((match, i) => {
        const rec = match.job?.recruiter as { company_name?: string } | null;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
            className="bg-[#0F172A] ring-1 ring-emerald-500/20 rounded-xl p-5 hover:ring-emerald-500/40 transition-all"
          >
            {/* Score badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">{match.job?.title}</h3>
                <p className="text-white/40 text-xs">{rec?.company_name || 'Company'}</p>
              </div>
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                match.match_score >= 80 ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' :
                match.match_score >= 60 ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30' :
                'bg-white/10 text-white/60 ring-2 ring-white/10'
              }`}>
                {match.match_score}%
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-2 mb-3">
              {match.job?.work_mode && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-full">{match.job.work_mode}</span>}
              {match.job?.city && <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-full">{match.job.city}</span>}
              {match.job?.salary_max && (
                <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded-full">
                  {match.job.salary_currency || 'USD'} {Math.round(match.job.salary_min / 1000)}k-{Math.round(match.job.salary_max / 1000)}k
                </span>
              )}
            </div>

            {/* Match reasons */}
            <ul className="space-y-1 mb-3">
              {match.match_reasons?.slice(0, 2).map((r, j) => (
                <li key={j} className="text-xs text-emerald-400/70 flex items-start gap-1.5">
                  <span className="mt-0.5">✓</span> {r}
                </li>
              ))}
            </ul>

            {/* Tip */}
            {match.tip && (
              <p className="text-xs text-amber-400/70 bg-amber-500/5 rounded-lg p-2">
                💡 {match.tip}
              </p>
            )}

            {/* Apply link */}
            <Link
              href={`/jobs/${match.job?.id}`}
              className="mt-3 block text-center py-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              View Job →
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Action Button for each critical action ── */
function ActionExecuteButton({ action, index, applyToProfile, applyingId, appliedIds, setActivePhase, runPhase }: {
  action: CriticalAction;
  index: number;
  applyToProfile: (field: string, value: unknown, id: string) => Promise<void>;
  applyingId: string | null;
  appliedIds: Set<string>;
  setActivePhase: (phase: Phase) => void;
  runPhase: (phase: Phase) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const router = useRouter();
  const buttonId = `action-${index}`;
  const payload = action.action_payload;
  const label = payload?.label || 'Do It';

  if (!action.action_type) return null;

  const handleClick = async () => {
    switch (action.action_type) {
      case 'update_field':
        if (payload?.field && payload?.value !== undefined) {
          await applyToProfile(payload.field, payload.value, buttonId);
        }
        break;
      case 'go_to_resume':
        setActivePhase('resume');
        setTimeout(() => runPhase('resume'), 300);
        break;
      case 'go_to_social':
        setActivePhase('social');
        setTimeout(() => runPhase('social'), 300);
        break;
      case 'upload_cv':
        router.push('/dashboard/candidate');
        break;
      case 'upload_photo':
        router.push('/dashboard/candidate');
        break;
      case 'add_skills':
        if (payload?.skills?.length) {
          await applyToProfile('skills', payload.skills, buttonId);
        }
        break;
      case 'external_link':
        if (payload?.url) {
          window.open(payload.url, '_blank', 'noopener,noreferrer');
        }
        break;
      case 'generate': {
        setGenerating(true);
        try {
          const res = await fetch('/api/candidate/ai-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'improve-resume',
              jobDescription: payload?.context || '',
            }),
          });
          if (res.ok) {
            const { data } = await res.json();
            if (payload?.generate_type === 'niche_bio' && data?.improved_bio) {
              setGenerated(data.improved_bio);
            } else if (payload?.generate_type === 'achievement_bullets' && data?.work_history_improvements?.length) {
              setGenerated(data.work_history_improvements.map((w: { company: string; improved_description: string }) => `${w.company}: ${w.improved_description}`).join('\n\n'));
            } else if (payload?.generate_type === 'elevator_pitch' && data?.improved_headline) {
              setGenerated(`${data.improved_headline}\n\n${data.improved_bio || ''}`);
            } else {
              setGenerated(data?.improved_bio || data?.improved_headline || 'Generated content ready — use Resume Enhancer for full results.');
            }
          }
        } catch { /* ignore */ } finally {
          setGenerating(false);
        }
        break;
      }
    }
  };

  const actionIcons: Record<string, string> = {
    update_field: 'M5 13l4 4L19 7',
    go_to_resume: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    go_to_social: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    upload_cv: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    upload_photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    add_skills: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
    external_link: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
    generate: 'M13 10V3L4 14h7v7l9-11h-7z',
  };

  const applied = appliedIds.has(buttonId);
  const applying = applyingId === buttonId;
  const isNav = action.action_type === 'go_to_resume' || action.action_type === 'go_to_social' || action.action_type === 'upload_cv' || action.action_type === 'upload_photo';
  const isExternal = action.action_type === 'external_link';

  return (
    <div className="mt-3 space-y-2">
      <motion.button
        onClick={handleClick}
        disabled={applied || applying || generating}
        whileHover={!applied && !applying ? { scale: 1.02 } : undefined}
        whileTap={!applied && !applying ? { scale: 0.98 } : undefined}
        className={`w-full px-4 py-2.5 text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
          applied
            ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30 cursor-default'
            : applying || generating
            ? 'bg-white/5 text-white/30 ring-1 ring-white/10 cursor-wait'
            : isNav
            ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30 hover:bg-blue-600/30'
            : isExternal
            ? 'bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/30 hover:bg-purple-600/30'
            : action.action_type === 'generate'
            ? 'bg-amber-600/20 text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-600/30'
            : 'bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-600/30'
        }`}
      >
        {applied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Done
          </>
        ) : applying || generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-current rounded-full animate-spin" />
            {generating ? 'Generating...' : 'Applying...'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={actionIcons[action.action_type] || actionIcons.update_field} />
            </svg>
            {label}
            {isExternal && (
              <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          </>
        )}
      </motion.button>

      {/* Generated content preview */}
      {generated && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-black/30 rounded-lg p-3 ring-1 ring-amber-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-medium">Generated Content</span>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(generated); }}
                className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-white/50 hover:text-white/80 cursor-pointer"
              >
                Copy
              </button>
              <button
                onClick={() => applyToProfile('bio', generated, buttonId + '-apply')}
                className="px-2 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-emerald-400 cursor-pointer"
              >
                Apply to Bio
              </button>
            </div>
          </div>
          <p className="text-white/60 text-xs whitespace-pre-wrap leading-relaxed">{generated}</p>
        </motion.div>
      )}
    </div>
  );
}

/* ── Action Results ── */
function ActionResults({ data, applyToProfile, applyingId, appliedIds, setActivePhase, runPhase }: {
  data: ActionsData;
  applyToProfile: (field: string, value: unknown, id: string) => Promise<void>;
  applyingId: string | null;
  appliedIds: Set<string>;
  setActivePhase: (phase: Phase) => void;
  runPhase: (phase: Phase) => void;
}) {
  const gradeColors: Record<string, string> = {
    A: 'from-emerald-500 to-green-500',
    B: 'from-blue-500 to-cyan-500',
    C: 'from-amber-500 to-yellow-500',
    D: 'from-orange-500 to-red-500',
    F: 'from-red-600 to-red-800',
  };
  const gradeColor = gradeColors[data.profile_grade] || gradeColors['C'];

  return (
    <div className="space-y-6">
      {/* Grade card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-xl p-6 text-center"
      >
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Profile Grade</p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
          className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradeColor} flex items-center justify-center mx-auto mb-3 shadow-lg`}
        >
          <span className="text-3xl font-black text-white">{data.profile_grade}</span>
        </motion.div>
        <p className="text-white/50 text-sm">Score: <span className="text-white font-bold">{data.profile_score}/100</span></p>
      </motion.div>

      {/* Market & salary insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Market Demand</h3>
          <p className="text-white/70 text-sm">{data.market_demand}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Salary Insight</h3>
          <p className="text-white/70 text-sm">{data.salary_insight}</p>
        </motion.div>
      </div>

      {/* Career trajectory */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 ring-1 ring-amber-500/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Career Trajectory</h3>
        <p className="text-white/70 text-sm">{data.career_trajectory}</p>
      </motion.div>

      {/* Critical actions with executable buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Action Plan</h3>
        {data.critical_actions?.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-4"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                action.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                action.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{action.action}</p>
                <p className="text-white/40 text-xs mt-1">{action.reason}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    action.impact === 'high' ? 'bg-red-500/10 text-red-400' :
                    action.impact === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {action.impact} impact
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-white/40">
                    {action.effort} effort
                  </span>
                </div>
              </div>
            </div>
            <ActionExecuteButton
              action={action}
              index={i}
              applyToProfile={applyToProfile}
              applyingId={applyingId}
              appliedIds={appliedIds}
              setActivePhase={setActivePhase}
              runPhase={runPhase}
            />
          </motion.div>
        ))}
      </div>

      {/* Skill gaps & certs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.skill_gaps && data.skill_gaps.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-amber-400">Trending Skills to Learn</h3>
              <ApplyButton
                id="apply-skill-gaps"
                label="Add All to Profile"
                applyingId={applyingId}
                appliedIds={appliedIds}
                onClick={() => applyToProfile('skills', data.skill_gaps, 'apply-skill-gaps')}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {data.skill_gaps.map(s => (
                <span key={s} className="px-2.5 py-1 bg-amber-500/10 text-amber-300 text-xs rounded-full ring-1 ring-amber-500/20">
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        )}
        {data.certification_suggestions && data.certification_suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">Recommended Certifications</h3>
            <ul className="space-y-1.5">
              {data.certification_suggestions.map(c => (
                <li key={c} className="text-xs text-white/60 flex items-start gap-2">
                  <span className="text-amber-400">🏆</span> {c}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Social Results ── */
function SocialResults({ data, copyText, copiedId, platform }: { data: SocialData; copyText: (t: string, id: string) => void; copiedId: string | null; platform: string }) {
  return (
    <div className="space-y-6">
      {/* Generated posts */}
      {data.posts?.map((post, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, type: 'spring' }}
          className="bg-[#0F172A] ring-1 ring-purple-500/20 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full ring-1 ring-purple-500/20">
                {post.type.replace(/-/g, ' ')}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                post.estimated_engagement === 'high' ? 'bg-emerald-500/10 text-emerald-400' :
                post.estimated_engagement === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                'bg-white/5 text-white/40'
              }`}>
                {post.estimated_engagement} engagement
              </span>
            </div>
            <CopyButton text={post.content} id={`post-${i}`} copiedId={copiedId} copyText={copyText} />
          </div>

          {/* Hook preview */}
          <p className="text-purple-300 font-medium text-sm mb-2">{post.hook}</p>

          {/* Full post */}
          <div className="bg-black/20 rounded-lg p-4">
            <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-white/30">Best time: {post.best_time_to_post}</p>
            <div className="flex gap-2">
              {platform === 'linkedin' && (
                <button
                  onClick={() => {
                    copyText(post.content, 'linkedin-' + i);
                    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
                  }}
                  className="px-3 py-1.5 bg-blue-700/20 text-blue-400 text-xs rounded-lg hover:bg-blue-700/30 transition-colors cursor-pointer"
                >
                  {copiedId === 'linkedin-' + i ? '✓ Copied — paste in LinkedIn' : 'Share on LinkedIn'}
                </button>
              )}
              {platform === 'twitter' && (
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content.slice(0, 260))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/10 text-white/60 text-xs rounded-lg hover:bg-white/20 transition-colors"
                >
                  Post on X
                </a>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Profile optimization */}
      {data.profile_optimization && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 ring-1 ring-purple-500/20 rounded-xl p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-white">Profile Optimization Tips</h3>

          <div>
            <p className="text-xs text-purple-400 mb-1">Headline</p>
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-sm flex-1">{data.profile_optimization.headline_suggestion}</p>
              <CopyButton text={data.profile_optimization.headline_suggestion} id="opt-headline" copiedId={copiedId} copyText={copyText} />
            </div>
          </div>

          <div>
            <p className="text-xs text-purple-400 mb-1">About Section</p>
            <div className="flex items-start justify-between gap-2">
              <p className="text-white/70 text-sm flex-1">{data.profile_optimization.about_section}</p>
              <CopyButton text={data.profile_optimization.about_section} id="opt-about" copiedId={copiedId} copyText={copyText} />
            </div>
          </div>

          <div>
            <p className="text-xs text-purple-400 mb-1">Banner Image Idea</p>
            <p className="text-white/70 text-sm">{data.profile_optimization.banner_idea}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
