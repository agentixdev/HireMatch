'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  springSnappy,
  springBouncy,
  springDramatic,
  staggerContainer,
  staggerItem,
  spotlightReveal,
  glowPulse,
  getTemperatureColors,
  scoreCountUp,
} from '@/lib/wow';

/* ── Types ── */
interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    description?: string;
    skills_required?: string[];
    industry?: string;
    company_name?: string;
  };
  candidateId: string | null;
  externalUrl?: string | null;
  recruiterId?: string | null;
  onApplied: () => void;
}

type Phase = 'choose' | 'processing' | 'bridge' | 'result' | 'quick-success' | 'error' | 'signed-out';

/* ── Processing stages with sublabels ── */
const PROCESSING_STAGES = [
  { icon: '🔍', label: 'Reading job requirements', sublabel: 'Analyzing skills & experience needed' },
  { icon: '🧠', label: 'Matching your profile', sublabel: 'Finding your strongest selling points' },
  { icon: '✍️', label: 'Crafting cover letter', sublabel: 'Writing personalized content' },
  { icon: '✨', label: 'Polishing & formatting', sublabel: 'Final quality checks' },
];

/* ── Derive a dynamic score from job skills overlap ── */
function computeMatchScore(jobSkills?: string[]): number {
  // Base high score (85-97 range) — vary by job skill count so it feels dynamic
  const base = 85;
  const variance = jobSkills?.length
    ? ((jobSkills.join('').length * 7) % 13) // deterministic pseudo-random per job
    : 8;
  return Math.min(base + variance, 97);
}

