'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase';
import {
  springSnappy,
  springBouncy,
  springSmooth,
  springDramatic,
  getTemperatureColors,
  staggerContainer,
  staggerItem,
  spotlightReveal,
  scoreCountUp,
  glowPulse,
} from '@/lib/wow';

// -- Types ---------------------------------------------------------------

interface TalentProfile {
  id: string;
  full_name: string;
  headline?: string;
  bio?: string;
  photo_url?: string;
  skills: string[];
  experience_years: number;
  country: string;
  city?: string;
  match_tags: string[];
  is_public: boolean;
  visa_status?: string;
  available_now?: boolean;
  languages: string[];
  work_history: { company: string; title: string; start_date: string; end_date?: string; is_current: boolean }[];
  education: { institution: string; degree: string; field: string; end_year?: number }[];
  salary_expectation_min?: number;
  salary_expectation_max?: number;
  salary_currency?: string;
  notice_period?: string;
  created_at: string;
}

interface MatchedJob {
  id: string;
  title: string;
  company: string;
  work_mode: string;
  country: string;
  city?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  skills_required: string[];
  match_tags: string[];
  score: number;
  reasons: string[];
}

// -- Constants -----------------------------------------------------------

const ROLE_MAP: { keywords: string[]; abbr: string; label: string; color: string }[] = [
  { keywords: ['software', 'developer', 'engineer', 'swe', 'frontend', 'backend', 'fullstack', 'devops'], abbr: 'SWE', label: 'Engineering', color: '#3b82f6' },
  { keywords: ['product manager', 'product lead', 'product owner'], abbr: 'PM', label: 'Product', color: '#a855f7' },
  { keywords: ['data scientist', 'data science', 'machine learning', 'ml', 'ai engineer'], abbr: 'DS', label: 'Data & AI', color: '#22c55e' },
  { keywords: ['designer', 'ux', 'ui', 'design', 'creative'], abbr: 'UXD', label: 'Design', color: '#ec4899' },
  { keywords: ['marketing', 'growth', 'content', 'seo'], abbr: 'MKT', label: 'Marketing', color: '#f97316' },
  { keywords: ['finance', 'accounting', 'cfo'], abbr: 'FIN', label: 'Finance', color: '#14b8a6' },
  { keywords: ['sales', 'account executive', 'bdr', 'sdr'], abbr: 'SAL', label: 'Sales', color: '#eab308' },
  { keywords: ['hr', 'human resources', 'people', 'talent'], abbr: 'HR', label: 'People & HR', color: '#f43f5e' },
];

