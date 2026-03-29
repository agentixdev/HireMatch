'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase';
import {
  springSnappy,
  springBouncy,
  springSmooth,
  getTemperatureColors,
  staggerContainer,
  staggerItem,
  spotlightReveal,
  glowPulse,
} from '@/lib/wow';

// ── Types ──────────────────────────────────────────────────────

interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_logo_url?: string;
  company_website?: string;
  industry: string;
  company_size: string;
  country: string;
  city?: string;
  bio?: string;
  culture_tags: string[];
  tier: string;
  jobs_posted_count: number;
  created_at: string;
}

interface JobListing {
  id: string;
  title: string;
  work_mode: string;
  job_type: string;
  country: string;
  city?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  skills_required: string[];
  match_tags: string[];
  applications_count: number;
  created_at: string;
}

interface ShortlistedCandidate {
  id: string;
  full_name: string;
  headline?: string;
  photo_url?: string;
  skills: string[];
  experience_years: number;
  country: string;
  match_score: number;
  status: 'new' | 'contacted' | 'screening' | 'interview' | 'offered';
}

type PipelineStage = 'new' | 'contacted' | 'screening' | 'interview' | 'offered';

// ── Constants ──────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', nl: '🇳🇱',
  ch: '🇨🇭', be: '🇧🇪', at: '🇦🇹', pt: '🇵🇹', ie: '🇮🇪', se: '🇸🇪', dk: '🇩🇰', no: '🇳🇴',
  fi: '🇫🇮', pl: '🇵🇱', cz: '🇨🇿', ro: '🇷🇴', in: '🇮🇳', mx: '🇲🇽', br: '🇧🇷', ar: '🇦🇷',
  cn: '🇨🇳', jp: '🇯🇵', kr: '🇰🇷', vn: '🇻🇳', ph: '🇵🇭',
};

