'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import {
  springSnappy,
  springBouncy,
  springSmooth,
  getTemperatureColors,
  staggerContainer,
  staggerItem,
} from '@/lib/wow';
import type { CompanyMatch, Competitor, RealJob } from '../types';

interface MatchmakerResultsProps {
  results: CompanyMatch[];
  answers: number[];
  competitors: Competitor[];
  displayScore: number;
  showConfetti: boolean;
  savedToProfile: boolean;
  onSave: () => void;
  onRetake: () => void;
  onShare: () => void;
  showShareModal: boolean;
  setShowShareModal: (v: boolean) => void;
  shareCopied: boolean;
  setShareCopied: (v: boolean) => void;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  showAllMatches: boolean;
  setShowAllMatches: (v: boolean) => void;
  realJobs: RealJob[];
  realJobsLoading: boolean;
  isAuthenticated: boolean;
  userRank: number;
  userRadarProfile: Record<string, number>;
}

// Temperature helpers
function getTemperature(score: number) {
  if (score >= 80) return { color: '#22c55e', label: 'Strong fit' };
  if (score >= 60) return { color: '#a855f7', label: 'Good fit' };
  if (score >= 40) return { color: '#3b82f6', label: 'Moderate fit' };
  return { color: '#6b7280', label: 'Exploring options' };
}

function getRankBadge(rank: number) {
  if (rank === 1)
    return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'ring-yellow-500/30' };
  if (rank === 2)
    return { bg: 'bg-gray-400/20', text: 'text-gray-300', border: 'ring-gray-400/30' };
  if (rank === 3)
    return { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'ring-amber-700/30' };
  return { bg: 'bg-white/[0.06]', text: 'text-white/40', border: 'ring-white/[0.08]' };
}

// Radar chart constants
const radarAxes = [
  { label: 'Impact', key: 'impact' },
  { label: 'Autonomy', key: 'autonomy' },
  { label: 'Teamwork', key: 'team' },
  { label: 'Growth', key: 'challenge' },
  { label: 'Balance', key: 'balance' },
  { label: 'Innovation', key: 'creative' },
];

const radarCx = 120;
const radarCy = 120;
const radarR = 90;
const radarAngleStep = (2 * Math.PI) / radarAxes.length;

function radarPoint(index: number, value: number) {
  const angle = -Math.PI / 2 + index * radarAngleStep;
  return {
    x: radarCx + Math.cos(angle) * radarR * value,
    y: radarCy + Math.sin(angle) * radarR * value,
  };
}

// ── Threat Level Badge ──────────────────────────────────────────

function ThreatBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Low Threat' },
    medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Medium Threat' },
    high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: 'High Threat' },
  }[level];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.text} border ${config.border}`}>
      {config.label}
    </span>
  );
}

// ── Boost Profile Button (Stand-out Tip) ────────────────────────

function BoostProfileButton({
  isAuthenticated,
  onBoostComplete,
}: {
  isAuthenticated: boolean;
  onBoostComplete?: (improvements: string[]) => void;
}) {
  const router = useRouter();
  const [boosting, setBoosting] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const handleBoost = async () => {
    if (!isAuthenticated) {
      router.push('/auth?mode=signin&redirect=/matchmaker');
      return;
    }

    setBoosting(true);
    setError(null);
    setProgress('Analyzing your profile...');

    try {
      // Step 1: Generate AI improvements
      const res = await fetch('/api/candidate/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve-resume' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate improvements');
      }
      const { data } = await res.json();

      setProgress('Applying improvements...');

      // Step 2: Apply improvements to profile
      const applyRes = await fetch('/api/candidate/apply-enhancement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'all_resume',
          value: {
            headline: data.improved_headline,
            bio: data.improved_bio,
            skills: data.improved_skills,
            added_skills: data.added_skills,
            work_history: data.work_history_improvements,
          },
        }),
      });
      if (!applyRes.ok) {
        const err = await applyRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to apply improvements');
      }

      setBoosted(true);
      const improvements = data.key_improvements || [
        'Headline optimized',
        'Bio rewritten with metrics',
        'Skills expanded',
      ];
      onBoostComplete?.(improvements);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBoosting(false);
      setProgress('');
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-red-400">{error}</span>
        <motion.button
          onClick={handleBoost}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Retry
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleBoost}
      disabled={boosting || boosted}
      whileHover={!boosting && !boosted ? { scale: 1.05 } : undefined}
      whileTap={!boosting && !boosted ? { scale: 0.95 } : undefined}
      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
        boosted
          ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
          : boosting
          ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
          : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30'
      }`}
    >
      {boosted ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Profile Boosted!
        </>
      ) : boosting ? (
        <>
          <div className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
          {progress || 'Boosting...'}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          Boost My Profile
        </>
      )}
    </motion.button>
  );
}