function getRoleInfo(headline?: string) {
  if (!headline) return { abbr: '---', label: 'Other', color: '#6b7280' };
  const lower = headline.toLowerCase();
  for (const role of ROLE_MAP) {
    if (role.keywords.some((kw) => lower.includes(kw))) return role;
  }
  return { abbr: headline.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '---', label: 'Other', color: '#6b7280' };
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const COUNTRY_FLAGS: Record<string, string> = {
  us: '\u{1F1FA}\u{1F1F8}', ca: '\u{1F1E8}\u{1F1E6}', gb: '\u{1F1EC}\u{1F1E7}', de: '\u{1F1E9}\u{1F1EA}',
  fr: '\u{1F1EB}\u{1F1F7}', es: '\u{1F1EA}\u{1F1F8}', it: '\u{1F1EE}\u{1F1F9}', nl: '\u{1F1F3}\u{1F1F1}',
  ch: '\u{1F1E8}\u{1F1ED}', be: '\u{1F1E7}\u{1F1EA}', at: '\u{1F1E6}\u{1F1F9}', pt: '\u{1F1F5}\u{1F1F9}',
  ie: '\u{1F1EE}\u{1F1EA}', se: '\u{1F1F8}\u{1F1EA}', dk: '\u{1F1E9}\u{1F1F0}', no: '\u{1F1F3}\u{1F1F4}',
  fi: '\u{1F1EB}\u{1F1EE}', pl: '\u{1F1F5}\u{1F1F1}', cz: '\u{1F1E8}\u{1F1FF}', ro: '\u{1F1F7}\u{1F1F4}',
  in: '\u{1F1EE}\u{1F1F3}', mx: '\u{1F1F2}\u{1F1FD}', br: '\u{1F1E7}\u{1F1F7}', ar: '\u{1F1E6}\u{1F1F7}',
  cn: '\u{1F1E8}\u{1F1F3}', jp: '\u{1F1EF}\u{1F1F5}', kr: '\u{1F1F0}\u{1F1F7}', vn: '\u{1F1FB}\u{1F1F3}',
  ph: '\u{1F1F5}\u{1F1ED}',
};

const COUNTRY_NAMES: Record<string, string> = {
  us: 'United States', ca: 'Canada', gb: 'United Kingdom', de: 'Germany', fr: 'France',
  es: 'Spain', it: 'Italy', nl: 'Netherlands', ch: 'Switzerland', be: 'Belgium',
  at: 'Austria', pt: 'Portugal', ie: 'Ireland', se: 'Sweden', dk: 'Denmark',
  no: 'Norway', fi: 'Finland', pl: 'Poland', cz: 'Czech Republic', ro: 'Romania',
  in: 'India', mx: 'Mexico', br: 'Brazil', ar: 'Argentina', cn: 'China',
  jp: 'Japan', kr: 'South Korea', vn: 'Vietnam', ph: 'Philippines',
};

const VISA_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  citizen: { label: 'Citizen', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  permanent_resident: { label: 'PR', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  work_visa: { label: 'Work Visa', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  needs_sponsorship: { label: 'Needs Sponsor', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

// -- Talent Score --------------------------------------------------------

function computeTalentScore(c: TalentProfile): number {
  let score = 40;
  score += Math.min(c.skills.length * 2, 15);
  score += Math.min(c.experience_years * 1.5, 15);
  if (c.photo_url) score += 4;
  if (c.bio) score += 3;
  if (c.headline) score += 3;
  if (c.work_history.length > 0) score += 3;
  if (c.education.length > 0) score += 2;
  score += Math.min(c.match_tags.length * 2, 10);
  if (c.available_now) score += 5;
  return Math.min(Math.round(score), 99);
}

// -- Tag-based matching --------------------------------------------------

function computeTagScore(candidateTags: string[], jobTags: string[], candidateSkills: string[], jobSkills: string[]): number {
  const cTags = new Set(candidateTags.map((t) => t.toLowerCase()));
  const jTags = new Set(jobTags.map((t) => t.toLowerCase()));
  const cSkills = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const jSkills = new Set(jobSkills.map((s) => s.toLowerCase()));
  let overlap = 0;
  let total = 0;
  for (const t of jTags) { total += 3; if (cTags.has(t)) overlap += 3; }
  for (const s of jSkills) { total += 2; if (cSkills.has(s)) overlap += 2; }
  if (total === 0) return 50;
  return Math.round(40 + (overlap / total) * 55);
}

// -- Wave stagger variants -----------------------------------------------

const waveContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

const waveItem = {
  hidden: { opacity: 0, y: 40, scale: 0.88, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
};

// -- Drawer section stagger (progressive disclosure) ---------------------

const drawerSectionVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + i * 0.1, type: 'spring' as const, stiffness: 300, damping: 25 },
  }),
};

// -- Dramatic Processing Reveal ------------------------------------------

function ProcessingReveal({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  const stages = [
    { icon: '\u{1F9EC}', label: 'Scanning talent profiles...', sublabel: 'Cross-referencing skills & experience' },
    { icon: '\u{1F50D}', label: 'Applying smart filters...', sublabel: 'Matching criteria to candidate DNA' },
    { icon: '\u{2728}', label: 'Computing talent scores...', sublabel: 'Temperature ranking by fit quality' },
    { icon: '\u{1F3AF}', label: 'Surfacing top matches...', sublabel: 'Ordering by highest potential' },
  ];
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setStage(0); setProgress(0); return; }
    const interval = 500;
    const timers = stages.map((_, i) =>
      setTimeout(() => { setStage(i); setProgress(((i + 1) / stages.length) * 100); }, i * interval)
    );
    timers.push(setTimeout(() => { onComplete(); }, stages.length * interval));
    return () => timers.forEach(clearTimeout);
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 relative"
    >
      {/* Orbital rings */}
      <div className="relative w-24 h-24 mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/20"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-2 rounded-full border-2 border-dashed border-purple-500/20"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-4 rounded-full border border-dashed border-pink-500/20"
        />
        {/* Center icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={springBouncy}
                className="text-2xl"
              >
                {stages[stage]?.icon}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
        {/* Orbiting particles */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'linear', delay: i * 0.3 }}
            className="absolute inset-0"
          >
            <div
              className="absolute w-2 h-2 rounded-full"
              style={{
                top: '0%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: ['#3b82f6', '#a855f7', '#ec4899'][i],
                boxShadow: `0 0 8px ${['#3b82f6', '#a855f7', '#ec4899'][i]}`,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Stage label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
          transition={springSnappy}
          className="text-center"
        >
          <p className="text-sm text-white/60 font-semibold">{stages[stage]?.label}</p>
          <p className="text-[11px] text-white/25 mt-0.5">{stages[stage]?.sublabel}</p>
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-48 h-1 rounded-full bg-white/[0.06] mt-5 overflow-hidden">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        />
      </div>
    </motion.div>
  );
}

// -- Initial Load Cinematic Reveal ----------------------------------------

function InitialLoadReveal({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => onComplete(), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-28"
    >
      {/* Pulsing logo */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 0px rgba(99, 102, 241, 0)',
            '0 0 40px rgba(99, 102, 241, 0.3)',
            '0 0 0px rgba(99, 102, 241, 0)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 flex items-center justify-center mb-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="text-2xl"
        >
          {'\u{1F50E}'}
        </motion.div>
      </motion.div>

      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.p key="s0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springSnappy} className="text-sm text-white/40 font-medium">
            Connecting to talent pool...
          </motion.p>
        )}
        {stage === 1 && (
          <motion.p key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springSnappy} className="text-sm text-white/40 font-medium">
            Loading candidate profiles...
          </motion.p>
        )}
        {stage === 2 && (
          <motion.p key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springSnappy} className="text-sm text-white/40 font-medium">
            Preparing your dashboard...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Mini progress dots */}
      <div className="flex gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: stage >= i ? 1 : 0.5,
              backgroundColor: stage >= i ? '#6366f1' : 'rgba(255,255,255,0.1)',
            }}
            transition={springBouncy}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}