const SIZE_LABELS: Record<string, string> = {
  '1-10': 'Startup',
  '11-50': 'Small',
  '51-200': 'Medium',
  '201-500': 'Growing',
  '501-1000': 'Large',
  '1000+': 'Enterprise',
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10' },
  pro: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  enterprise: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  agency: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string; icon: string }[] = [
  { key: 'new', label: 'New', color: '#6b7280', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { key: 'contacted', label: 'Contacted', color: '#3b82f6', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { key: 'screening', label: 'Screening', color: '#a855f7', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'interview', label: 'Interview', color: '#f59e0b', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'offered', label: 'Offered', color: '#22c55e', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

// ── Industry color ─────────────────────────────────────────────

function getIndustryColor(industry: string): string {
  const lower = (industry || '').toLowerCase();
  if (['tech', 'software', 'saas', 'ai', 'developer'].some((k) => lower.includes(k))) return '#3b82f6';
  if (['finance', 'fintech', 'banking', 'investment'].some((k) => lower.includes(k))) return '#22c55e';
  if (['health', 'medical', 'biotech', 'pharma'].some((k) => lower.includes(k))) return '#a855f7';
  if (['design', 'creative', 'agency', 'media'].some((k) => lower.includes(k))) return '#ec4899';
  if (['e-commerce', 'retail', 'marketplace'].some((k) => lower.includes(k))) return '#f97316';
  if (['education', 'edtech', 'learning'].some((k) => lower.includes(k))) return '#06b6d4';
  return '#6b7280';
}

// ── Share Modal ────────────────────────────────────────────────

function ShareModal({ name, type, url, onClose }: { name: string; type: 'company' | 'job' | 'recruiter'; url: string; onClose: () => void }) {
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
        <h3 className="text-lg font-bold text-white mb-1">Promote {type === 'company' ? 'Company' : type === 'job' ? 'Job' : 'Profile'}</h3>
        <p className="text-sm text-white/40 mb-4">{name}</p>
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
          onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="w-full py-2.5 rounded-lg border border-white/10 text-white/70 text-sm hover:bg-white/5 cursor-pointer"
        >
          {copied ? '✓ Copied!' : 'Copy Link'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Pipeline Candidate Card ────────────────────────────────────

function PipelineCandidateCard({
  candidate,
  onAdvance,
  onContact,
}: {
  candidate: ShortlistedCandidate;
  onAdvance: () => void;
  onContact: () => void;
}) {
  const tempColors = getTemperatureColors(candidate.match_score);
  const stageInfo = PIPELINE_STAGES.find((s) => s.key === candidate.status) || PIPELINE_STAGES[0];
  const nextStage = PIPELINE_STAGES[PIPELINE_STAGES.findIndex((s) => s.key === candidate.status) + 1];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={springBouncy}
      className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[#0d1117]">
          {candidate.photo_url ? (
            <Image src={candidate.photo_url} alt={candidate.full_name} width={40} height={40} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-sm font-bold">
              {candidate.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{candidate.full_name}</p>
          <p className="text-[11px] text-white/40 truncate">{candidate.headline || 'Professional'}</p>
        </div>

        {/* Score */}
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
          style={{ backgroundColor: tempColors.bg, color: tempColors.primary }}
        >
          {candidate.match_score}%
        </div>

        {/* Stage badge */}
        <div
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
          style={{ backgroundColor: stageInfo.color + '15', color: stageInfo.color }}
        >
          {stageInfo.label}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2.5">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onContact}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
        >
          {candidate.status === 'new' ? 'Contact' : candidate.status === 'contacted' ? 'Pre-Screen' : candidate.status === 'screening' ? 'Schedule Interview' : 'Message'}
        </motion.button>
        {nextStage && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onAdvance}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer text-white"
            style={{ backgroundColor: nextStage.color + '30', color: nextStage.color }}
          >
            → {nextStage.label}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Company Detail Drawer ──────────────────────────────────────

function CompanyDrawer({
  company,
  jobs,
  jobsLoading,
  shortlisted,
  onClose,
  onPromote,
  onAdvanceCandidate,
  onContactCandidate,
}: {
  company: CompanyProfile;
  jobs: JobListing[];
  jobsLoading: boolean;
  shortlisted: ShortlistedCandidate[];
  onClose: () => void;
  onPromote: (type: 'company' | 'job', name: string) => void;
  onAdvanceCandidate: (id: string) => void;
  onContactCandidate: (id: string) => void;
}) {
  const industryColor = getIndustryColor(company.industry);
  const tierStyle = TIER_COLORS[company.tier] || TIER_COLORS.free;
  const [activeTab, setActiveTab] = useState<'jobs' | 'pipeline'>('jobs');

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
        className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-[#0d0f1a] border-l border-white/10 overflow-y-auto"
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/40 hover:text-white p-2 cursor-pointer">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Company Header */}
        <div className="relative p-6 pb-4" style={{ background: `linear-gradient(180deg, ${industryColor}12 0%, transparent 100%)` }}>
          <div className="flex items-start gap-4">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springBouncy}
              className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-[#161929] flex items-center justify-center"
            >
              {company.company_logo_url ? (
                <Image src={company.company_logo_url} alt={company.company_name} width={64} height={64} className="object-contain" />
              ) : (
                <span className="text-2xl font-bold" style={{ color: industryColor }}>
                  {company.company_name[0]}
                </span>
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white truncate">{company.company_name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
                  {company.tier.toUpperCase()}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: industryColor }}>{company.industry}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-white/30">
                <span>{COUNTRY_FLAGS[company.country] || ''} {company.country.toUpperCase()}</span>
                {company.city && <span>&middot; {company.city}</span>}
                <span>&middot; {SIZE_LABELS[company.company_size] || company.company_size}</span>
                <span>&middot; {company.jobs_posted_count} jobs posted</span>
              </div>
            </div>
          </div>

          {/* Culture tags */}
          {company.culture_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {company.culture_tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-white/[0.04] text-white/50 text-[11px] rounded-full border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bio */}
        {company.bio && (
          <div className="px-6 py-4 border-t border-white/5">
            <p className="text-sm text-white/50 leading-relaxed">{company.bio}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 border-t border-white/5">
          <div className="flex gap-6 mt-3">
            {(['jobs', 'pipeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium cursor-pointer transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-white border-blue-500'
                    : 'text-white/30 border-transparent hover:text-white/50'
                }`}
              >
                {tab === 'jobs' ? `Jobs (${jobs.length})` : `Pipeline (${shortlisted.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-4">
          <AnimatePresence mode="wait">
            {activeTab === 'jobs' && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {jobsLoading ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
                    />
                    Loading jobs...
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-sm text-white/20 py-4">No active jobs posted.</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job, i) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">{job.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/30">
                              <span>{job.work_mode}</span>
                              <span>&middot;</span>
                              <span>{job.job_type}</span>
                              <span>&middot;</span>
                              <span>{job.country.toUpperCase()}</span>
                            </div>
                            {job.skills_required.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {job.skills_required.slice(0, 4).map((s) => (
                                  <span key={s} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {job.salary_min && job.salary_max && (
                              <span className="text-[11px] text-green-400 font-medium">
                                {job.salary_currency || '$'}{Math.round(job.salary_min / 1000)}k-{Math.round(job.salary_max / 1000)}k
                              </span>
                            )}
                            <span className="text-[10px] text-white/20">{job.applications_count} applicants</span>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); onPromote('job', job.title); }}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border border-purple-500/20 text-purple-400 hover:bg-purple-500/5 transition-colors"
                            >
                              Promote
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'pipeline' && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Pipeline stages bar */}
                <div className="flex gap-1 mb-4 p-1 bg-white/[0.02] rounded-lg">
                  {PIPELINE_STAGES.map((stage) => {
                    const count = shortlisted.filter((c) => c.status === stage.key).length;
                    return (
                      <div
                        key={stage.key}
                        className="flex-1 text-center py-2 rounded-md"
                        style={{ backgroundColor: count > 0 ? stage.color + '10' : 'transparent' }}
                      >
                        <p className="text-xs font-bold" style={{ color: count > 0 ? stage.color : 'rgba(255,255,255,0.15)' }}>
                          {count}
                        </p>
                        <p className="text-[9px] text-white/20">{stage.label}</p>
                      </div>
                    );
                  })}
                </div>

                {shortlisted.length === 0 ? (
                  <p className="text-sm text-white/20 py-4">No shortlisted candidates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {shortlisted.map((candidate) => (
                      <PipelineCandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        onAdvance={() => onAdvanceCandidate(candidate.id)}
                        onContact={() => onContactCandidate(candidate.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Actions */}
        <div className="sticky bottom-0 px-6 py-4 bg-[#0d0f1a]/95 backdrop-blur-sm border-t border-white/5">
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPromote('company', company.company_name)}
              className="flex-1 py-3 rounded-xl border border-purple-500/30 text-purple-400 font-semibold text-sm cursor-pointer hover:bg-purple-500/5 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Promote Company
            </motion.button>
            {company.company_website && (
              <a href={company.company_website} target="_blank" rel="noopener noreferrer" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Visit Website →
                </motion.button>
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Company Card ───────────────────────────────────────────────

function CompanyCard({
  company,
  onSelect,
}: {
  company: CompanyProfile;
  onSelect: () => void;
}) {
  const industryColor = getIndustryColor(company.industry);
  const tierStyle = TIER_COLORS[company.tier] || TIER_COLORS.free;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={springSnappy}
      onClick={onSelect}
      className="group overflow-hidden rounded-2xl bg-[#161929] border border-[#1e2235] cursor-pointer hover:border-white/10 transition-colors"
    >
      {/* Header area */}
      <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${industryColor}20 0%, ${industryColor}05 100%)` }}>
        {/* Company logo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] shrink-0 flex items-center justify-center">
            {company.company_logo_url ? (
              <Image src={company.company_logo_url} alt={company.company_name} width={48} height={48} className="object-contain" />
            ) : (
              <span className="text-lg font-bold" style={{ color: industryColor }}>{company.company_name[0]}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-sm font-bold text-white truncate">{company.company_name}</p>
            <p className="text-[11px] truncate" style={{ color: industryColor }}>{company.industry}</p>
          </div>
        </div>

        {/* Tier badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${tierStyle.bg} ${tierStyle.text} border ${tierStyle.border}`}>
            {company.tier}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-white/30 mb-2">
          <span>{COUNTRY_FLAGS[company.country] || ''} {company.country.toUpperCase()}</span>
          {company.city && <><span>&middot;</span><span className="truncate">{company.city}</span></>}
          <span>&middot;</span>
          <span>{SIZE_LABELS[company.company_size] || company.company_size}</span>
        </div>

        {/* Culture tags */}
        {company.culture_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {company.culture_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-white/[0.04] text-white/40 text-[9px] rounded-full">{tag}</span>
            ))}
            {company.culture_tags.length > 3 && (
              <span className="text-[9px] text-white/15">+{company.culture_tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Jobs count */}
        <div className="flex items-center gap-1 text-[10px] text-white/20">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {company.jobs_posted_count} active jobs
        </div>
      </div>

      {/* Action */}
      <div className="px-3 pb-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-lg text-[11px] font-semibold cursor-pointer bg-[#0d1117] border border-white/[0.06] text-white/60 hover:border-blue-500/30 hover:text-blue-300 transition-all"
        >
          View Company →
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function CompaniesPage() {
  const supabase = createClient();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [companyJobs, setCompanyJobs] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [shortlisted, setShortlisted] = useState<ShortlistedCandidate[]>([]);
  const [shareModal, setShareModal] = useState<{ name: string; type: 'company' | 'job' | 'recruiter'; url: string } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Fetch companies
  useEffect(() => {
    async function fetchCompanies() {
      setLoading(true);
      const { data } = await supabase
        .from('recruiters')
        .select('id, user_id, company_name, company_logo_url, company_website, industry, company_size, country, city, bio, culture_tags, tier, jobs_posted_count, created_at')
        .order('jobs_posted_count', { ascending: false })
        .limit(60);
      setCompanies((data as CompanyProfile[]) || []);
      setLoading(false);
    }
    fetchCompanies();
  }, []);

  // Fetch jobs when company selected
  useEffect(() => {
    if (!selectedCompany) return;

    async function fetchJobs() {
      setJobsLoading(true);
      const { data } = await supabase
        .from('jobs')
        .select('id, title, work_mode, job_type, country, city, salary_min, salary_max, salary_currency, skills_required, match_tags, applications_count, created_at')
        .eq('recruiter_id', selectedCompany!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setCompanyJobs((data as JobListing[]) || []);
      setJobsLoading(false);

      // Fetch shortlisted candidates for this recruiter
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, full_name, headline, photo_url, skills, experience_years, country')
        .eq('is_public', true)
        .limit(10);

      // Simulate shortlist with match scores (in real app, this would come from applications table)
      if (candidates) {
        setShortlisted(
          candidates.slice(0, 5).map((c: Record<string, unknown>, i: number) => ({
            id: c.id as string,
            full_name: c.full_name as string,
            headline: c.headline as string | undefined,
            photo_url: c.photo_url as string | undefined,
            skills: (c.skills as string[]) || [],
            experience_years: (c.experience_years as number) || 0,
            country: c.country as string,
            match_score: Math.round(65 + Math.random() * 30),
            status: (['new', 'contacted', 'screening', 'interview', 'offered'] as PipelineStage[])[Math.min(i, 4)],
          }))
        );
      }
    }

    fetchJobs();
  }, [selectedCompany]);

  // Advance candidate in pipeline
  const handleAdvanceCandidate = useCallback((id: string) => {
    setShortlisted((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === c.status);
        const nextStage = PIPELINE_STAGES[currentIdx + 1];
        return nextStage ? { ...c, status: nextStage.key } : c;
      })
    );
  }, []);

  const handleContactCandidate = useCallback((id: string) => {
    // In real app, open contact modal / send message
    const candidate = shortlisted.find((c) => c.id === id);
    if (candidate) {
      alert(`Contact ${candidate.full_name}: In production, this would open a messaging interface.`);
    }
  }, [shortlisted]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = companies;
    if (filter !== 'all') {
      result = result.filter((c) => {
        if (filter === 'pro') return c.tier === 'pro';
        if (filter === 'enterprise') return c.tier === 'enterprise';
        if (filter === 'startup') return ['1-10', '11-50'].includes(c.company_size);
        if (filter === 'hiring') return c.jobs_posted_count > 0;
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.culture_tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [companies, filter, search]);

  const handlePromote = useCallback((type: 'company' | 'job', name: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    setShareModal({ name, type, url: `${base}/companies` });
  }, []);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'hiring', label: 'Actively Hiring' },
    { key: 'startup', label: 'Startups' },
    { key: 'pro', label: 'Pro' },
    { key: 'enterprise', label: 'Enterprise' },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0a0c15] relative">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-20 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
            animate={{
              background: [
                'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-40 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px]"
            animate={{
              background: [
                'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1
              className="text-[40px] sm:text-[56px] tracking-[2px] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 mb-3"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Top Companies Hiring
            </h1>
            <p className="text-white/40 text-sm max-w-lg mx-auto">
              Explore companies, their culture, open roles, and hiring pipelines.
              Promote your brand and connect with top talent.
            </p>
          </motion.div>

          {/* Search + Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center gap-3 mb-8"
          >
            <div className="relative flex-1 w-full sm:max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies, industries, culture..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filterOptions.map((f) => (
                <motion.button
                  key={f.key}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    filter === f.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                  }`}
                >
                  {f.label}
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
                className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
              />
            </div>
          )}

          {/* No results */}
          {!loading && filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="text-white/30 text-lg mb-2">No companies found</p>
              <p className="text-white/15 text-sm">Try adjusting your filters or search terms.</p>
            </motion.div>
          )}

          {/* Companies Grid */}
          {!loading && filtered.length > 0 && (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filtered.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onSelect={() => setSelectedCompany(company)}
                />
              ))}
            </motion.div>
          )}

          {/* Stats */}
          {!loading && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-6 text-xs text-white/20"
            >
              <span>{filtered.length} companies</span>
              <span>&middot;</span>
              <span>{filtered.reduce((acc, c) => acc + c.jobs_posted_count, 0)} total jobs</span>
              <span>&middot;</span>
              <span>{new Set(filtered.map((c) => c.country)).size} countries</span>
            </motion.div>
          )}
        </div>

        {/* Company Drawer */}
        <AnimatePresence>
          {selectedCompany && (
            <CompanyDrawer
              company={selectedCompany}
              jobs={companyJobs}
              jobsLoading={jobsLoading}
              shortlisted={shortlisted}
              onClose={() => { setSelectedCompany(null); setCompanyJobs([]); setShortlisted([]); }}
              onPromote={handlePromote}
              onAdvanceCandidate={handleAdvanceCandidate}
              onContactCandidate={handleContactCandidate}
            />
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {shareModal && (
            <ShareModal
              name={shareModal.name}
              type={shareModal.type}
              url={shareModal.url}
              onClose={() => setShareModal(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