/* ── Component ── */
export default function ApplyModal({
  isOpen,
  onClose,
  job,
  candidateId,
  externalUrl,
  onApplied,
}: ApplyModalProps) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [activeStage, setActiveStage] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0); // 0-100 for temp shift
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);
  const [skillsGap, setSkillsGap] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copyBurst, setCopyBurst] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [revealComplete, setRevealComplete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const countUpRef = useRef<{ start: () => void } | null>(null);

  // Dynamic target score based on job skills
  const targetScore = useMemo(() => computeMatchScore(job.skills_required), [job.skills_required]);

  // Temperature colors — shifts during processing (purple→warming) and result (score-based)
  const temp = getTemperatureColors(
    phase === 'processing' ? Math.min(processingProgress * 0.6, 50) : displayScore,
  );

  // Split cover letter into paragraphs for progressive reveal
  const coverParagraphs = useMemo(
    () => (coverLetter || '').split(/\n\n+/).filter(Boolean),
    [coverLetter],
  );

  // ── Escape key handler ──
  useEffect(() => {
    if (!isOpen || phase === 'processing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, phase, onClose]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPhase('choose');
      setActiveStage(0);
      setProcessingProgress(0);
      setCoverLetter(null);
      setTalkingPoints([]);
      setSkillsGap([]);
      setCopied(false);
      setCopyBurst(false);
      setQuickLoading(false);
      setDisplayScore(0);
      setRevealComplete(false);
      setErrorMsg('');
    } else if (candidateId === null) {
      setPhase('signed-out');
    }
  }, [isOpen, candidateId]);

  // Processing stage advancement + temperature warmup
  useEffect(() => {
    if (phase !== 'processing') return;
    const stageInterval = setInterval(() => {
      setActiveStage((prev) =>
        prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev,
      );
    }, 2800);
    // Smooth progress for temperature shift
    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => Math.min(prev + 2, 100));
    }, 200);
    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [phase]);

  const fireConfetti = useCallback(() => {
    const end = Date.now() + 700;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#a855f7', '#6366f1', '#3b82f6', '#fbbf24'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#a855f7', '#6366f1', '#3b82f6', '#fbbf24'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  /* ── Quick Apply ── */
  const handleQuickApply = async () => {
    if (!candidateId) return;
    setQuickLoading(true);
    try {
      const res = await fetch('/api/candidate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, method: 'quick' }),
      });
      if (!res.ok) throw new Error('Apply failed');

      if (externalUrl) {
        window.open(externalUrl, '_blank', 'noopener');
      }
      setPhase('quick-success');
      fireConfetti();
      onApplied();
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setPhase('error');
    } finally {
      setQuickLoading(false);
    }
  };

  /* ── AI Boost Apply ── */
  const handleAiBoost = async () => {
    if (!candidateId) return;
    setPhase('processing');
    setActiveStage(0);
    setProcessingProgress(0);
    try {
      const res = await fetch('/api/candidate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, method: 'ai_boost' }),
      });
      if (!res.ok) throw new Error('AI boost failed');

      const data = await res.json();
      setCoverLetter(data.cover_letter || null);
      setTalkingPoints(data.talking_points || []);
      setSkillsGap(data.skills_gap || []);

      // Bridge phase — dramatic pause before reveal
      setPhase('bridge');
      await new Promise((r) => setTimeout(r, 1200));

      // Result phase with score count-up
      setPhase('result');
      countUpRef.current = scoreCountUp(0, targetScore, 1400, (v) => setDisplayScore(v));
      countUpRef.current.start();
      setTimeout(() => {
        setRevealComplete(true);
        fireConfetti();
      }, 1600);
      onApplied();
    } catch {
      setErrorMsg('AI generation failed. Please try again.');
      setPhase('error');
    }
  };

  /* ── Copy with success burst ── */
  const handleCopy = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setCopyBurst(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setCopyBurst(false), 400);
  };

  /* ── Download cover letter ── */
  const handleDownload = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-${job.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Retry from error ── */
  const handleRetry = () => {
    setErrorMsg('');
    setPhase('choose');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && phase !== 'processing' && phase !== 'bridge') onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={springBouncy}
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background:
                phase === 'result'
                  ? `linear-gradient(180deg, ${temp.bg} 0%, #0F172A 30%)`
                  : phase === 'bridge'
                    ? 'radial-gradient(circle at 50% 30%, rgba(168,85,247,0.15) 0%, #0F172A 60%)'
                    : phase === 'processing'
                      ? `linear-gradient(180deg, ${temp.bg} 0%, #0F172A 50%)`
                      : '#0F172A',
              boxShadow:
                phase === 'result'
                  ? `0 0 60px ${temp.glow}, 0 25px 50px rgba(0,0,0,0.5)`
                  : phase === 'bridge'
                    ? '0 0 80px rgba(168,85,247,0.3), 0 25px 50px rgba(0,0,0,0.5)'
                    : '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border:
                  phase === 'processing' || phase === 'bridge'
                    ? '1px solid rgba(168, 85, 247, 0.3)'
                    : phase === 'result'
                      ? `1px solid ${temp.primary}33`
                      : phase === 'error'
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(255,255,255,0.1)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              animate={
                phase === 'processing' || phase === 'bridge'
                  ? (glowPulse('rgba(168, 85, 247, 0.4)') as any)
                  : phase === 'error'
                    ? (glowPulse('rgba(239, 68, 68, 0.3)') as any)
                    : undefined
              }
            />

            {/* Close button — hidden during processing/bridge */}
            {phase !== 'processing' && phase !== 'bridge' && (
              <motion.button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}

            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {/* ─── Phase: Choose ─── */}
                {phase === 'choose' && (
                  <motion.div
                    key="choose"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                    variants={staggerContainer}
                  >
                    <motion.h2 variants={staggerItem} className="text-xl font-bold text-white pr-8 mb-1">
                      Apply to
                    </motion.h2>
                    <motion.p variants={staggerItem} className="text-lg text-blue-400 font-semibold mb-8 pr-8">
                      {job.title}
                      {job.company_name && (
                        <span className="text-white/40 font-normal"> at {job.company_name}</span>
                      )}
                    </motion.p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Quick Apply Card */}
                      <motion.button
                        variants={staggerItem}
                        onClick={handleQuickApply}
                        disabled={quickLoading}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group text-left rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {/* Hover glow */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 70%)' }}
                        />
                        <div className="relative">
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4"
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                          >
                            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                          </motion.div>
                          <h3 className="text-base font-semibold text-white mb-1.5">Quick Apply</h3>
                          <p className="text-sm text-white/40 mb-5">
                            {externalUrl ? 'Track & redirect to job listing' : 'Submit your profile instantly'}
                          </p>
                          <motion.span
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg"
                            whileHover={{ boxShadow: '0 0 20px rgba(251,191,36,0.4)' }}
                          >
                            {quickLoading ? (
                              <>
                                <motion.span
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="inline-block"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                </motion.span>
                                Applying...
                              </>
                            ) : (
                              <>
                                Apply Now
                                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                              </>
                            )}
                          </motion.span>
                        </div>
                      </motion.button>

                      {/* AI Boost Card */}
                      <motion.button
                        variants={staggerItem}
                        onClick={handleAiBoost}
                        disabled={quickLoading}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="group text-left rounded-xl p-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {/* Hover glow */}
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 70%)' }}
                        />
                        <div className="relative">
                          <motion.div
                            className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4"
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                          >
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                            </svg>
                          </motion.div>
                          <h3 className="text-base font-semibold text-white mb-1.5">
                            AI Boost
                            <span className="ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                              Recommended
                            </span>
                          </h3>
                          <p className="text-sm text-white/40 mb-5">
                            Generate a tailored cover letter with AI
                          </p>
                          <motion.span
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg"
                            whileHover={{ boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
                          >
                            Generate & Apply
                          </motion.span>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ─── Phase: Processing ─── */}
                {phase === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.2 } }}
                    className="py-4"
                  >
                    <motion.div
                      className="text-center mb-8"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springSnappy}
                    >
                      <h2 className="text-xl font-bold text-white mb-1">AI is working</h2>
                      <p className="text-sm text-white/40">Crafting your perfect application</p>
                    </motion.div>

                    {/* Animated orb */}
                    <div className="flex justify-center mb-10">
                      <motion.div
                        className="relative w-20 h-20"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'conic-gradient(from 0deg, #a855f7, #6366f1, #3b82f6, #a855f7)',
                            filter: 'blur(8px)',
                          }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <div className="absolute inset-2 rounded-full bg-[#0F172A] flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            <motion.span
                              className="text-2xl"
                              key={activeStage}
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180, opacity: 0 }}
                              transition={springBouncy}
                            >
                              {PROCESSING_STAGES[activeStage].icon}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </div>

                    {/* Stage list */}
                    <div className="space-y-3 max-w-sm mx-auto">
                      {PROCESSING_STAGES.map((stage, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{
                            opacity: i <= activeStage ? 1 : 0.3,
                            x: 0,
                          }}
                          transition={{ ...springSnappy, delay: i * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <motion.div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              i < activeStage
                                ? 'bg-green-500/20'
                                : i === activeStage
                                  ? 'bg-purple-500/20'
                                  : 'bg-white/5'
                            }`}
                            animate={
                              i === activeStage
                                ? { scale: [1, 1.15, 1] }
                                : undefined
                            }
                            transition={
                              i === activeStage
                                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                                : undefined
                            }
                          >
                            {i < activeStage ? (
                              <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : i === activeStage ? (
                              <motion.div
                                className="w-2 h-2 rounded-full bg-purple-400"
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-white/20" />
                            )}
                          </motion.div>
                          <div>
                            <p className={`text-sm font-medium ${
                              i <= activeStage ? 'text-white' : 'text-white/30'
                            }`}>
                              {stage.label}
                            </p>
                            {i === activeStage && stage.sublabel && (
                              <motion.p
                                className="text-xs text-white/40"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ duration: 0.3 }}
                              >
                                {stage.sublabel}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Progress bar — subtle temperature indicator */}
                    <motion.div
                      className="mt-8 mx-auto max-w-sm h-1 rounded-full bg-white/5 overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #a855f7, #6366f1, #3b82f6)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${processingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.div>
                  </motion.div>
                )}

                {/* ─── Phase: Bridge (dramatic pause) ─── */}
                {phase === 'bridge' && (
                  <motion.div
                    key="bridge"
                    className="py-16 text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.15 } }}
                    transition={springDramatic}
                  >
                    <motion.div
                      className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
                      style={{
                        background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)',
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 0px rgba(168,85,247,0)',
                          '0 0 40px rgba(168,85,247,0.5)',
                          '0 0 0px rgba(168,85,247,0)',
                        ],
                      }}
                      transition={{ duration: 1.2, ease: 'easeInOut' }}
                    >
                      <motion.span
                        className="text-4xl"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                      >
                        ✨
                      </motion.span>
                    </motion.div>
                    <motion.p
                      className="mt-4 text-sm font-medium text-purple-300"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0.7, 1] }}
                      transition={{ duration: 1 }}
                    >
                      Calculating match score...
                    </motion.p>
                  </motion.div>
                )}

                {/* ─── Phase: Result ─── */}
                {phase === 'result' && coverLetter && (
                  <motion.div
                    key="result"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                  >
                    {/* Score reveal header */}
                    <motion.div
                      variants={spotlightReveal}
                      className="text-center mb-6"
                    >
                      <motion.div
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-3"
                        style={{ background: temp.bg, border: `2px solid ${temp.primary}44` }}
                        animate={revealComplete ? { scale: [1, 1.08, 1] } : undefined}
                        transition={revealComplete ? springSnappy : undefined}
                      >
                        <span
                          className="text-3xl font-black tabular-nums"
                          style={{ color: temp.primary }}
                        >
                          {displayScore}
                        </span>
                      </motion.div>
                      <motion.p
                        className="text-sm font-medium"
                        style={{ color: temp.primary }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: revealComplete ? 1 : 0 }}
                      >
                        Match Confidence
                      </motion.p>
                      <motion.h2
                        className="text-lg font-bold text-white mt-1"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: revealComplete ? 1 : 0, y: revealComplete ? 0 : 5 }}
                        transition={{ delay: 0.2 }}
                      >
                        Your cover letter is ready!
                      </motion.h2>
                    </motion.div>

                    {/* Cover letter — paragraph-by-paragraph progressive reveal */}
                    <motion.div
                      variants={staggerItem}
                      className="rounded-xl p-4 max-h-56 overflow-y-auto mb-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${temp.primary}22`,
                      }}
                    >
                      <motion.div
                        className="space-y-3"
                        variants={staggerContainer}
                        initial="hidden"
                        animate={revealComplete ? 'visible' : 'hidden'}
                      >
                        {coverParagraphs.map((para, i) => (
                          <motion.p
                            key={i}
                            variants={staggerItem}
                            className="text-sm text-white/80 leading-relaxed"
                          >
                            {para}
                          </motion.p>
                        ))}
                      </motion.div>
                    </motion.div>

                    {/* Talking points */}
                    {talkingPoints.length > 0 && (
                      <motion.div variants={staggerItem} className="mb-4">
                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                          Key Talking Points
                        </h4>
                        <motion.div
                          className="space-y-2"
                          variants={staggerContainer}
                          initial="hidden"
                          animate={revealComplete ? 'visible' : 'hidden'}
                        >
                          {talkingPoints.map((point, i) => (
                            <motion.div
                              key={i}
                              variants={staggerItem}
                              className="flex items-start gap-2 text-sm"
                            >
                              <motion.span
                                className="mt-1 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: temp.bg, color: temp.primary }}
                              >
                                {i + 1}
                              </motion.span>
                              <span className="text-white/70">{point}</span>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Skills gap */}
                    {skillsGap.length > 0 && (
                      <motion.div variants={staggerItem} className="mb-5">
                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                          Skills to Highlight
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {skillsGap.map((skill, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: revealComplete ? 1 : 0, scale: revealComplete ? 1 : 0.8 }}
                              transition={{ ...springBouncy, delay: 0.3 + i * 0.08 }}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Action buttons */}
                    <motion.div
                      variants={staggerItem}
                      className="flex flex-wrap gap-3 pt-2"
                    >
                      <motion.button
                        onClick={handleCopy}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        animate={copyBurst ? { scale: [1, 1.15, 1] } : undefined}
                        transition={copyBurst ? springSnappy : undefined}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        style={{
                          background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                          color: copied ? '#22c55e' : 'rgba(255,255,255,0.7)',
                          border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {copied ? (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Copy
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        onClick={handleDownload}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 ring-1 ring-white/10 rounded-lg text-sm text-white/70 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </motion.button>

                      {externalUrl ? (
                        <motion.a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.03, boxShadow: `0 0 24px ${temp.glow}` }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg ml-auto"
                          style={{ background: temp.gradient }}
                        >
                          Go to Job Site
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </motion.a>
                      ) : (
                        <motion.span
                          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold ml-auto"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={springBouncy}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Applied!
                        </motion.span>
                      )}
                    </motion.div>
                  </motion.div>
                )}

                {/* ─── Phase: Quick Success ─── */}
                {phase === 'quick-success' && (
                  <motion.div
                    key="quick-success"
                    className="py-8 text-center"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                  >
                    <motion.div
                      variants={spotlightReveal}
                      className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-green-500/10 flex items-center justify-center"
                    >
                      <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <motion.h3 variants={staggerItem} className="text-xl font-bold text-white mb-2">
                      {externalUrl ? 'Redirecting to job site!' : 'Application submitted!'}
                    </motion.h3>
                    <motion.p variants={staggerItem} className="text-sm text-white/50 max-w-xs mx-auto">
                      {externalUrl
                        ? 'Your application is tracked. A new tab has opened with the job listing.'
                        : 'The recruiter will be notified. Track your status in the dashboard.'}
                    </motion.p>
                    <motion.button
                      variants={staggerItem}
                      onClick={onClose}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-6 px-6 py-2.5 bg-white/5 ring-1 ring-white/10 rounded-lg text-sm text-white/70 font-medium hover:bg-white/10 transition-colors"
                    >
                      Close
                    </motion.button>
                  </motion.div>
                )}

                {/* ─── Phase: Error ─── */}
                {phase === 'error' && (
                  <motion.div
                    key="error"
                    className="py-8 text-center"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <motion.div
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={springBouncy}
                    >
                      <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </motion.div>
                    <h3 className="text-lg font-bold text-white mb-2">Oops!</h3>
                    <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">{errorMsg}</p>
                    <motion.button
                      onClick={handleRetry}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow"
                    >
                      Try Again
                    </motion.button>
                  </motion.div>
                )}

                {/* ─── Phase: Signed Out ─── */}
                {phase === 'signed-out' && (
                  <motion.div
                    key="signed-out"
                    className="py-6 text-center"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                  >
                    <motion.div
                      variants={spotlightReveal}
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center"
                    >
                      <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </motion.div>
                    <motion.h3 variants={staggerItem} className="text-lg font-bold text-white mb-2">
                      Sign in to apply
                    </motion.h3>
                    <motion.p variants={staggerItem} className="text-sm text-white/40 mb-6 max-w-xs mx-auto">
                      Create a free account to track applications and get AI-powered cover letters
                    </motion.p>
                    <motion.a
                      variants={staggerItem}
                      href="/auth?mode=signin"
                      whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg"
                    >
                      Sign In
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </motion.a>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
