'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

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

/* ── Loading step messages ── */
const AI_STEPS = [
  'Analyzing job requirements...',
  'Matching your skills...',
  'Writing cover letter...',
];

/* ── Component ── */
export default function ApplyModal({
  isOpen,
  onClose,
  job,
  candidateId,
  externalUrl,
  recruiterId,
  onApplied,
}: ApplyModalProps) {
  const [quickLoading, setQuickLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setQuickLoading(false);
      setAiLoading(false);
      setAiStep(0);
      setCoverLetter(null);
      setTalkingPoints([]);
      setCopied(false);
      setQuickSuccess(false);
    }
  }, [isOpen]);

  // Cycle AI loading steps
  useEffect(() => {
    if (!aiLoading) return;
    const interval = setInterval(() => {
      setAiStep((prev) => (prev < AI_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [aiLoading]);

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
    });
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
      } else {
        setQuickSuccess(true);
        fireConfetti();
      }
      onApplied();
    } catch {
      // Silently handle — user can retry
    } finally {
      setQuickLoading(false);
    }
  };

  /* ── AI Boost Apply ── */
  const handleAiBoost = async () => {
    if (!candidateId) return;
    setAiLoading(true);
    setAiStep(0);
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
      fireConfetti();
      onApplied();
    } catch {
      // Silently handle
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Copy cover letter ── */
  const handleCopy = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-2xl rounded-2xl bg-[#0F172A] ring-1 ring-white/10 shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6 sm:p-8">
              {/* Job title */}
              <h2 className="text-xl font-bold text-white pr-8 mb-1">Apply to</h2>
              <p className="text-lg text-blue-400 font-semibold mb-6 pr-8">
                {job.title}
                {job.company_name && (
                  <span className="text-white/40 font-normal"> at {job.company_name}</span>
                )}
              </p>

              {/* ── Not logged in ── */}
              {candidateId === null && (
                <div className="bg-white/5 ring-1 ring-white/10 rounded-xl p-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Sign in to apply</h3>
                  <p className="text-sm text-white/50 mb-6">
                    Create a free account to track applications and get AI-powered cover letters
                  </p>
                  <a
                    href="/auth?mode=signin"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                  >
                    Sign In
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </a>
                </div>
              )}

              {/* ── AI Boost result ── */}
              {candidateId !== null && coverLetter && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-sm">Cover letter generated!</span>
                  </div>

                  {/* Cover letter text */}
                  <div className="bg-white/5 ring-1 ring-white/10 rounded-xl p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                      {coverLetter}
                    </p>
                  </div>

                  {/* Talking points */}
                  {talkingPoints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-white/70 mb-2">Key talking points</h4>
                      <ul className="space-y-1.5">
                        {talkingPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                            <span className="text-blue-400 mt-0.5 shrink-0">&#8226;</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 ring-1 ring-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 ring-1 ring-white/10 rounded-lg text-sm text-white/80 hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </button>

                    {externalUrl ? (
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                      >
                        Go to Job Site
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 px-5 py-2.5 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Applied!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Quick Apply success (internal job) ── */}
              {candidateId !== null && quickSuccess && !coverLetter && (
                <div className="bg-white/5 ring-1 ring-white/10 rounded-xl p-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Application submitted!</h3>
                  <p className="text-sm text-white/50">
                    The recruiter will be notified. You can track your status in the dashboard.
                  </p>
                </div>
              )}

              {/* ── Two cards (initial state) ── */}
              {candidateId !== null && !coverLetter && !quickSuccess && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Quick Apply */}
                  <button
                    onClick={handleQuickApply}
                    disabled={quickLoading || aiLoading}
                    className="group text-left bg-white/5 ring-1 ring-white/10 rounded-xl p-6 hover:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5">Quick Apply</h3>
                    <p className="text-sm text-white/50 mb-4">
                      Track this application and go to the job listing
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow">
                      {quickLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Applying...
                        </>
                      ) : (
                        <>
                          Apply Now
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>

                  {/* AI Boost */}
                  <button
                    onClick={handleAiBoost}
                    disabled={quickLoading || aiLoading}
                    className="group text-left bg-white/5 ring-1 ring-white/10 rounded-xl p-6 hover:ring-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5">Apply with AI Boost</h3>
                    <p className="text-sm text-white/50 mb-4">
                      Generate a tailored cover letter matched to this role
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                      {aiLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {AI_STEPS[aiStep]}
                        </>
                      ) : (
                        'Generate & Apply \u2728'
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
