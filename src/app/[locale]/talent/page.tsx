'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
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
  pulseOnce,
  successBurst,
  glowPulse,
} from '@/lib/wow';

// ── Types ──────────────────────────────────────────────────────

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

// ── Constants ──────────────────────────────────────────────────

const ROLE_MAP: { keywords: string[]; abbr: string; color: string }[] = [
  { keywords: ['software', 'developer', 'engineer', 'swe', 'frontend', 'backend', 'fullstack', 'devops'], abbr: 'SWE', color: '#3b82f6' },
  { keywords: ['product manager', 'product lead', 'product owner'], abbr: 'PM', color: '#a855f7' },
  { keywords: ['data scientist', 'data science', 'machine learning', 'ml', 'ai engineer'], abbr: 'DS', color: '#22c55e' },
  { keywords: ['designer', 'ux', 'ui', 'design', 'creative'], abbr: 'UXD', color: '#ec4899' },
  { keywords: ['marketing', 'growth', 'content', 'seo'], abbr: 'MKT', color: '#f97316' },
  { keywords: ['finance', 'accounting', 'cfo'], abbr: 'FIN', color: '#14b8a6' },
  { keywords: ['sales', 'account executive', 'bdr', 'sdr'], abbr: 'SAL', color: '#eab308' },
  { keywords: ['hr', 'human resources', 'people', 'talent'], abbr: 'HR', color: '#f43f5e' },
];

