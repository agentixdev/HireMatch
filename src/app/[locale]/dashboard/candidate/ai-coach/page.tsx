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

interface SectionAnalysis {
  section: string;
  score_before: number;
  score_after: number;
  verdict: 'strong' | 'adequate' | 'weak' | 'missing';
  suggestion: string;
}

interface AchievementRewrite {
  original: string;
  rewritten: string;
  impact_type: 'revenue' | 'efficiency' | 'leadership' | 'technical' | 'growth';
}

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
  // New fields
  ats_score?: number;
  ats_issues?: string[];
  ats_keywords_missing?: string[];
  ats_keywords_present?: string[];
  industry_percentile?: number;
  industry_benchmark?: string;
  power_summary?: string;
  linkedin_headline?: string;
  red_flags?: string[];
  section_analysis?: SectionAnalysis[];
  achievement_rewrites?: AchievementRewrite[];
  career_positioning?: string;
  competitive_edge?: string;
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

/* ── Animated Score Gauge (SVG ring) ── */
function ScoreGauge({ score, size = 120, strokeWidth = 8, color, label, delay = 0 }: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: 'green' | 'amber' | 'red' | 'cyan';
  label?: string;
  delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const springVal = useSpring(0, { stiffness: 60, damping: 20 });
  const strokeDashoffset = useTransform(springVal, [0, 100], [circumference, 0]);

  useEffect(() => {
    const timer = setTimeout(() => springVal.set(score), delay * 1000);
    return () => clearTimeout(timer);
  }, [score, delay, springVal]);

  const colorMap = {
    green: { stroke: '#10b981', glow: 'drop-shadow(0 0 8px rgba(16,185,129,0.4))', text: 'text-emerald-400', bg: 'rgba(16,185,129,0.08)' },
    amber: { stroke: '#f59e0b', glow: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))', text: 'text-amber-400', bg: 'rgba(245,158,11,0.08)' },
    red: { stroke: '#ef4444', glow: 'drop-shadow(0 0 8px rgba(239,68,68,0.4))', text: 'text-red-400', bg: 'rgba(239,68,68,0.08)' },
    cyan: { stroke: '#06b6d4', glow: 'drop-shadow(0 0 8px rgba(6,182,212,0.4))', text: 'text-cyan-400', bg: 'rgba(6,182,212,0.08)' },
  };
  const c = colorMap[color];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ filter: c.glow }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.stroke} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference}
            style={{ strokeDashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' as const, stiffness: 120, damping: 20, delay: delay + 0.3 }}
            className={`text-2xl font-black ${c.text} font-mono`}
          >
            {score}
          </motion.span>
        </div>
      </div>
      {label && <p className="text-xs text-white/40 mt-2 text-center">{label}</p>}
    </div>
  );
}