// -- Animated Counter (micro-feedback for result count) ------------------

function AnimatedCount({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const { start } = scoreCountUp(from, value, 400, setDisplayed);
    start();
  }, [value]);

  return <span>{displayed}</span>;
}

// -- Share Modal ---------------------------------------------------------

function ShareModal({ name, url, onClose }: { name: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback((platform: string) => {
    const text = encodeURIComponent(`Check out ${name} on HireMatch!`);
    const encodedUrl = encodeURIComponent(url);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400');
  }, [name, url]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={springBouncy}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161929] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
      >
        <h3 className="text-lg font-bold text-white mb-4">Promote {name}</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { id: 'twitter', label: 'X / Twitter', icon: '\u{1D54F}', bg: 'bg-black' },
            { id: 'linkedin', label: 'LinkedIn', icon: 'in', bg: 'bg-blue-700' },
            { id: 'facebook', label: 'Facebook', icon: 'f', bg: 'bg-blue-600' },
          ].map((p) => (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => share(p.id)}
              className={`${p.bg} text-white rounded-xl py-3 flex flex-col items-center gap-1 cursor-pointer`}
            >
              <span className="text-xl font-bold">{p.icon}</span>
              <span className="text-[10px]">{p.label}</span>
            </motion.button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={copyLink}
          className="w-full py-2.5 rounded-lg border border-white/10 text-white/70 text-sm hover:bg-white/5 cursor-pointer"
        >
          {copied ? '\u2713 Link Copied!' : 'Copy Profile Link'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// -- Candidate Detail Drawer (progressive disclosure) --------------------

function CandidateDrawer({
  candidate,
  talentScore,
  matchedJobs,
  jobsLoading,
  locale,
  onClose,
  onPromote,
}: {
  candidate: TalentProfile;
  talentScore: number;
  matchedJobs: MatchedJob[];
  jobsLoading: boolean;
  locale: string;
  onClose: () => void;
  onPromote: () => void;
}) {
  const tempColors = getTemperatureColors(talentScore);
  const roleInfo = getRoleInfo(candidate.headline);
  const visa = candidate.visa_status ? VISA_LABELS[candidate.visa_status] : null;
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    const { start } = scoreCountUp(0, talentScore, 1000, setDisplayedScore);
    start();
  }, [talentScore]);

  // Count visible sections for progressive disclosure indexing
  let sectionIdx = 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0.5 }}
        transition={springSmooth}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-[#0d0f1a] border-l overflow-y-auto"
        style={{ borderColor: tempColors.primary + '20' }}
      >
        {/* Close button */}
        <motion.button
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.3, ...springBouncy }}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-2 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        {/* Hero section with temperature glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, ...springSmooth }}
          className="relative p-6 pb-4"
          style={{ background: `linear-gradient(180deg, ${tempColors.bg} 0%, transparent 100%)` }}
        >
          <div className="flex items-start gap-5">
            {/* Photo with temperature ring */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={springDramatic}
              className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0"
              style={{
                boxShadow: `0 0 0 3px ${tempColors.primary}40, 0 0 20px ${tempColors.glow.replace('0.5', '0.2')}`,
              }}
            >
              {candidate.photo_url ? (
                <Image src={candidate.photo_url} alt={candidate.full_name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#161929]">
                  <span className="text-2xl font-bold text-white/20">{getInitials(candidate.full_name)}</span>
                </div>
              )}
              {/* Temperature score overlay */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, ...springBouncy }}
                className="absolute bottom-0 right-0 px-2 py-0.5 rounded-tl-lg text-[11px] font-bold"
                style={{ backgroundColor: tempColors.primary, color: '#000' }}
              >
                {displayedScore}
              </motion.div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, ...springSmooth }}
              className="flex-1 min-w-0"
            >
              <h2 className="text-2xl font-bold text-white">{candidate.full_name}</h2>
              {candidate.headline && (
                <p className="text-sm mt-0.5" style={{ color: roleInfo.color }}>{candidate.headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-white/40">
                {candidate.country && (
                  <span>{COUNTRY_FLAGS[candidate.country] || ''} {candidate.country.toUpperCase()}</span>
                )}
                {candidate.city && <span>&middot; {candidate.city}</span>}
                {candidate.experience_years > 0 && <span>&middot; {candidate.experience_years}yr exp</span>}
                {candidate.available_now && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, ...springBouncy }}
                    className="px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full text-[10px] font-semibold"
                  >
                    Available Now
                  </motion.span>
                )}
                {visa && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.45, ...springBouncy }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: visa.bg, color: visa.color }}
                  >
                    {visa.label}
                  </motion.span>
                )}
              </div>
              {(candidate.salary_expectation_min || candidate.salary_expectation_max) && (
                <p className="text-[11px] text-white/25 mt-1.5">
                  {candidate.salary_currency || 'USD'}{' '}
                  {candidate.salary_expectation_min ? `${(candidate.salary_expectation_min / 1000).toFixed(0)}k` : ''}
                  {candidate.salary_expectation_min && candidate.salary_expectation_max ? ' - ' : ''}
                  {candidate.salary_expectation_max ? `${(candidate.salary_expectation_max / 1000).toFixed(0)}k` : ''}
                  /yr
                </p>
              )}
            </motion.div>
          </div>

          {/* Temperature score bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ...springSmooth }}
            className="mt-4 flex items-center gap-3"
          >
            <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Talent Score</span>
            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${talentScore}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: tempColors.gradient }}
              >
                {/* Shimmer on the bar */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, delay: 1, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  style={{ width: '50%' }}
                />
              </motion.div>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, ...springBouncy }}
              className="text-sm font-bold min-w-[3ch] text-right"
              style={{ color: tempColors.primary }}
            >
              {displayedScore}%
            </motion.span>
          </motion.div>
        </motion.div>

        {/* Languages — progressive disclosure section 0 */}
        {candidate.languages.length > 0 && (
          <motion.div
            custom={sectionIdx++}
            variants={drawerSectionVariants}
            initial="hidden"
            animate="visible"
            className="px-6 py-3 border-t border-white/5"
          >
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Languages</h3>
            <div className="flex flex-wrap gap-1.5">
              {candidate.languages.map((lang) => (
                <span key={lang} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] rounded-full font-medium">
                  {lang}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Bio — section 1 */}
        {candidate.bio && (
          <motion.div
            custom={sectionIdx++}
            variants={drawerSectionVariants}
            initial="hidden"
            animate="visible"
            className="px-6 py-4 border-t border-white/5"
          >
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">About</h3>
            <p className="text-sm text-white/60 leading-relaxed">{candidate.bio}</p>
          </motion.div>
        )}

        {/* Skills — section 2 */}
        {candidate.skills.length > 0 && (
          <motion.div
            custom={sectionIdx++}
            variants={drawerSectionVariants}
            initial="hidden"
            animate="visible"
            className="px-6 py-4 border-t border-white/5"
          >
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.03, ...springSnappy }}
                  className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline — section 3 */}
        {candidate.work_history.length > 0 && (
          <motion.div
            custom={sectionIdx++}
            variants={drawerSectionVariants}
            initial="hidden"
            animate="visible"
            className="px-6 py-4 border-t border-white/5"
          >
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Experience Timeline</h3>
            <div className="space-y-0">
              {candidate.work_history.slice(0, 5).map((job, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.12, ...springBouncy }}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.12, ...springBouncy }}
                      className="w-3 h-3 rounded-full border-2 mt-1.5 shrink-0"
                      style={{
                        borderColor: job.is_current ? '#22c55e' : roleInfo.color + '60',
                        backgroundColor: job.is_current ? '#22c55e30' : 'transparent',
                      }}
                    />
                    {i < candidate.work_history.length - 1 && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.6 + i * 0.12, duration: 0.3 }}
                        className="w-[2px] flex-1 bg-white/5 my-1 origin-top"
                      />
                    )}
                  </div>
                  <div className="pb-4 min-w-0">
                    <p className="text-sm font-semibold text-white">{job.title}</p>
                    <p className="text-xs text-white/40">{job.company}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">
                      {new Date(job.start_date).getFullYear()} &mdash;{' '}
                      {job.is_current ? 'Present' : job.end_date ? new Date(job.end_date).getFullYear() : ''}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Education — section 4 */}
        {candidate.education.length > 0 && (
          <motion.div
            custom={sectionIdx++}
            variants={drawerSectionVariants}
            initial="hidden"
            animate="visible"
            className="px-6 py-4 border-t border-white/5"
          >
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Education</h3>
            {candidate.education.map((edu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1, ...springSmooth }}
                className="mb-2"
              >
                <p className="text-sm font-medium text-white">{edu.degree} in {edu.field}</p>
                <p className="text-xs text-white/40">{edu.institution} {edu.end_year ? `(${edu.end_year})` : ''}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Matchmaker CTA — section 5 */}
        <motion.div
          custom={sectionIdx++}
          variants={drawerSectionVariants}
          initial="hidden"
          animate="visible"
          className="px-6 py-4 border-t border-white/5"
        >
          <Link href={`/${locale}/matchmaker`}>
            <motion.div
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
              transition={springSnappy}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-indigo-600/20 border border-purple-500/20 p-4 cursor-pointer group"
            >
              {/* Animated shimmer */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
                style={{ width: '40%' }}
              />
              <div className="relative flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center shrink-0"
                >
                  <span className="text-lg">{'\u{1F3AF}'}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Find Their Perfect Match</p>
                  <p className="text-[11px] text-white/40">Run AI matchmaker to discover the best roles for {candidate.full_name.split(' ')[0]}</p>
                </div>
                <motion.svg
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 text-purple-400 shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </motion.svg>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Matching Jobs Section — section 6 */}
        <motion.div
          custom={sectionIdx++}
          variants={drawerSectionVariants}
          initial="hidden"
          animate="visible"
          className="px-6 py-4 border-t border-white/5"
        >
          <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
            Matching Jobs
          </h3>
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-white/30 text-sm py-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
              />
              Finding best matches...
            </div>
          ) : matchedJobs.length === 0 ? (
            <p className="text-sm text-white/30 py-2">No matching jobs found yet.</p>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
              {matchedJobs.map((job) => {
                const jobColors = getTemperatureColors(job.score);
                return (
                  <motion.div
                    key={job.id}
                    variants={staggerItem}
                    whileHover={{ scale: 1.01, x: 4 }}
                    transition={springSnappy}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:border-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                        <p className="text-xs text-white/40">{job.company} &middot; {job.country.toUpperCase()}</p>
                        {job.reasons.length > 0 && (
                          <p className="text-[10px] text-white/25 mt-1 truncate">{job.reasons[0]}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: jobColors.bg, color: jobColors.primary }}
                        >
                          {job.score}%
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.92 }}
                          transition={springSnappy}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-500 transition-colors"
                        >
                          Apply
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, ...springSmooth }}
          className="sticky bottom-0 px-6 py-4 bg-[#0d0f1a]/95 backdrop-blur-sm border-t border-white/5"
        >
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={springSnappy}
              onClick={onPromote}
              className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-400 font-semibold text-sm cursor-pointer hover:bg-purple-500/5 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Promote
            </motion.button>
            <Link href={`/candidates/${candidate.id}`} className="flex-1">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-blue-500/20"
              >
                Full Profile \u2192
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// -- Confetti Burst ------------------------------------------------------

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 18 + ((i * 7 + 3) % 14);
        const colors = ['#22c55e', '#4ade80', '#86efac', '#3b82f6', '#a855f7', '#fbbf24'];
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{ width: 4, height: 4, backgroundColor: colors[i % colors.length], top: '50%', left: '50%', marginTop: -2, marginLeft: -2 }}
          />
        );
      })}
    </div>
  );
}