// ── Competitor Drill-Down Drawer ────────────────────────────────

function CompetitorDrawer({
  competitor,
  userScore,
  userRadarProfile,
  onClose,
}: {
  competitor: Competitor;
  userScore: number;
  userRadarProfile: Record<string, number>;
  onClose: () => void;
}) {
  const tempColors = getTemperatureColors(competitor.score);
  const scoreDiff = userScore - competitor.score;
  const maxRadar = Math.max(
    ...competitor.workStyle.map((w) => w.value),
    ...Object.values(userRadarProfile).map((v) => (v / Math.max(...Object.values(userRadarProfile), 1)) * 100),
    1,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={springSmooth}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-full sm:max-w-lg bg-[#0d0f1a] border-l border-white/10 overflow-y-auto"
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-2 cursor-pointer">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4" style={{ background: `linear-gradient(180deg, ${competitor.avatar.replace(')', ', 0.15)')} 0%, transparent 100%)` }}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springBouncy}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
              style={{ backgroundColor: competitor.avatar }}
            >
              {competitor.name.charAt(0)}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-bold text-white">{competitor.name}</h2>
                <ThreatBadge level={competitor.threatLevel} />
              </div>
              <p className="text-sm" style={{ color: competitor.avatar }}>{competitor.headline}</p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-white/30">
                <span>{competitor.location}</span>
                <span>&middot;</span>
                <span>{competitor.experience}yr exp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Comparison */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Score Comparison</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Your score */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/15"
            >
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">You</p>
              <p className="text-3xl font-black text-white">{userScore}%</p>
            </motion.div>

            {/* Their score */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl p-4 border"
              style={{ backgroundColor: tempColors.bg, borderColor: tempColors.primary + '20' }}
            >
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{competitor.name.split(' ')[0]}</p>
              <p className="text-3xl font-black" style={{ color: tempColors.primary }}>{competitor.score}%</p>
            </motion.div>
          </div>

          {/* Difference callout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, ...springBouncy }}
            className={`mt-3 p-3 rounded-lg text-center text-sm font-semibold ${
              scoreDiff > 0
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : scoreDiff < 0
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {scoreDiff > 0
              ? `You're ahead by ${scoreDiff} points`
              : scoreDiff < 0
                ? `They're ahead by ${Math.abs(scoreDiff)} points`
                : "You're neck and neck!"}
          </motion.div>
        </div>

        {/* Skills */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {competitor.skills.map((skill) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + Math.random() * 0.2 }}
                className="px-2.5 py-1 bg-white/[0.04] text-white/60 text-xs rounded-full border border-white/[0.06]"
              >
                {skill}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Work Style Comparison Bars */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Work Style Comparison</h3>
          <div className="space-y-3">
            {competitor.workStyle.map((trait, i) => {
              const radarKey = trait.label.toLowerCase();
              const maxUserVal = Math.max(...Object.values(userRadarProfile), 1);
              const userVal = Math.round(((userRadarProfile[radarKey] || 0) / maxUserVal) * 100);
              return (
                <motion.div
                  key={trait.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-white/50">{trait.label}</span>
                    <span className="text-white/20">You: {userVal}% | Them: {trait.value}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    {/* User bar */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-60"
                      initial={{ width: 0 }}
                      animate={{ width: `${userVal}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Competitor bar */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full opacity-50"
                      style={{ backgroundColor: competitor.avatar }}
                      initial={{ width: 0 }}
                      animate={{ width: `${trait.value}%` }}
                      transition={{ delay: 0.55 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-white/20">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-60" />
              You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full opacity-50" style={{ backgroundColor: competitor.avatar }} />
              {competitor.name.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Strengths */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Their Strengths</h3>
          <div className="space-y-2">
            {competitor.strengths.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-green-400 mt-0.5 shrink-0">+</span>
                <span className="text-white/60">{s}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Where You Have the Edge</h3>
          <div className="space-y-2">
            {competitor.weaknesses.map((w, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                <span className="text-white/50">{w}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Companies they're targeting */}
        <div className="px-6 py-4 border-t border-white/5">
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Also Competing For</h3>
          <div className="flex flex-wrap gap-2">
            {competitor.topCompanies.map((company) => (
              <span key={company} className="px-3 py-1.5 bg-white/[0.03] text-white/50 text-xs rounded-lg border border-white/[0.06]">
                {company}
              </span>
            ))}
          </div>
        </div>

        {/* Tactical Advice */}
        <div className="px-6 py-4 border-t border-white/5 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className={`p-4 rounded-xl ${
              scoreDiff >= 0
                ? 'bg-green-500/5 border border-green-500/15'
                : 'bg-amber-500/5 border border-amber-500/15'
            }`}
          >
            <p className={`text-xs font-bold mb-1 ${scoreDiff >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
              {scoreDiff >= 0 ? 'Your Competitive Advantage' : 'How to Close the Gap'}
            </p>
            <p className="text-[12px] text-white/40 leading-relaxed">
              {scoreDiff >= 0
                ? `You outperform ${competitor.name.split(' ')[0]} overall, but they have strong ${competitor.strengths[0]?.toLowerCase()}. Focus on showcasing your unique value to stay ahead.`
                : `${competitor.name.split(' ')[0]} has a ${Math.abs(scoreDiff)}-point edge. Their main advantage is ${competitor.strengths[0]?.toLowerCase()}. Counter by highlighting your distinct skills and experience.`}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Results Component ──────────────────────────────────────

export default function MatchmakerResults({
  results,
  answers,
  competitors,
  displayScore,
  showConfetti,
  savedToProfile,
  onRetake,
  showShareModal,
  setShowShareModal,
  shareCopied,
  setShareCopied,
  resultsRef,
  showAllMatches,
  setShowAllMatches,
  realJobs,
  realJobsLoading,
  isAuthenticated,
  userRank,
  userRadarProfile,
}: MatchmakerResultsProps) {
  const router = useRouter();
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [boostImprovements, setBoostImprovements] = useState<string[] | null>(null);

  if (!results || results.length === 0) return null;

  const topMatch = results[0];
  const topTemp = getTemperature(topMatch.score);
  const temperatureColor = topTemp.color;
  const temperatureLabel = topTemp.label;

  const scoreGradient =
    topMatch.score >= 80
      ? 'from-green-400 to-emerald-500'
      : topMatch.score >= 60
        ? 'from-blue-400 via-purple-400 to-indigo-500'
        : topMatch.score >= 40
          ? 'from-blue-400 to-cyan-500'
          : 'from-gray-400 to-gray-500';

  const totalCandidates = competitors.length + 7;

  const avgCompetitorScore = competitors.length
    ? Math.round(competitors.reduce((sum, c) => sum + c.score, 0) / competitors.length)
    : 0;

  const maxRadarVal = Math.max(...radarAxes.map((a) => userRadarProfile[a.key] || 0), 1);
  const radarValues = radarAxes.map((a) => Math.min(1, (userRadarProfile[a.key] || 0) / maxRadarVal));
  const radarPathPoints = radarValues.map((v, i) => radarPoint(i, v));
  const radarPathD =
    radarPathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <>
      <Header />
      <div ref={resultsRef} className="relative min-h-screen overflow-hidden bg-[#0F172A]">
        {/* Three-Layer Background Ambiance */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full blur-[160px]"
            style={{
              width: 700,
              height: 700,
              backgroundColor: `${topMatch.brandColor}14`,
            }}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: `${temperatureColor}10` }}
          />
          <motion.div
            className="absolute top-1/3 -left-20 w-[300px] h-[300px] rounded-full blur-[80px]"
            style={{ backgroundColor: `${topMatch.brandColor}18` }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Confetti burst */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute ${i % 3 === 0 ? 'w-3 h-1' : i % 3 === 1 ? 'w-2 h-2' : 'w-1 h-3'} rounded-sm`}
                style={{
                  backgroundColor: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'][
                    i % 6
                  ],
                  left: `${(i * 37 + 13) % 100}%`,
                  top: '-5%',
                }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 100 : 900,
                  rotate: ((i * 73 + 41) % 720) - 360,
                  x: (((i * 53 + 17) % 300) - 150),
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2 + ((i * 31 + 7) % 15) / 10,
                  delay: (i * 17 % 50) / 100,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowShareModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-sm rounded-2xl bg-[#0F172A] ring-1 ring-white/10 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-white mb-2">Share Your Results</h3>
                <p className="text-[13px] text-white/50 mb-5">
                  Challenge your friends to beat your {topMatch.score}% match with {topMatch.name}!
                </p>

                <div className="space-y-2 mb-5">
                  {/* Twitter/X */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm a ${topMatch.score}% match with ${topMatch.name} on HireMatch! Can you beat my score?`)}&url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white text-[14px] font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    Share on X
                  </a>
                  {/* LinkedIn */}
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white text-[14px] font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    Share on LinkedIn
                  </a>
                </div>

                {/* Copy link */}
                <button
                  onClick={() => {
                    const text = `I'm a ${topMatch.score}% match with ${topMatch.name} on HireMatch! Take the quiz: ${typeof window !== 'undefined' ? window.location.href : ''}`;
                    navigator.clipboard.writeText(text);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="w-full py-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] text-[13px] text-white/60 hover:text-white transition-colors font-medium"
                >
                  {shareCopied ? 'Copied!' : 'Copy Link'}
                </button>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full mt-3 py-2 text-[12px] text-white/30 hover:text-white/50 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative px-4 pt-4 pb-20 max-w-3xl mx-auto">
          {/* Saved to profile notification */}
          <AnimatePresence>
            {savedToProfile && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 p-3 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-sm text-center"
              >
                Results saved to your profile!
              </motion.div>
            )}
          </AnimatePresence>

          {/* FEATURED MATCH -- SPOTLIGHT REVEAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl overflow-hidden mb-8"
          >
            {/* Spotlight curtain */}
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
              style={{
                background: `radial-gradient(circle at 50% 35%, transparent 0%, ${topMatch.brandColor}15 30%, rgba(15,23,42,0.95) 70%)`,
              }}
            />

            {/* Edge glow in brand color */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-[5]"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0.7, 1],
                boxShadow: [
                  `inset 0 0 60px ${topMatch.brandColor}15, 0 0 40px ${topMatch.brandColor}08`,
                  `inset 0 0 100px ${topMatch.brandColor}30, 0 0 80px ${topMatch.brandColor}18`,
                  `inset 0 0 60px ${topMatch.brandColor}15, 0 0 40px ${topMatch.brandColor}08`,
                ]
              }}
              transition={{ delay: 0.8, duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative bg-white/[0.03] ring-1 ring-white/10 rounded-2xl overflow-hidden">
              {/* Industry gradient bar at top */}
              <div
                className="h-1 w-full"
                style={{
                  background: `linear-gradient(90deg, ${topMatch.brandColor}00, ${topMatch.brandColor}, ${topMatch.brandColor}00)`,
                }}
              />

              <div className="p-5 sm:p-8 md:p-10">
                {/* Large Circular Logo with Glow Ring */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
                    className="relative w-24 h-24 mx-auto mb-5"
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          `0 0 0 4px ${topMatch.brandColor}30, 0 0 40px ${topMatch.brandColor}20`,
                          `0 0 0 6px ${topMatch.brandColor}50, 0 0 60px ${topMatch.brandColor}35`,
                          `0 0 0 4px ${topMatch.brandColor}30, 0 0 40px ${topMatch.brandColor}20`,
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div
                      className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
                      style={{
                        backgroundColor: `${topMatch.brandColor}20`,
                        color: topMatch.brandColor,
                        border: `2px solid ${topMatch.brandColor}40`,
                      }}
                    >
                      {topMatch.name.charAt(0)}
                    </div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[11px] uppercase tracking-[3px] text-white/30 font-bold mb-1"
                  >
                    Your #1 Match
                  </motion.p>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-2"
                  >
                    {topMatch.name}
                  </motion.h2>

                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65 }}
                    className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-[2px] rounded-full"
                    style={{
                      backgroundColor: `${topMatch.brandColor}20`,
                      color: topMatch.brandColor,
                      border: `1px solid ${topMatch.brandColor}30`,
                    }}
                  >
                    {topMatch.industry}
                  </motion.span>
                </div>

                {/* Large count-up score */}
                <div className="text-center mb-4">
                  <p className="text-[11px] uppercase tracking-[3px] text-white/30 mb-2 font-bold">
                    Culture Alignment
                  </p>
                  <motion.div
                    className="relative"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div
                        className="w-32 h-32 rounded-full blur-[40px]"
                        style={{ backgroundColor: topMatch.brandColor + '30' }}
                      />
                    </motion.div>
                    <span
                      className={`text-[56px] sm:text-[72px] md:text-[88px] font-black leading-none bg-gradient-to-r ${scoreGradient} bg-clip-text text-transparent`}
                      style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '2px' }}
                    >
                      {displayScore}%
                    </span>
                  </motion.div>
                </div>

                {/* Temperature Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex justify-center mb-6"
                >
                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold"
                    style={{
                      backgroundColor: `${temperatureColor}15`,
                      color: temperatureColor,
                      border: `1px solid ${temperatureColor}30`,
                    }}
                  >
                    <motion.span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: temperatureColor }}
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {temperatureLabel}
                  </span>
                </motion.div>

                {/* Culture tags */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className="flex flex-wrap justify-center gap-2 mb-8"
                >
                  {topMatch.cultureTags.map((tag, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: -10 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: 0.9 + i * 0.08, type: 'spring', stiffness: 500, damping: 15 }}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-full bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08]"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>

                {/* SVG Radar Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0, duration: 0.6 }}
                  className="flex justify-center mb-8"
                >
                  <div className="relative w-full max-w-[240px] mx-auto">
                    <svg className="w-full h-auto" viewBox="0 0 240 240">
                      {/* Background grid rings */}
                      {[0.25, 0.5, 0.75, 1].map((ring) => (
                        <motion.polygon
                          key={ring}
                          points={radarAxes
                            .map((_, i) => {
                              const p = radarPoint(i, ring);
                              return `${p.x},${p.y}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="1"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ delay: 1.0 + ring * 0.15, duration: 0.4 }}
                        />
                      ))}
                      {/* Axis lines */}
                      {radarAxes.map((_, i) => {
                        const p = radarPoint(i, 1);
                        return (
                          <motion.line
                            key={i}
                            x1={radarCx}
                            y1={radarCy}
                            x2={p.x}
                            y2={p.y}
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="1"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ delay: 1.0 + i * 0.08, duration: 0.3 }}
                          />
                        );
                      })}
                      {/* Filled area */}
                      <motion.path
                        d={radarPathD}
                        fill={`${topMatch.brandColor}20`}
                        stroke={topMatch.brandColor}
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
                      />
                      {/* Data points */}
                      {radarPathPoints.map((p, i) => (
                        <motion.circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill={topMatch.brandColor}
                          stroke={topMatch.brandColor}
                          strokeWidth="2"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: 1.4 + i * 0.1,
                            type: 'spring',
                            stiffness: 400,
                            damping: 15,
                          }}
                        />
                      ))}
                      {/* Axis labels */}
                      {radarAxes.map((axis, i) => {
                        const labelP = radarPoint(i, 1.22);
                        return (
                          <text
                            key={i}
                            x={labelP.x}
                            y={labelP.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="rgba(255,255,255,0.45)"
                            fontSize="10"
                            fontWeight="600"
                          >
                            {axis.label}
                          </text>
                        );
                      })}
                    </svg>
                    <p className="text-center text-[10px] uppercase tracking-[2px] text-white/25 font-bold mt-1">
                      Match Breakdown
                    </p>
                  </div>
                </motion.div>

                {/* Why You Match */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="bg-white/[0.03] rounded-xl p-5 ring-1 ring-white/[0.06]"
                >
                  <h3 className="text-[12px] uppercase tracking-[2px] font-bold text-white/40 mb-3">
                    Why You Match
                  </h3>
                  <div className="space-y-2">
                    {topMatch.whyMatch.map((reason, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -15, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        transition={{ delay: 1.4 + i * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: topMatch.brandColor }}
                        />
                        <span className="text-[13px] text-white/60">{reason}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* COMPETING CANDIDATES */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-8 mb-8"
          >
            <h3 className="text-[12px] uppercase tracking-[2px] font-bold text-white/40 mb-1">
              Your Competition
            </h3>
            <p className="text-[14px] text-white/60 mb-6">
              You&apos;re up against{' '}
              <span className="text-white font-semibold">{totalCandidates} candidates</span>{' '}
              for roles at {topMatch.name}
            </p>

            {/* Rank callout */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, type: 'spring' }}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl mb-6"
              style={{ backgroundColor: `${temperatureColor}10`, border: `1px solid ${temperatureColor}20` }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-black shrink-0"
                style={{ backgroundColor: `${temperatureColor}20`, color: temperatureColor }}
              >
                #{userRank}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-[13px] sm:text-[15px]">
                  You rank #{userRank} of {totalCandidates} candidates
                </p>
                <p className="text-white/40 text-[11px] sm:text-[12px]">
                  Your score: {topMatch.score}% | Avg: {avgCompetitorScore}%
                </p>
              </div>
            </motion.div>

            {/* Competitor score bars */}
            <div className="space-y-2 mb-6">
              {/* User's bar */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                  You
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${topMatch.score}%` }}
                      transition={{ delay: 1.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
                <span className="text-[13px] font-bold text-white tabular-nums w-10 text-right">
                  {topMatch.score}%
                </span>
              </div>

              {competitors.map((comp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.0 + i * 0.08 }}
                  onClick={() => setSelectedCompetitor(comp)}
                  className="flex items-center gap-3 cursor-pointer group rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/[0.03] transition-colors"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white/80 flex-shrink-0 ring-2 ring-transparent group-hover:ring-white/20 transition-all"
                    style={{ backgroundColor: comp.avatar }}
                  >
                    {comp.name.charAt(0)}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors font-medium truncate">
                        {comp.name}
                      </span>
                      <ThreatBadge level={comp.threatLevel} />
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: comp.avatar }}
                        initial={{ width: 0 }}
                        animate={{ width: `${comp.score}%` }}
                        transition={{ delay: 2.1 + i * 0.08, duration: 0.6 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] text-white/40 tabular-nums w-10 text-right">
                      {comp.score}%
                    </span>
                    <svg className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stand out tip */}
            <AnimatePresence mode="wait">
              {boostImprovements ? (
                <motion.div
                  key="boosted"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-[12px] font-bold text-emerald-400">Profile boosted! Here&apos;s what changed:</span>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {boostImprovements.map((imp, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-[11px] text-emerald-400/70 list-disc"
                      >
                        {imp}
                      </motion.li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-emerald-400/40 mt-2">
                    Retake the quiz to see your updated match scores.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="tip"
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <p className="text-[12px] text-amber-400/80 flex-1">
                      <span className="font-bold">Stand out tip:</span> Let AI rewrite your headline, bio, and
                      skills to boost your match score. One click, instant upgrade.
                    </p>
                    <BoostProfileButton
                      isAuthenticated={isAuthenticated}
                      onBoostComplete={(improvements) => setBoostImprovements(improvements)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ALL RESULTS GRID */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            className="mb-8"
          >
            <h3
              className="text-[28px] sm:text-[36px] text-white mb-6 tracking-[1px]"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              All Matches
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.slice(0, showAllMatches ? undefined : 8).map((match, mi) => {
                const rank = mi + 1;
                const badge = getRankBadge(rank);
                const mTemp = getTemperature(match.score);

                return (
                  <motion.div
                    key={mi}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 2.3 + mi * 0.05,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="relative p-4 rounded-xl bg-white/[0.03] ring-1 ring-white/10 hover:ring-white/[0.18] transition-all group"
                  >
                    {/* Rank badge */}
                    <div
                      className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ring-1 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {rank}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{
                          backgroundColor: `${match.brandColor}20`,
                          color: match.brandColor,
                          border: `1px solid ${match.brandColor}30`,
                        }}
                      >
                        {match.name.charAt(0)}
                      </div>
                      <div className="min-w-0 pr-8">
                        <p className="text-[14px] font-semibold text-white truncate">
                          {match.name}
                        </p>
                        <p className="text-[11px] text-white/30">{match.industry}</p>
                      </div>
                    </div>

                    {/* Score + temperature badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[24px] font-black"
                        style={{
                          color: mTemp.color,
                          fontFamily: 'var(--font-bebas)',
                          letterSpacing: '1px',
                        }}
                      >
                        {match.score}%
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: `${mTemp.color}12`,
                          color: mTemp.color,
                          border: `1px solid ${mTemp.color}25`,
                        }}
                      >
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: mTemp.color }}
                          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {mTemp.label}
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: match.brandColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score}%` }}
                        transition={{
                          delay: 2.5 + mi * 0.05,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {!showAllMatches && results.length > 8 && (
              <button
                onClick={() => setShowAllMatches(true)}
                className="w-full py-3 mt-4 text-[13px] text-white/40 hover:text-white/60 transition-colors font-medium cursor-pointer ring-1 ring-white/[0.06] rounded-xl hover:ring-white/[0.12]"
              >
                Show all {results.length} matches
              </button>
            )}
          </motion.div>

          {/* REAL JOBS THAT MATCH YOUR DNA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3
                className="text-[28px] sm:text-[36px] text-white tracking-[1px]"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                Real Jobs For You
              </h3>
              <motion.span
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1.5px] rounded-full bg-green-500/15 text-green-400 ring-1 ring-green-500/25"
                animate={{ boxShadow: ['0 0 0 0 rgba(34,197,94,0)', '0 0 0 4px rgba(34,197,94,0.15)', '0 0 0 0 rgba(34,197,94,0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Live
              </motion.span>
            </div>
            <p className="text-[13px] text-white/40 mb-6">
              Active positions matched to your work DNA — scored against your quiz profile
            </p>

            {realJobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5" />
                      <div className="flex-1">
                        <div className="h-4 bg-white/5 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-white/5 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : realJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-8 text-center"
              >
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <svg className="w-7 h-7 text-indigo-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </motion.div>
                <p className="text-[15px] text-white/60 font-medium mb-1">No live jobs yet</p>
                <p className="text-[12px] text-white/30 mb-4">
                  Recruiters are posting new positions daily — check back soon!
                </p>
                <p className="text-[11px] text-white/20">
                  Your culture profile has been saved. You&apos;ll be notified when matching jobs appear.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {realJobs.map((job, ji) => {
                  const jobTemp = getTemperature(job.matchScore);
                  const workModeIcons: Record<string, string> = {
                    remote: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
                    hybrid: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                    onsite: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                  };

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 2.6 + ji * 0.08, type: 'spring' as const, stiffness: 300, damping: 25 }}
                      whileHover={{ y: -2, scale: 1.01 }}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className="relative rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08] hover:ring-white/[0.15] p-5 cursor-pointer group overflow-hidden transition-all"
                    >
                      {/* Temperature glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 80% 20%, ${jobTemp.color}08 0%, transparent 60%)` }}
                      />

                      <div className="relative">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
                              style={{ backgroundColor: `${jobTemp.color}15`, color: jobTemp.color }}
                            >
                              {job.company.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-white truncate group-hover:text-white/90">
                                {job.title}
                              </p>
                              <p className="text-[12px] text-white/40 truncate">
                                {job.company} · {job.city ? `${job.city}, ` : ''}{job.country.toUpperCase()}
                              </p>
                            </div>
                          </div>

                          {/* Match score */}
                          <div className="text-right flex-shrink-0 ml-3">
                            <span
                              className="text-[22px] font-black"
                              style={{ color: jobTemp.color, fontFamily: 'var(--font-bebas)', letterSpacing: '1px' }}
                            >
                              {job.matchScore}%
                            </span>
                          </div>
                        </div>

                        {/* Tags row */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.06] text-white/50">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={workModeIcons[job.work_mode] || workModeIcons.hybrid} />
                            </svg>
                            {job.work_mode}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.06] text-white/50">
                            {job.job_type}
                          </span>
                          {job.visa_sponsorship && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 text-green-400/70 ring-1 ring-green-500/20">
                              Visa sponsor
                            </span>
                          )}
                          {job.salary_max && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/[0.06] text-white/50">
                              {job.salary_currency} {Math.round((job.salary_min || 0) / 1000)}k–{Math.round(job.salary_max / 1000)}k
                            </span>
                          )}
                        </div>

                        {/* Score bar */}
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: jobTemp.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${job.matchScore}%` }}
                            transition={{ delay: 2.8 + ji * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>

                        {/* Match reasons */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {job.matchReasons.map((reason, ri) => (
                            <span key={ri} className="text-[11px] text-white/30 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: jobTemp.color }} />
                              {reason}
                            </span>
                          ))}
                        </div>

                        {/* Skills preview */}
                        {job.skills_required.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills_required.slice(0, 5).map((skill, si) => (
                              <span key={si} className="px-1.5 py-0.5 text-[9px] rounded bg-white/[0.04] text-white/25">
                                {skill}
                              </span>
                            ))}
                            {job.skills_required.length > 5 && (
                              <span className="text-[9px] text-white/15">+{job.skills_required.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6 + (realJobs.length > 0 ? realJobs.length * 0.08 : 0) }}
            className="space-y-3"
          >
            {/* Primary gradient CTA */}
            <button
              onClick={() => router.push(realJobs.length > 0 ? `/jobs/${realJobs[0].id}` : '/jobs')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-[15px] rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-shadow cursor-pointer"
            >
              {realJobs.length > 0 ? `Apply to ${realJobs[0].title}` : 'Browse All Jobs'}
            </button>

            {/* View All Matched Jobs */}
            <button
              onClick={() => router.push('/jobs')}
              className="w-full py-3.5 bg-white/[0.05] ring-1 ring-white/[0.1] text-white/70 hover:text-white font-medium text-[14px] rounded-xl transition-colors cursor-pointer"
            >
              View All Jobs
            </button>

            {/* Share Results */}
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3.5 bg-white/[0.03] ring-1 ring-white/[0.06] text-white/50 hover:text-white/70 font-medium text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share Results
            </button>

            {/* Retake Quiz */}
            <button
              onClick={onRetake}
              className="w-full py-3 text-white/30 hover:text-white/50 text-[13px] transition-colors cursor-pointer"
            >
              Retake Quiz
            </button>

            {/* Sign up prompt for unauthenticated */}
            {!isAuthenticated && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] ring-1 ring-white/10 text-center">
                <p className="text-[13px] text-white/40 mb-3">
                  Sign up to save your results and get notified when new matches appear.
                </p>
                <button
                  onClick={() => router.push('/auth?mode=signup&role=candidate')}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-[13px] rounded-lg cursor-pointer"
                >
                  Create Free Account
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Competitor Drill-Down Drawer */}
      <AnimatePresence>
        {selectedCompetitor && (
          <CompetitorDrawer
            competitor={selectedCompetitor}
            userScore={topMatch.score}
            userRadarProfile={userRadarProfile}
            onClose={() => setSelectedCompetitor(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