function scoreColor(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

const IMPACT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  revenue: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  efficiency: { bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  leadership: { bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  technical: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', ring: 'ring-cyan-500/20' },
  growth: { bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/20' },
};

const VERDICT_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  strong: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  adequate: { bg: 'bg-amber-500/10', text: 'text-amber-400', ring: 'ring-amber-500/30' },
  weak: { bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-red-500/30' },
  missing: { bg: 'bg-red-500/20', text: 'text-red-300', ring: 'ring-red-500/40' },
};

const springTransition = { type: 'spring' as const, stiffness: 120, damping: 20 };

/* ── Resume Results ── */
function ResumeResults({ data, copyText, copiedId, applyToProfile, applyingId, appliedIds }: {
  data: ResumeData;
  copyText: (t: string, id: string) => void;
  copiedId: string | null;
  applyToProfile: (field: string, value: unknown, id: string) => Promise<void>;
  applyingId: string | null;
  appliedIds: Set<string>;
}) {
  const atsVerdict = (data.ats_score ?? 0) >= 80 ? 'ATS-Friendly' : (data.ats_score ?? 0) >= 60 ? 'Needs Work' : 'At Risk';
  const atsVerdictColor = (data.ats_score ?? 0) >= 80 ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' : (data.ats_score ?? 0) >= 60 ? 'bg-amber-500/20 text-amber-400 ring-amber-500/30' : 'bg-red-500/20 text-red-400 ring-red-500/30';

  let sectionIdx = 0;
  const stagger = (extra = 0) => {
    sectionIdx++;
    return { ...springTransition, delay: sectionIdx * 0.1 + extra };
  };

  return (
    <div className="space-y-6">

      {/* ── 1. Dramatic Score Reveal ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={stagger()}
        className="bg-[#0F172A]/90 backdrop-blur-sm ring-1 ring-cyan-500/20 rounded-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <div className="text-center">
            <ScoreGauge score={data.overall_score_after} size={140} strokeWidth={10} color={scoreColor(data.overall_score_after)} label="Overall Score" delay={0.3} />
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-white/30 line-through font-mono text-sm">{data.overall_score_before}</span>
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              <span className="text-emerald-400 font-bold font-mono">{data.overall_score_after}</span>
              <span className="text-xs text-emerald-400/60">+{data.overall_score_after - data.overall_score_before}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ScoreGauge score={data.headline_score_after} size={90} strokeWidth={6} color={scoreColor(data.headline_score_after)} label="Headline" delay={0.5} />
            <ScoreGauge score={data.bio_score_after} size={90} strokeWidth={6} color={scoreColor(data.bio_score_after)} label="Bio" delay={0.6} />
          </div>
        </div>
      </motion.div>

      {/* ── Apply All — hero button ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={stagger()}
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
            onClick={() => {
              applyToProfile('all_resume', {
                headline: data.improved_headline,
                bio: data.improved_bio,
                skills: data.improved_skills,
                added_skills: data.added_skills,
                work_history: data.work_history_improvements,
              }, 'apply-all-resume');
              confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ffffff'] });
            }}
          />
        </div>
      </motion.div>

      {/* ── 2. ATS Compatibility Panel ── */}
      {data.ats_score !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="bg-[#0F172A]/90 backdrop-blur-sm ring-1 ring-cyan-500/20 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              ATS Compatibility
            </h3>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ring-1 ${atsVerdictColor}`}>{atsVerdict}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={data.ats_score} size={100} strokeWidth={7} color={scoreColor(data.ats_score)} delay={0.3} />

            <div className="flex-1 space-y-4 w-full">
              {/* Keywords present */}
              {data.ats_keywords_present && data.ats_keywords_present.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Keywords Found</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.ats_keywords_present.map(kw => (
                      <span key={kw} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full ring-1 ring-emerald-500/20">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords missing */}
              {data.ats_keywords_missing && data.ats_keywords_missing.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Missing Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.ats_keywords_missing.map(kw => (
                      <motion.span
                        key={kw}
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2.5 py-1 bg-red-500/10 text-red-400 text-xs rounded-full ring-1 ring-red-500/20"
                      >
                        {kw}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* ATS issues */}
              {data.ats_issues && data.ats_issues.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-2">Issues</p>
                  <ul className="space-y-1.5">
                    {data.ats_issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">!</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 3. Industry Benchmark Bar ── */}
      {data.industry_percentile !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="bg-[#0F172A]/90 backdrop-blur-sm ring-1 ring-cyan-500/20 rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Industry Benchmark
          </h3>
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/40">Percentile Rank</span>
              <span className={`text-sm font-bold ${data.industry_percentile >= 80 ? 'text-emerald-400' : data.industry_percentile >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                Top {100 - data.industry_percentile}%
              </span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.industry_percentile}%` }}
                transition={{ type: 'spring' as const, stiffness: 60, damping: 20, delay: 0.5 }}
                className={`h-full rounded-full ${
                  data.industry_percentile >= 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                  data.industry_percentile >= 60 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                  'bg-gradient-to-r from-red-600 to-red-400'
                }`}
              />
              {/* Marker */}
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${data.industry_percentile}%` }}
                transition={{ type: 'spring' as const, stiffness: 60, damping: 20, delay: 0.5 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-cyan-400"
              />
            </div>
          </div>
          {data.industry_benchmark && (
            <p className="text-white/50 text-xs mt-3 leading-relaxed">{data.industry_benchmark}</p>
          )}
        </motion.div>
      )}

      {/* ── 4. Section-by-Section Analysis ── */}
      {data.section_analysis && data.section_analysis.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
        >
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Section-by-Section Analysis
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.section_analysis.map((section, i) => {
              const vStyle = VERDICT_STYLES[section.verdict] || VERDICT_STYLES.adequate;
              return (
                <motion.div
                  key={section.section}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...springTransition, delay: 0.2 + i * 0.08 }}
                  className="bg-[#0F172A]/90 ring-1 ring-white/10 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{section.section}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ring-1 font-medium ${vStyle.bg} ${vStyle.text} ${vStyle.ring}`}>
                      {section.verdict}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white/30 font-mono text-xs">{section.score_before}</span>
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    <motion.span
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ ...springTransition, delay: 0.4 + i * 0.08 }}
                      className={`font-mono text-sm font-bold ${section.score_after >= 80 ? 'text-emerald-400' : section.score_after >= 60 ? 'text-amber-400' : 'text-red-400'}`}
                    >
                      {section.score_after}
                    </motion.span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">{section.suggestion}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── 5. Power Summary Card ── */}
      {data.power_summary && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="relative overflow-hidden bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 backdrop-blur-xl ring-1 ring-cyan-500/20 rounded-2xl p-6"
        >
          {/* Glassmorphism shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -skew-x-12 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                Power Summary
              </h3>
              <div className="flex gap-2">
                <ApplyButton id="apply-power-summary" label="Apply as Bio" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('bio', data.power_summary, 'apply-power-summary')} />
                <CopyButton text={data.power_summary} id="power-summary" copiedId={copiedId} copyText={copyText} />
              </div>
            </div>
            <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{data.power_summary}&rdquo;</p>
          </div>
        </motion.div>
      )}

      {/* ── 6. Enhanced Headline ── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={stagger()} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cyan-400">Enhanced Headline</h3>
          <div className="flex gap-2">
            <ApplyButton id="apply-headline" label="Apply" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('headline', data.improved_headline, 'apply-headline')} />
            <CopyButton text={data.improved_headline} id="headline" copiedId={copiedId} copyText={copyText} />
          </div>
        </div>
        <p className="text-white font-medium">{data.improved_headline}</p>
      </motion.div>

      {/* ── 7. LinkedIn Headline (separate) ── */}
      {data.linkedin_headline && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={stagger()} className="bg-[#0F172A] ring-1 ring-blue-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
              {/* LinkedIn icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn Headline
            </h3>
            <CopyButton text={data.linkedin_headline} id="linkedin-headline" copiedId={copiedId} copyText={copyText} />
          </div>
          <p className="text-white/80 text-sm">{data.linkedin_headline}</p>
        </motion.div>
      )}

      {/* ── 8. Enhanced Bio ── */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={stagger()} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cyan-400">Enhanced Bio</h3>
          <div className="flex gap-2">
            <ApplyButton id="apply-bio" label="Apply" applyingId={applyingId} appliedIds={appliedIds} onClick={() => applyToProfile('bio', data.improved_bio, 'apply-bio')} />
            <CopyButton text={data.improved_bio} id="bio" copiedId={copiedId} copyText={copyText} />
          </div>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{data.improved_bio}</p>
      </motion.div>

      {/* ── 9. Red Flags Alert ── */}
      {data.red_flags && data.red_flags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={stagger()}
          className="relative overflow-hidden"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-red-500/5 rounded-2xl"
          />
          <div className="relative bg-[#0F172A]/80 ring-1 ring-red-500/30 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Red Flags to Fix
            </h3>
            <ul className="space-y-2">
              {data.red_flags.map((flag, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: 0.1 * i }}
                  className="flex items-start gap-2 text-sm text-white/70"
                >
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#x26A0;</span>
                  {flag}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* ── 10. Achievement Rewrites ── */}
      {data.achievement_rewrites && data.achievement_rewrites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="bg-[#0F172A]/90 ring-1 ring-cyan-500/20 rounded-2xl p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Achievement Rewrites (STAR Method)
          </h3>
          {data.achievement_rewrites.map((ar, i) => {
            const impactStyle = IMPACT_COLORS[ar.impact_type] || IMPACT_COLORS.technical;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: 0.1 * i }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${impactStyle.bg} ${impactStyle.text} ${impactStyle.ring}`}>
                    {ar.impact_type}
                  </span>
                </div>
                <div className="bg-red-500/5 rounded-lg p-3">
                  <p className="text-xs text-red-400/60 mb-1">Original</p>
                  <p className="text-white/40 text-xs line-through">{ar.original}</p>
                </div>
                <div className="bg-emerald-500/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-emerald-400/60">STAR Rewrite</p>
                    <CopyButton text={ar.rewritten} id={`ar-${i}`} copiedId={copiedId} copyText={copyText} />
                  </div>
                  <p className="text-white/80 text-xs">{ar.rewritten}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── 11. Added skills ── */}
      {data.added_skills && data.added_skills.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={stagger()} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5">
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

      {/* ── 12. Work history improvements ── */}
      {data.work_history_improvements && data.work_history_improvements.length > 0 && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={stagger()} className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5 space-y-4">
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

      {/* ── 13. Competitive Edge ── */}
      {data.competitive_edge && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 ring-1 ring-cyan-500/30 rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            Your Competitive Edge
          </h3>
          <p className="text-white/80 text-sm leading-relaxed">{data.competitive_edge}</p>
        </motion.div>
      )}

      {/* ── 14. Career Positioning ── */}
      {data.career_positioning && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger()}
          className="bg-[#0F172A] ring-1 ring-cyan-500/20 rounded-xl p-5"
        >
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Strategic Career Positioning
          </h3>
          <p className="text-white/60 text-sm leading-relaxed">{data.career_positioning}</p>
        </motion.div>
      )}

      {/* ── 15. Key improvements summary ── */}
      {data.key_improvements && data.key_improvements.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger()} className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 ring-1 ring-cyan-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Key Improvements Made</h3>
          <ul className="space-y-2">
            {data.key_improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-emerald-400 mt-0.5">&#x2713;</span>
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