// -- Talent Card (Enhanced) -----------------------------------------------

function TalentCard({
  candidate,
  talentScore,
  locale,
  onSelect,
  onEndorse,
  endorsed,
}: {
  candidate: TalentProfile;
  talentScore: number;
  locale: string;
  onSelect: () => void;
  onEndorse: () => void;
  endorsed: boolean;
}) {
  const roleInfo = getRoleInfo(candidate.headline);
  const tempColors = getTemperatureColors(talentScore);
  const visa = candidate.visa_status ? VISA_LABELS[candidate.visa_status] : null;
  const [showConfetti, setShowConfetti] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scoreControls = useAnimationControls();

  const handleEndorse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndorse();
    if (!endorsed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 600);
    }
  };

  // Score badge entrance animation on mount
  useEffect(() => {
    scoreControls.start({
      scale: [0, 1.3, 1],
      transition: { delay: 0.3, duration: 0.5, ease: 'easeOut' },
    });
  }, [scoreControls]);

  return (
    <motion.div
      variants={waveItem}
      whileHover={{ y: -6, scale: 1.03 }}
      transition={springSnappy}
      onClick={onSelect}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group overflow-hidden rounded-2xl bg-[#161929] border cursor-pointer relative"
      style={{
        borderColor: isHovered ? tempColors.primary + '50' : '#1e2235',
        boxShadow: isHovered ? `0 12px 40px ${tempColors.glow.replace('0.5', '0.2')}, 0 0 0 1px ${tempColors.primary}15` : 'none',
      }}
    >
      {/* Always-on subtle temperature tint at top */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at top, ${tempColors.bg} 0%, transparent 50%)` }}
      />

      {/* Photo area */}
      <div className="relative aspect-[3/4]">
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.full_name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover object-top group-hover:scale-[1.07] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${roleInfo.color}15 0%, #0d1117 100%)` }}>
            <span className="text-4xl font-bold text-white/15">{getInitials(candidate.full_name)}</span>
          </div>
        )}

        {/* Gradient overlay — deeper for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Role badge — top left */}
        <div className="absolute top-2 left-2">
          <div className="backdrop-blur-md rounded-md px-1.5 py-0.5 border border-white/10" style={{ backgroundColor: roleInfo.color + '25' }}>
            <span className="text-[10px] font-bold tracking-wider" style={{ color: roleInfo.color }}>{roleInfo.abbr}</span>
          </div>
        </div>

        {/* Talent score badge — top right with glow pulse */}
        <motion.div
          animate={scoreControls}
          className="absolute top-2 right-2 backdrop-blur-md rounded-lg px-2 py-1 border flex items-center gap-1"
          style={{
            backgroundColor: tempColors.bg,
            borderColor: tempColors.primary + '40',
            boxShadow: `0 0 12px ${tempColors.glow.replace('0.5', '0.15')}`,
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tempColors.primary }}
          />
          <span className="text-[11px] font-bold" style={{ color: tempColors.primary }}>{talentScore}</span>
        </motion.div>

        {/* Available badge */}
        {candidate.available_now && (
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, ...springBouncy }}
            className="absolute top-9 right-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm rounded-full px-1.5 py-0.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[9px] text-green-400 font-medium">Now</span>
          </motion.div>
        )}

        {/* Bottom overlays */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{COUNTRY_FLAGS[candidate.country] || ''}</span>
            {visa && (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider backdrop-blur-sm"
                style={{ backgroundColor: visa.bg, color: visa.color }}>
                {visa.label}
              </span>
            )}
          </div>
          {candidate.experience_years > 0 && (
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[10px] text-white/60 font-medium">{candidate.experience_years}yr</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="relative px-3 pt-2 pb-1">
        <p className="text-sm font-bold text-white truncate">{candidate.full_name}</p>
        {candidate.headline && (
          <p className="text-[11px] truncate" style={{ color: roleInfo.color }}>{candidate.headline}</p>
        )}
        {candidate.city && (
          <p className="text-[10px] text-white/30 mt-0.5">{candidate.city}</p>
        )}
        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {candidate.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full truncate max-w-[90px]">
                {skill}
              </span>
            ))}
            {candidate.skills.length > 3 && (
              <span className="text-[10px] text-white/20">+{candidate.skills.length - 3}</span>
            )}
          </div>
        )}
        {candidate.match_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {candidate.match_tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        {candidate.languages.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <svg className="w-2.5 h-2.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
            </svg>
            <span className="text-[9px] text-white/20 truncate">{candidate.languages.slice(0, 3).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative px-3 pb-2.5 flex gap-1.5">
        <div className="relative flex-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={springSnappy}
            onClick={handleEndorse}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all ${
              endorsed
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-[#2a2f45] text-white hover:border-green-500/30 hover:bg-green-500/5'
            }`}
          >
            {endorsed ? '\u2713 Endorsed' : '\u{1F44D} Endorse'}
          </motion.button>
          <ConfettiBurst active={showConfetti} />
        </div>
        <Link
          href={`/${locale}/matchmaker`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={springSnappy}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/25 text-purple-300 hover:border-purple-400/40 transition-all"
          >
            {'\u{1F3AF}'} Match
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// -- Advanced Filters Panel -----------------------------------------------

function AdvancedFilters({
  countries,
  countryFilter,
  setCountryFilter,
  expRange,
  setExpRange,
  visaFilter,
  setVisaFilter,
  availableOnly,
  setAvailableOnly,
  onApply,
}: {
  countries: string[];
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  expRange: [number, number];
  setExpRange: (v: [number, number]) => void;
  visaFilter: string;
  setVisaFilter: (v: string) => void;
  availableOnly: boolean;
  setAvailableOnly: (v: boolean) => void;
  onApply: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      transition={springSmooth}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl mb-4">
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1 block">Country</label>
          <select
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); onApply(); }}
            className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 cursor-pointer"
          >
            <option value="all">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{COUNTRY_FLAGS[c] || ''} {COUNTRY_NAMES[c] || c.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1 block">
            Experience: {expRange[0]}-{expRange[1]}yr
          </label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={20} value={expRange[0]}
              onChange={(e) => { setExpRange([Math.min(Number(e.target.value), expRange[1]), expRange[1]]); onApply(); }}
              className="flex-1 accent-blue-500 h-1" />
            <input type="range" min={0} max={20} value={expRange[1]}
              onChange={(e) => { setExpRange([expRange[0], Math.max(Number(e.target.value), expRange[0])]); onApply(); }}
              className="flex-1 accent-blue-500 h-1" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1 block">Visa Status</label>
          <select
            value={visaFilter}
            onChange={(e) => { setVisaFilter(e.target.value); onApply(); }}
            className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white/70 focus:outline-none focus:border-blue-500/40 cursor-pointer"
          >
            <option value="all">Any Status</option>
            <option value="citizen">Citizen</option>
            <option value="permanent_resident">Permanent Resident</option>
            <option value="work_visa">Work Visa</option>
            <option value="needs_sponsorship">Needs Sponsorship</option>
          </select>
        </div>
        <div className="flex flex-col justify-between">
          <label className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1 block">Availability</label>
          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            onClick={() => { setAvailableOnly(!availableOnly); onApply(); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
              availableOnly
                ? 'bg-green-500/15 border-green-500/30 text-green-400'
                : 'bg-transparent border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            <motion.div
              animate={availableOnly ? { scale: [1, 1.2, 1] } : {}}
              transition={springBouncy}
              className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                availableOnly ? 'border-green-500 bg-green-500' : 'border-white/20'
              }`}
            >
              {availableOnly && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springBouncy}
                  className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </motion.div>
            Available Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// -- Main Page -----------------------------------------------------------

export default function TalentPage() {
  const supabase = createClient();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [candidates, setCandidates] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialRevealDone, setInitialRevealDone] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<TalentProfile | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [endorsed, setEndorsed] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [countryFilter, setCountryFilter] = useState('all');
  const [expRange, setExpRange] = useState<[number, number]>([0, 20]);
  const [visaFilter, setVisaFilter] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'experience'>('score');
  const [filterPulse, setFilterPulse] = useState<string | null>(null);

  // Fetch candidates
  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true);
      const { data } = await supabase
        .from('candidates')
        .select('id, full_name, headline, bio, photo_url, skills, experience_years, country, city, match_tags, is_public, visa_status, available_now, languages, work_history, education, salary_expectation_min, salary_expectation_max, salary_currency, notice_period, created_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(80);
      setCandidates((data as TalentProfile[]) || []);
      setLoading(false);
    }
    fetchCandidates();
  }, []);

  const talentScores = useMemo(() => {
    const scores = new Map<string, number>();
    candidates.forEach((c) => scores.set(c.id, computeTalentScore(c)));
    return scores;
  }, [candidates]);

  const availableCountries = useMemo(() => {
    const countries = new Set(candidates.map((c) => c.country).filter(Boolean));
    return Array.from(countries).sort();
  }, [candidates]);

  useEffect(() => {
    if (!selectedCandidate) return;
    async function fetchJobs() {
      setJobsLoading(true);
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, recruiter:recruiters(company_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!jobs || jobs.length === 0) { setMatchedJobs([]); setJobsLoading(false); return; }
      const scored = jobs.map((job: Record<string, unknown>) => {
        const recruiterData = job.recruiter as Record<string, unknown> | null;
        const score = computeTagScore(
          selectedCandidate!.match_tags, (job.match_tags as string[]) || [],
          selectedCandidate!.skills, (job.skills_required as string[]) || [],
        );
        const reasons: string[] = [];
        const sharedSkills = (selectedCandidate!.skills || []).filter((s) =>
          ((job.skills_required as string[]) || []).some((js) => js.toLowerCase() === s.toLowerCase()));
        if (sharedSkills.length > 0) reasons.push(`Skills match: ${sharedSkills.slice(0, 3).join(', ')}`);
        const sharedTags = (selectedCandidate!.match_tags || []).filter((t) =>
          ((job.match_tags as string[]) || []).some((jt) => jt.toLowerCase() === t.toLowerCase()));
        if (sharedTags.length > 0) reasons.push(`Culture fit: ${sharedTags.slice(0, 2).join(', ')}`);
        if (reasons.length === 0) reasons.push(`${(job.work_mode as string || 'hybrid')} position`);
        return {
          id: job.id as string, title: job.title as string,
          company: (recruiterData?.company_name as string) || 'Company',
          work_mode: job.work_mode as string, country: job.country as string,
          city: job.city as string | undefined,
          salary_min: job.salary_min as number | undefined, salary_max: job.salary_max as number | undefined,
          salary_currency: (job.salary_currency as string) || 'USD',
          skills_required: (job.skills_required as string[]) || [], match_tags: (job.match_tags as string[]) || [],
          score, reasons,
        };
      });
      scored.sort((a: MatchedJob, b: MatchedJob) => b.score - a.score);
      setMatchedJobs(scored.slice(0, 8));
      setJobsLoading(false);
    }
    fetchJobs();
  }, [selectedCandidate]);

  const filtered = useMemo(() => {
    let result = candidates;
    if (filter !== 'all') result = result.filter((c) => getRoleInfo(c.headline).abbr === filter);
    if (countryFilter !== 'all') result = result.filter((c) => c.country === countryFilter);
    result = result.filter((c) => c.experience_years >= expRange[0] && c.experience_years <= expRange[1]);
    if (visaFilter !== 'all') result = result.filter((c) => c.visa_status === visaFilter);
    if (availableOnly) result = result.filter((c) => c.available_now);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name.toLowerCase().includes(q) || (c.headline || '').toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q)) || c.match_tags.some((t) => t.toLowerCase().includes(q)) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'score') result = [...result].sort((a, b) => (talentScores.get(b.id) || 0) - (talentScores.get(a.id) || 0));
    else if (sortBy === 'experience') result = [...result].sort((a, b) => b.experience_years - a.experience_years);
    return result;
  }, [candidates, filter, search, countryFilter, expRange, visaFilter, availableOnly, sortBy, talentScores]);

  const triggerProcessing = useCallback(() => {
    if (candidates.length > 0) setProcessing(true);
  }, [candidates.length]);

  // Micro-feedback: flash pulse on active filter pill
  const handleFilterClick = useCallback((f: string) => {
    setFilter(f);
    setFilterPulse(f);
    setTimeout(() => setFilterPulse(null), 300);
    triggerProcessing();
  }, [triggerProcessing]);

  const handleEndorse = useCallback((id: string) => {
    setEndorsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const roleFilters: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    ...ROLE_MAP.map((r) => ({ key: r.abbr, label: r.label })),
  ];

  const scoreDistribution = useMemo(() => {
    let gold = 0, green = 0, purple = 0, blue = 0;
    filtered.forEach((c) => {
      const s = talentScores.get(c.id) || 0;
      if (s >= 90) gold++; else if (s >= 75) green++; else if (s >= 60) purple++; else blue++;
    });
    return { gold, green, purple, blue };
  }, [filtered, talentScores]);

  // Determine page phase
  const showInitialReveal = loading || (!loading && !initialRevealDone);
  const showContent = !loading && initialRevealDone;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0c15] relative">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            animate={{
              background: [
                'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-40 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            animate={{
              background: [
                'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)',
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
          {/* Phase 1: Cinematic initial load */}
          <AnimatePresence>
            {showInitialReveal && !loading && (
              <InitialLoadReveal onComplete={() => setInitialRevealDone(true)} />
            )}
          </AnimatePresence>

          {/* Simple loading while fetching */}
          {loading && (
            <InitialLoadReveal onComplete={() => {}} />
          )}

          {/* Phase 2: Content reveal (spring-driven) */}
          {showContent && (
            <>
              {/* Header — spring entrance */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={springDramatic}
                className="text-center mb-10"
              >
                <h1
                  className="text-[40px] sm:text-[56px] tracking-[2px] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3"
                  style={{ fontFamily: 'var(--font-bebas)' }}
                >
                  Discover Top Talent
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/40 text-sm max-w-lg mx-auto"
                >
                  Browse job seekers, explore profiles, and find the perfect match.
                  Temperature-scored talent cards help you identify top candidates at a glance.
                </motion.p>
              </motion.div>

              {/* Search + Filters — spring entrance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...springSmooth }}
                className="flex flex-col gap-3 mb-4"
              >
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 w-full sm:max-w-sm">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, skill, tag, city..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>

                  {/* Role filters with micro-feedback pulse */}
                  <div className="flex flex-wrap gap-1.5">
                    {roleFilters.map((f) => (
                      <motion.button
                        key={f.key}
                        whileTap={{ scale: 0.9 }}
                        animate={filterPulse === f.key ? { scale: [1, 1.15, 1] } : {}}
                        transition={springSnappy}
                        onClick={() => handleFilterClick(f.key)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all min-h-[36px] ${
                          filter === f.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                        }`}
                      >
                        {f.label}
                      </motion.button>
                    ))}
                  </div>

                  {/* Sort + Advanced toggle */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => { setSortBy(e.target.value as 'score' | 'recent' | 'experience'); triggerProcessing(); }}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white/60 focus:outline-none focus:border-blue-500/40 cursor-pointer"
                    >
                      <option value="score">Top Score</option>
                      <option value="recent">Most Recent</option>
                      <option value="experience">Experience</option>
                    </select>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      transition={springSnappy}
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all min-h-[36px] flex items-center gap-1.5 ${
                        showAdvancedFilters
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] border border-transparent'
                      }`}
                    >
                      <motion.svg
                        animate={{ rotate: showAdvancedFilters ? 180 : 0 }}
                        transition={springBouncy}
                        className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                      </motion.svg>
                      Filters
                    </motion.button>
                  </div>
                </div>

                {/* Advanced filters panel */}
                <AnimatePresence>
                  {showAdvancedFilters && (
                    <AdvancedFilters
                      countries={availableCountries}
                      countryFilter={countryFilter}
                      setCountryFilter={setCountryFilter}
                      expRange={expRange}
                      setExpRange={setExpRange}
                      visaFilter={visaFilter}
                      setVisaFilter={setVisaFilter}
                      availableOnly={availableOnly}
                      setAvailableOnly={setAvailableOnly}
                      onApply={triggerProcessing}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Dramatic processing reveal */}
              <AnimatePresence>
                {processing && (
                  <ProcessingReveal
                    active={processing}
                    onComplete={() => { setProcessing(false); setGridKey((k) => k + 1); }}
                  />
                )}
              </AnimatePresence>

              {/* No results */}
              {!processing && filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springSmooth}
                  className="text-center py-20"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-4xl mb-4"
                  >
                    {'\u{1F50D}'}
                  </motion.div>
                  <p className="text-white/30 text-lg mb-2">No candidates found</p>
                  <p className="text-white/15 text-sm">Try adjusting your filters or search terms.</p>
                </motion.div>
              )}

              {/* Phase 3: Grid reveal (wave stagger) */}
              {!processing && filtered.length > 0 && (
                <motion.div
                  key={gridKey}
                  variants={waveContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                >
                  {filtered.map((candidate) => (
                    <TalentCard
                      key={candidate.id}
                      candidate={candidate}
                      talentScore={talentScores.get(candidate.id) || 50}
                      locale={locale}
                      onSelect={() => setSelectedCandidate(candidate)}
                      onEndorse={() => handleEndorse(candidate.id)}
                      endorsed={endorsed.has(candidate.id)}
                    />
                  ))}
                </motion.div>
              )}

              {/* Stats bar with animated counters + temperature distribution */}
              {!processing && filtered.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, ...springSmooth }}
                  className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-white/25"
                >
                  <span><AnimatedCount value={filtered.length} /> candidates</span>
                  <span>&middot;</span>
                  <span><AnimatedCount value={endorsed.size} /> endorsed</span>
                  <span>&middot;</span>
                  <span><AnimatedCount value={new Set(filtered.map((c) => c.country)).size} /> countries</span>
                  <span>&middot;</span>
                  <div className="flex items-center gap-2">
                    {scoreDistribution.gold > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBouncy} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-amber-400/60"><AnimatedCount value={scoreDistribution.gold} /></span>
                      </motion.span>
                    )}
                    {scoreDistribution.green > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05, ...springBouncy }} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-green-400/60"><AnimatedCount value={scoreDistribution.green} /></span>
                      </motion.span>
                    )}
                    {scoreDistribution.purple > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, ...springBouncy }} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-purple-400/60"><AnimatedCount value={scoreDistribution.purple} /></span>
                      </motion.span>
                    )}
                    {scoreDistribution.blue > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, ...springBouncy }} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-blue-400/60"><AnimatedCount value={scoreDistribution.blue} /></span>
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Candidate Drawer (Phase 4: progressive disclosure) */}
        <AnimatePresence>
          {selectedCandidate && (
            <CandidateDrawer
              candidate={selectedCandidate}
              talentScore={talentScores.get(selectedCandidate.id) || 50}
              matchedJobs={matchedJobs}
              jobsLoading={jobsLoading}
              locale={locale}
              onClose={() => { setSelectedCandidate(null); setMatchedJobs([]); }}
              onPromote={() => setShowShareModal(selectedCandidate.id)}
            />
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <ShareModal
              name={candidates.find((c) => c.id === showShareModal)?.full_name || 'Candidate'}
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/candidates/${showShareModal}`}
              onClose={() => setShowShareModal(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