function getRoleInfo(headline?: string) {
  if (!headline) return { abbr: '---', color: '#6b7280' };
  const lower = headline.toLowerCase();
  for (const role of ROLE_MAP) {
    if (role.keywords.some((kw) => lower.includes(kw))) return role;
  }
  return { abbr: headline.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '---', color: '#6b7280' };
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

const COUNTRY_FLAGS: Record<string, string> = {
  us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', nl: '🇳🇱',
  ch: '🇨🇭', be: '🇧🇪', at: '🇦🇹', pt: '🇵🇹', ie: '🇮🇪', se: '🇸🇪', dk: '🇩🇰', no: '🇳🇴',
  fi: '🇫🇮', pl: '🇵🇱', cz: '🇨🇿', ro: '🇷🇴', in: '🇮🇳', mx: '🇲🇽', br: '🇧🇷', ar: '🇦🇷',
  cn: '🇨🇳', jp: '🇯🇵', kr: '🇰🇷', vn: '🇻🇳', ph: '🇵🇭',
};

// ── Tag-based matching ─────────────────────────────────────────

function computeTagScore(candidateTags: string[], jobTags: string[], candidateSkills: string[], jobSkills: string[]): number {
  const cTags = new Set(candidateTags.map((t) => t.toLowerCase()));
  const jTags = new Set(jobTags.map((t) => t.toLowerCase()));
  const cSkills = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const jSkills = new Set(jobSkills.map((s) => s.toLowerCase()));

  let overlap = 0;
  let total = 0;

  // Tag overlap (weight: 3)
  for (const t of jTags) {
    total += 3;
    if (cTags.has(t)) overlap += 3;
  }

  // Skills overlap (weight: 2)
  for (const s of jSkills) {
    total += 2;
    if (cSkills.has(s)) overlap += 2;
  }

  if (total === 0) return 50;
  return Math.round(40 + (overlap / total) * 55);
}

// ── Share / Promote Modal ──────────────────────────────────────

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
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={springBouncy}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#161929] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
      >
        <h3 className="text-lg font-bold text-white mb-4">Promote {name}</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { id: 'twitter', label: 'X / Twitter', icon: '𝕏', bg: 'bg-black' },
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
          {copied ? '✓ Link Copied!' : 'Copy Profile Link'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Candidate Detail Drawer ────────────────────────────────────

function CandidateDrawer({
  candidate,
  matchedJobs,
  jobsLoading,
  onClose,
  onPromote,
}: {
  candidate: TalentProfile;
  matchedJobs: MatchedJob[];
  jobsLoading: boolean;
  onClose: () => void;
  onPromote: () => void;
}) {
  const tempColors = getTemperatureColors(matchedJobs[0]?.score || 50);
  const roleInfo = getRoleInfo(candidate.headline);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={springSmooth}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-[#0d0f1a] border-l border-white/10 overflow-y-auto"
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-2 cursor-pointer">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Hero section */}
        <div className="relative p-6 pb-4" style={{ background: `linear-gradient(180deg, ${roleInfo.color}15 0%, transparent 100%)` }}>
          <div className="flex items-start gap-5">
            {/* Photo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springBouncy}
              className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 shrink-0"
              style={{ borderColor: roleInfo.color + '40' }}
            >
              {candidate.photo_url ? (
                <Image src={candidate.photo_url} alt={candidate.full_name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#161929]">
                  <span className="text-2xl font-bold text-white/20">{getInitials(candidate.full_name)}</span>
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
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
                  <span className="px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full text-[10px] font-semibold">
                    Available Now
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {candidate.bio && (
          <div className="px-6 py-4 border-t border-white/5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">About</h3>
            <p className="text-sm text-white/60 leading-relaxed">{candidate.bio}</p>
          </div>
        )}

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {candidate.work_history.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Experience Timeline</h3>
            <div className="space-y-0">
              {candidate.work_history.slice(0, 5).map((job, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, ...springBouncy }}
                  className="flex gap-3"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-3 h-3 rounded-full border-2 mt-1.5 shrink-0"
                      style={{
                        borderColor: job.is_current ? '#22c55e' : roleInfo.color + '60',
                        backgroundColor: job.is_current ? '#22c55e' + '30' : 'transparent',
                      }}
                    />
                    {i < candidate.work_history.length - 1 && (
                      <div className="w-[2px] flex-1 bg-white/5 my-1" />
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
          </div>
        )}

        {/* Education */}
        {candidate.education.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Education</h3>
            {candidate.education.map((edu, i) => (
              <div key={i} className="mb-2">
                <p className="text-sm font-medium text-white">{edu.degree} in {edu.field}</p>
                <p className="text-xs text-white/40">{edu.institution} {edu.end_year ? `(${edu.end_year})` : ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* Matching Jobs Section */}
        <div className="px-6 py-4 border-t border-white/5">
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
                    className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:border-white/10 transition-colors"
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
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
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
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 px-6 py-4 bg-[#0d0f1a]/95 backdrop-blur-sm border-t border-white/5">
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-blue-500/20"
              >
                Full Profile →
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Confetti Burst ─────────────────────────────────────────────

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 20 + ((i * 7 + 3) % 12);
        const colors = ['#22c55e', '#4ade80', '#86efac', '#3b82f6', '#a855f7'];
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0.3 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute rounded-full"
            style={{ width: 4, height: 4, backgroundColor: colors[i % colors.length], top: '50%', left: '50%', marginTop: -2, marginLeft: -2 }}
          />
        );
      })}
    </div>
  );
}

// ── Talent Card ────────────────────────────────────────────────

function TalentCard({
  candidate,
  index,
  onSelect,
  onEndorse,
  endorsed,
}: {
  candidate: TalentProfile;
  index: number;
  onSelect: () => void;
  onEndorse: () => void;
  endorsed: boolean;
}) {
  const roleInfo = getRoleInfo(candidate.headline);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleEndorse = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEndorse();
    if (!endorsed) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 600);
    }
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={springSnappy}
      onClick={onSelect}
      className="group overflow-hidden rounded-2xl bg-[#161929] border border-[#1e2235] cursor-pointer hover:border-white/10 transition-colors"
    >
      {/* Photo area */}
      <div className="relative aspect-[3/4]">
        {candidate.photo_url ? (
          <Image
            src={candidate.photo_url}
            alt={candidate.full_name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${roleInfo.color}15 0%, #0d1117 100%)` }}>
            <span className="text-4xl font-bold text-white/15">{getInitials(candidate.full_name)}</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Role badge */}
        <div className="absolute top-2 left-2">
          <div className="backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/10" style={{ backgroundColor: roleInfo.color + '25' }}>
            <span className="text-[10px] font-bold tracking-wider" style={{ color: roleInfo.color }}>{roleInfo.abbr}</span>
          </div>
        </div>

        {/* Available badge */}
        {candidate.available_now && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-[10px] text-green-400 font-medium">Available</span>
          </div>
        )}

        {/* Country flag */}
        <div className="absolute bottom-2 left-2 text-sm">
          {COUNTRY_FLAGS[candidate.country] || ''}
        </div>

        {/* Experience */}
        {candidate.experience_years > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-[10px] text-white/60 font-medium">{candidate.experience_years}yr</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-sm font-bold text-white truncate">{candidate.full_name}</p>
        {candidate.headline && (
          <p className="text-[11px] truncate" style={{ color: roleInfo.color }}>{candidate.headline}</p>
        )}
        {candidate.city && (
          <p className="text-[10px] text-white/30 mt-0.5">{candidate.city}</p>
        )}

        {/* Skills */}
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

        {/* Tags */}
        {candidate.match_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {candidate.match_tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pb-2.5 flex gap-1.5">
        <div className="relative flex-1">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleEndorse}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border transition-all ${
              endorsed
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-[#2a2f45] text-white hover:border-green-500/30 hover:bg-green-500/5'
            }`}
          >
            {endorsed ? '✓ Endorsed' : '👍 Endorse'}
          </motion.button>
          <ConfettiBurst active={showConfetti} />
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer bg-[#0d1117] border border-blue-500/30 text-blue-300/90 hover:border-blue-400/50 transition-all"
        >
          View →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function TalentPage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<TalentProfile | null>(null);
  const [matchedJobs, setMatchedJobs] = useState<MatchedJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [endorsed, setEndorsed] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Fetch candidates
  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true);
      const { data } = await supabase
        .from('candidates')
        .select('id, full_name, headline, bio, photo_url, skills, experience_years, country, city, match_tags, is_public, visa_status, available_now, languages, work_history, education, created_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(60);
      setCandidates((data as TalentProfile[]) || []);
      setLoading(false);
    }
    fetchCandidates();
  }, []);

  // When candidate selected, fetch matching jobs
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

      if (!jobs || jobs.length === 0) {
        setMatchedJobs([]);
        setJobsLoading(false);
        return;
      }

      const scored = jobs.map((job: Record<string, unknown>) => {
        const recruiterData = job.recruiter as Record<string, unknown> | null;
        const score = computeTagScore(
          selectedCandidate!.match_tags,
          (job.match_tags as string[]) || [],
          selectedCandidate!.skills,
          (job.skills_required as string[]) || [],
        );

        const reasons: string[] = [];
        const sharedSkills = (selectedCandidate!.skills || []).filter((s) =>
          ((job.skills_required as string[]) || []).some((js) => js.toLowerCase() === s.toLowerCase())
        );
        if (sharedSkills.length > 0) reasons.push(`Skills match: ${sharedSkills.slice(0, 3).join(', ')}`);
        const sharedTags = (selectedCandidate!.match_tags || []).filter((t) =>
          ((job.match_tags as string[]) || []).some((jt) => jt.toLowerCase() === t.toLowerCase())
        );
        if (sharedTags.length > 0) reasons.push(`Culture fit: ${sharedTags.slice(0, 2).join(', ')}`);
        if (reasons.length === 0) reasons.push(`${(job.work_mode as string || 'hybrid')} position`);

        return {
          id: job.id as string,
          title: job.title as string,
          company: (recruiterData?.company_name as string) || 'Company',
          work_mode: job.work_mode as string,
          country: job.country as string,
          city: job.city as string | undefined,
          salary_min: job.salary_min as number | undefined,
          salary_max: job.salary_max as number | undefined,
          salary_currency: (job.salary_currency as string) || 'USD',
          skills_required: (job.skills_required as string[]) || [],
          match_tags: (job.match_tags as string[]) || [],
          score,
          reasons,
        };
      });

      scored.sort((a: MatchedJob, b: MatchedJob) => b.score - a.score);
      setMatchedJobs(scored.slice(0, 8));
      setJobsLoading(false);
    }

    fetchJobs();
  }, [selectedCandidate]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = candidates;
    if (filter !== 'all') {
      result = result.filter((c) => {
        const role = getRoleInfo(c.headline);
        return role.abbr === filter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.headline || '').toLowerCase().includes(q) ||
          c.skills.some((s) => s.toLowerCase().includes(q)) ||
          c.match_tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [candidates, filter, search]);

  const handleEndorse = useCallback((id: string) => {
    setEndorsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const filters = ['all', 'SWE', 'PM', 'DS', 'UXD', 'MKT', 'FIN', 'SAL', 'HR'];

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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1
              className="text-[40px] sm:text-[56px] tracking-[2px] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Discover Top Talent
            </h1>
            <p className="text-white/40 text-sm max-w-lg mx-auto">
              Browse job seekers, explore their profiles, and find the perfect match for your team.
              Tag-based AI matching connects the right people to the right roles.
            </p>
          </motion.div>

          {/* Search + Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center gap-3 mb-8"
          >
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, skill, or tag..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            {/* Role filters */}
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <motion.button
                  key={f}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all min-h-[36px] ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
              />
            </div>
          )}

          {/* No results */}
          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-white/30 text-lg mb-2">No candidates found</p>
              <p className="text-white/15 text-sm">Try adjusting your filters or search terms.</p>
            </motion.div>
          )}

          {/* Candidates Grid */}
          {!loading && filtered.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            >
              {filtered.map((candidate, i) => (
                <TalentCard
                  key={candidate.id}
                  candidate={candidate}
                  index={i}
                  onSelect={() => setSelectedCandidate(candidate)}
                  onEndorse={() => handleEndorse(candidate.id)}
                  endorsed={endorsed.has(candidate.id)}
                />
              ))}
            </motion.div>
          )}

          {/* Stats bar */}
          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-6 text-xs text-white/20"
            >
              <span>{filtered.length} candidates</span>
              <span>&middot;</span>
              <span>{endorsed.size} endorsed</span>
              <span>&middot;</span>
              <span>{new Set(filtered.map((c) => c.country)).size} countries</span>
            </motion.div>
          )}
        </div>

        {/* Candidate Drawer */}
        <AnimatePresence>
          {selectedCandidate && (
            <CandidateDrawer
              candidate={selectedCandidate}
              matchedJobs={matchedJobs}
              jobsLoading={jobsLoading}
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
