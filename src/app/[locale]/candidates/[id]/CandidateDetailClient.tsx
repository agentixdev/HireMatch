'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Candidate, WorkExperience, Education } from '@/types';

/* ═══════════════════════════════════════════════════════════════════
   Props
   ═══════════════════════════════════════════════════════════════════ */
interface Props {
  candidate: Candidate;
  relatedCandidates: Candidate[];
}

/* ═══════════════════════════════════════════════════════════════════
   Role Badge (like WHB PartyBadge)
   ═══════════════════════════════════════════════════════════════════ */
const ROLE_MAP: { keywords: string[]; abbr: string; bg: string; text: string }[] = [
  { keywords: ['software', 'developer', 'engineer', 'swe', 'frontend', 'backend', 'fullstack', 'full-stack', 'full stack', 'devops', 'sre'],
    abbr: 'SWE', bg: 'bg-blue-500/25', text: 'text-blue-300' },
  { keywords: ['product manager', 'product lead', 'product owner'],
    abbr: 'PM', bg: 'bg-purple-500/25', text: 'text-purple-300' },
  { keywords: ['data scientist', 'data science', 'machine learning', 'ml engineer', 'ai engineer', 'data analyst'],
    abbr: 'DS', bg: 'bg-green-500/25', text: 'text-green-300' },
  { keywords: ['designer', 'ux', 'ui', 'design', 'creative director', 'graphic'],
    abbr: 'UXD', bg: 'bg-pink-500/25', text: 'text-pink-300' },
  { keywords: ['marketing', 'growth', 'content', 'seo', 'brand'],
    abbr: 'MKT', bg: 'bg-orange-500/25', text: 'text-orange-300' },
  { keywords: ['finance', 'accounting', 'cfo', 'controller', 'financial'],
    abbr: 'FIN', bg: 'bg-emerald-500/25', text: 'text-emerald-300' },
  { keywords: ['sales', 'account executive', 'business development', 'bdr', 'sdr'],
    abbr: 'SAL', bg: 'bg-amber-500/25', text: 'text-amber-300' },
  { keywords: ['hr', 'human resources', 'people', 'talent', 'recruiter', 'recruiting'],
    abbr: 'HR', bg: 'bg-rose-500/25', text: 'text-rose-300' },
];

function getRoleInfo(headline?: string): { abbr: string; bg: string; text: string } {
  if (!headline) return { abbr: '---', bg: 'bg-white/10', text: 'text-white/60' };
  const lower = headline.toLowerCase();
  for (const role of ROLE_MAP) {
    if (role.keywords.some((kw) => lower.includes(kw))) return { abbr: role.abbr, bg: role.bg, text: role.text };
  }
  const fallback = headline.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '---';
  return { abbr: fallback, bg: 'bg-white/10', text: 'text-white/60' };
}

function RoleBadge({ headline, size = 'sm' }: { headline?: string; size?: 'sm' | 'lg' }) {
  const { abbr, bg, text } = getRoleInfo(headline);
  const cls = size === 'lg'
    ? `${bg} backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10`
    : `${bg} backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/10`;
  const txtCls = size === 'lg'
    ? `text-sm font-bold tracking-wider ${text}`
    : `text-[10px] font-bold tracking-wider ${text}`;
  return (
    <div className={cls}>
      <span className={txtCls}>{abbr}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Industry color for headline text
   ═══════════════════════════════════════════════════════════════════ */
function getIndustryColor(headline?: string): string {
  if (!headline) return 'rgba(255,255,255,0.4)';
  const lower = headline.toLowerCase();
  if (['software', 'developer', 'engineer', 'devops', 'sre', 'frontend', 'backend', 'fullstack'].some((k) => lower.includes(k)))
    return '#60a5fa';
  if (['finance', 'accounting', 'cfo', 'financial'].some((k) => lower.includes(k)))
    return '#34d399';
  if (['health', 'medical', 'nurse', 'doctor', 'pharma', 'biotech'].some((k) => lower.includes(k)))
    return '#a78bfa';
  if (['designer', 'ux', 'ui', 'creative', 'graphic'].some((k) => lower.includes(k)))
    return '#f472b6';
  if (['marketing', 'growth', 'content', 'seo', 'brand'].some((k) => lower.includes(k)))
    return '#fb923c';
  return 'rgba(255,255,255,0.4)';
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */
function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function sortedWorkHistory(work: WorkExperience[]): WorkExperience[] {
  return [...work].sort((a, b) => {
    const da = new Date(b.start_date).getTime();
    const db = new Date(a.start_date).getTime();
    return da - db;
  });
}

function formatDate(d?: string): string {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatVisaStatus(v?: string): string {
  if (!v) return 'Not specified';
  const map: Record<string, string> = {
    citizen: 'Citizen', permanent_resident: 'Permanent Resident',
    work_visa: 'Work Visa', needs_sponsorship: 'Needs Sponsorship',
  };
  return map[v] || v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRemote(r: string): string {
  const map: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site', any: 'Flexible' };
  return map[r] || r;
}

/* ═══════════════════════════════════════════════════════════════════
   Animations
   ═══════════════════════════════════════════════════════════════════ */
const spring = { type: 'spring' as const, stiffness: 300, damping: 25 };
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { ...spring } };
const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};

/* ═══════════════════════════════════════════════════════════════════
   Confetti Burst
   ═══════════════════════════════════════════════════════════════════ */
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * 360;
    const rad = (angle * Math.PI) / 180;
    const dist = 24 + ((i * 7 + 3) % 16);
    const x = Math.cos(rad) * dist;
    const y = Math.sin(rad) * dist;
    const colors = ['#22c55e', '#4ade80', '#86efac', '#a3e635', '#34d399', '#3b82f6'];
    return (
      <motion.span
        key={i}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{ opacity: 0, x, y, scale: 0.2 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="absolute rounded-full"
        style={{ width: 5, height: 5, backgroundColor: colors[i % colors.length], top: '50%', left: '50%', marginTop: -2.5, marginLeft: -2.5 }}
      />
    );
  });
  return <div className="absolute inset-0 pointer-events-none overflow-visible">{particles}</div>;
}

/* ═══════════════════════════════════════════════════════════════════
   Endorse Button — detail variant (full-width, larger)
   ═══════════════════════════════════════════════════════════════════ */
function EndorseButton({ candidateId, variant = 'card' }: { candidateId: string; variant?: 'card' | 'detail' }) {
  const [endorsed, setEndorsed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleEndorse = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (endorsed) { setEndorsed(false); return; }
      setEndorsed(true);
      setShowConfetti(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowConfetti(false), 700);
    },
    [endorsed],
  );

  const isDetail = variant === 'detail';

  return (
    <div className="relative">
      <motion.button
        onClick={handleEndorse}
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`w-full flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer border ${
          isDetail ? 'px-6 py-3.5 text-base' : 'px-2 py-1.5 text-[11px]'
        } ${
          endorsed
            ? 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]'
            : 'border-[#2a2f45] bg-transparent text-white hover:border-[#22c55e]/40 hover:bg-[#22c55e]/5'
        }`}
      >
        <AnimatePresence mode="wait">
          {endorsed ? (
            <motion.span key="ed" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
              &#10003; Endorsed
            </motion.span>
          ) : (
            <motion.span key="en" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>
              &#128077; Endorse
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <ConfettiBurst active={showConfetti} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StatCircle
   ═══════════════════════════════════════════════════════════════════ */
function StatCircle({ value, label, color, delay = 0 }: { value: number | string; label: string; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      className="flex flex-col items-center"
    >
      <div className={`w-20 h-20 rounded-full border-[3px] flex items-center justify-center ${color}`}>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <span className="text-xs text-white/50 mt-1.5 uppercase tracking-wider">{label}</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Share Menu
   ═══════════════════════════════════════════════════════════════════ */
function ShareMenu({ candidateName }: { candidateName: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Check out ${candidateName} on HireMatch`)}&body=${encodeURIComponent(`I found this great candidate on HireMatch: ${shareUrl}`)}`;

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0F172A] ring-1 ring-white/10 shadow-2xl p-2 z-50"
          >
            <button onClick={copyLink} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              LinkedIn
            </a>
            <a href={emailUrl} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Career Timeline (zigzag alternating layout like WHB)
   ═══════════════════════════════════════════════════════════════════ */
function CareerTimeline({ work }: { work: WorkExperience[] }) {
  const sorted = sortedWorkHistory(work);
  if (sorted.length === 0) return null;

  return (
    <div className="relative">
      {/* Vertical center line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 hidden lg:block" />
      <div className="space-y-4 lg:space-y-6">
        {sorted.map((job, i) => {
          const isLeft = i % 2 === 0;
          return (
            <motion.div
              key={`${job.company}-${job.start_date}-${i}`}
              initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: i * 0.08 }}
              className={`relative lg:w-[calc(50%-1.5rem)] ${isLeft ? 'lg:mr-auto lg:pr-6' : 'lg:ml-auto lg:pl-6'}`}
            >
              {/* Dot on timeline */}
              <div className="absolute top-5 hidden lg:block w-3 h-3 rounded-full bg-blue-500 ring-2 ring-[#0F172A]"
                style={isLeft ? { right: '-1.875rem' } : { left: '-1.875rem' }} />

              <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5 hover:ring-white/20 transition-all duration-300 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-[15px] group-hover:text-blue-400 transition-colors">{job.title}</h3>
                    <p className="text-[13px] text-white/60 mt-0.5">{job.company}</p>
                    <p className="text-[12px] text-white/40 mt-0.5">
                      {formatDate(job.start_date)} &mdash; {job.is_current ? 'Present' : formatDate(job.end_date)}
                    </p>
                  </div>
                  {job.is_current && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold uppercase">Current</span>
                  )}
                </div>
                {job.description && (
                  <p className="text-[13px] text-white/50 mt-2.5 leading-relaxed">{job.description}</p>
                )}
                {job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Education Cards
   ═══════════════════════════════════════════════════════════════════ */
function EducationCards({ education }: { education: Education[] }) {
  if (!education || education.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {education.map((edu, i) => (
        <motion.div
          key={`${edu.institution}-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: i * 0.08 }}
          className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-4 hover:ring-white/20 transition-all"
        >
          <h4 className="font-semibold text-white text-sm">{edu.institution}</h4>
          <p className="text-[13px] text-white/60 mt-0.5">{edu.degree} in {edu.field}</p>
          <p className="text-[12px] text-white/40 mt-0.5">
            {edu.start_year}{edu.end_year ? ` - ${edu.end_year}` : ' - Present'}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Skills Grid
   ═══════════════════════════════════════════════════════════════════ */
function SkillsGrid({ skills }: { skills: string[] }) {
  if (!skills || skills.length === 0) return null;
  return (
    <motion.div {...staggerContainer} className="flex flex-wrap gap-2">
      {skills.map((skill, i) => (
        <motion.span
          key={skill}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: i * 0.03 }}
          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all cursor-default"
        >
          {skill}
        </motion.span>
      ))}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Pill Tags (certifications & languages)
   ═══════════════════════════════════════════════════════════════════ */
function PillTags({ items, color }: { items: string[]; color: 'purple' | 'amber' }) {
  if (!items || items.length === 0) return null;
  const styles = color === 'purple'
    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`px-3 py-1 text-xs font-medium rounded-full border ${styles}`}>{item}</span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Related Candidate Mini-Card
   ═══════════════════════════════════════════════════════════════════ */
function RelatedCard({ c }: { c: Candidate }) {
  const hasPhoto = !!c.photo_url;
  const initials = getInitials(c.full_name);
  return (
    <Link href={`/candidates/${c.id}`} className="block group">
      <motion.div
        whileHover={{ y: -2, scale: 1.02 }}
        transition={spring}
        className="overflow-hidden rounded-xl bg-[#0F172A] ring-1 ring-white/10 hover:ring-white/20 transition-all"
      >
        <div className="relative aspect-[3/4]">
          {hasPhoto ? (
            <Image src={c.photo_url!} alt={c.full_name} fill sizes="180px" className="object-cover object-top group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
              <span className="text-2xl font-bold text-white/20 select-none">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-2 left-2"><RoleBadge headline={c.headline} /></div>
        </div>
        <div className="p-3">
          <p className="text-sm font-bold text-white truncate">{c.full_name}</p>
          {c.headline && <p className="text-xs text-white/50 truncate mt-0.5">{c.headline}</p>}
        </div>
      </motion.div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section Header
   ═══════════════════════════════════════════════════════════════════ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      {...fadeUp}
      className="text-lg font-bold text-white mb-4 flex items-center gap-2"
    >
      <div className="w-1 h-5 rounded-full bg-blue-500" />
      {children}
    </motion.h2>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function CandidateDetailClient({ candidate, relatedCandidates }: Props) {
  const c = candidate;
  const hasPhoto = !!c.photo_url;
  const initials = getInitials(c.full_name);
  const industryColor = getIndustryColor(c.headline);
  const sortedWork = sortedWorkHistory(c.work_history || []);

  /* ─────────────────── MOBILE LAYOUT ─────────────────── */
  const mobileLayout = (
    <div className="lg:hidden">
      {/* Hero — Full-width photo with gradient overlay */}
      <div className="relative w-full aspect-[3/4] max-h-[70vh]">
        {hasPhoto ? (
          <Image src={c.photo_url!} alt={c.full_name} fill priority sizes="100vw" className="object-cover object-top" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
            <span className="text-6xl font-bold text-white/15 select-none">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Role Badge — top-left */}
        <div className="absolute top-4 left-4">
          <RoleBadge headline={c.headline} size="lg" />
        </div>

        {/* Available Now — top-right */}
        {c.available_now && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm rounded-full px-2.5 py-1 border border-green-500/30">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            <span className="text-[10px] font-bold text-green-300 uppercase tracking-wider">Available Now</span>
          </div>
        )}

        {/* Name + headline over gradient */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <motion.h1 {...fadeUp} className="text-3xl font-extrabold text-white leading-tight">{c.full_name}</motion.h1>
          {c.headline && (
            <motion.p {...fadeUp} transition={{ ...spring, delay: 0.05 }} className="text-base mt-1 font-medium" style={{ color: industryColor }}>
              {c.headline}
            </motion.p>
          )}
          {c.city && (
            <motion.p {...fadeUp} transition={{ ...spring, delay: 0.1 }} className="text-sm text-white/40 mt-1">
              {c.city}, {c.country.toUpperCase()} &middot; {formatRemote(c.remote_preference)}
            </motion.p>
          )}
        </div>
      </div>

      {/* Content below hero */}
      <div className="px-5 py-6 space-y-8">
        {/* Stats */}
        <motion.div {...fadeUp} className="flex justify-center gap-8">
          <StatCircle value={c.experience_years} label="Years Exp." color="border-blue-500" delay={0} />
          <StatCircle value={c.skills?.length || 0} label="Skills" color="border-purple-500" delay={0.1} />
        </motion.div>

        {/* Skills */}
        {c.skills?.length > 0 && (
          <section>
            <SectionTitle>Skills</SectionTitle>
            <SkillsGrid skills={c.skills} />
          </section>
        )}

        {/* Bio */}
        {c.bio && (
          <section>
            <SectionTitle>About</SectionTitle>
            <motion.p {...fadeUp} className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{c.bio}</motion.p>
          </section>
        )}

        {/* Work History */}
        {sortedWork.length > 0 && (
          <section>
            <SectionTitle>Career Timeline</SectionTitle>
            <CareerTimeline work={sortedWork} />
          </section>
        )}

        {/* Education */}
        {c.education?.length > 0 && (
          <section>
            <SectionTitle>Education</SectionTitle>
            <EducationCards education={c.education} />
          </section>
        )}

        {/* Certifications */}
        {c.certifications?.length > 0 && (
          <section>
            <SectionTitle>Certifications</SectionTitle>
            <PillTags items={c.certifications} color="amber" />
          </section>
        )}

        {/* Languages */}
        {c.languages?.length > 0 && (
          <section>
            <SectionTitle>Languages</SectionTitle>
            <PillTags items={c.languages} color="purple" />
          </section>
        )}

        {/* Endorse + Share */}
        <div className="space-y-3">
          <EndorseButton candidateId={c.id} variant="detail" />
          <div className="flex justify-center">
            <ShareMenu candidateName={c.full_name} />
          </div>
        </div>

        {/* Related Candidates */}
        {relatedCandidates.length > 0 && (
          <section>
            <SectionTitle>Similar Candidates</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {relatedCandidates.map((rc) => <RelatedCard key={rc.id} c={rc} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  /* ─────────────────── DESKTOP LAYOUT ─────────────────── */
  const desktopLayout = (
    <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-10 gap-8">
      {/* LEFT SIDEBAR — sticky */}
      <div className="w-[380px] shrink-0">
        <div className="sticky top-24 space-y-5">
          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="relative aspect-[3/4] rounded-2xl overflow-hidden group ring-1 ring-white/10"
          >
            {hasPhoto ? (
              <Image src={c.photo_url!} alt={c.full_name} fill priority sizes="380px" className="object-cover object-top group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
                <span className="text-5xl font-bold text-white/15 select-none">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Role Badge overlay */}
            <div className="absolute top-3 left-3">
              <RoleBadge headline={c.headline} size="lg" />
            </div>

            {/* Available Now overlay */}
            {c.available_now && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/20 backdrop-blur-sm rounded-full px-2.5 py-1 border border-green-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <span className="text-[10px] font-bold text-green-300 uppercase tracking-wider">Available</span>
              </div>
            )}
          </motion.div>

          {/* By the Numbers */}
          <motion.div {...fadeUp} transition={{ ...spring, delay: 0.1 }} className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">By the Numbers</h3>
            <div className="flex justify-around">
              <StatCircle value={c.experience_years} label="Years Exp." color="border-blue-500" delay={0.15} />
              <StatCircle value={c.skills?.length || 0} label="Skills" color="border-purple-500" delay={0.2} />
              <StatCircle value={c.languages?.length || 0} label="Languages" color="border-amber-500" delay={0.25} />
            </div>
          </motion.div>

          {/* Quick Facts */}
          <motion.div {...fadeUp} transition={{ ...spring, delay: 0.15 }} className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Quick Facts</h3>
            <div className="space-y-2.5">
              {[
                { icon: '\u{1F4CD}', label: 'Location', value: c.city ? `${c.city}, ${c.country.toUpperCase()}` : c.country.toUpperCase() },
                { icon: '\u{1F3E0}', label: 'Work Style', value: formatRemote(c.remote_preference) },
                { icon: '\u{1F4CB}', label: 'Visa', value: formatVisaStatus(c.visa_status) },
                { icon: '\u{23F0}', label: 'Notice', value: c.notice_period || 'Not specified' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="text-base">{icon}</span>
                  <span className="text-white/40 w-20 shrink-0">{label}</span>
                  <span className="text-white/80 truncate">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Name + Headline */}
        <div>
          <motion.h1 {...fadeUp} className="text-4xl font-extrabold text-white leading-tight shimmer-text">{c.full_name}</motion.h1>
          {c.headline && (
            <motion.p {...fadeUp} transition={{ ...spring, delay: 0.05 }} className="text-lg mt-2 font-medium" style={{ color: industryColor }}>
              {c.headline}
            </motion.p>
          )}
        </div>

        {/* Bio */}
        {c.bio && (
          <section>
            <SectionTitle>About</SectionTitle>
            <motion.p {...fadeUp} className="text-[15px] text-white/60 leading-relaxed whitespace-pre-line">{c.bio}</motion.p>
          </section>
        )}

        {/* Skills */}
        {c.skills?.length > 0 && (
          <section>
            <SectionTitle>Skills</SectionTitle>
            <SkillsGrid skills={c.skills} />
          </section>
        )}

        {/* Work History */}
        {sortedWork.length > 0 && (
          <section>
            <SectionTitle>Career Timeline</SectionTitle>
            <CareerTimeline work={sortedWork} />
          </section>
        )}

        {/* Education */}
        {c.education?.length > 0 && (
          <section>
            <SectionTitle>Education</SectionTitle>
            <EducationCards education={c.education} />
          </section>
        )}

        {/* Certifications & Languages */}
        <div className="grid sm:grid-cols-2 gap-6">
          {c.certifications?.length > 0 && (
            <section>
              <SectionTitle>Certifications</SectionTitle>
              <PillTags items={c.certifications} color="amber" />
            </section>
          )}
          {c.languages?.length > 0 && (
            <section>
              <SectionTitle>Languages</SectionTitle>
              <PillTags items={c.languages} color="purple" />
            </section>
          )}
        </div>

        {/* Endorse + Share */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <EndorseButton candidateId={c.id} variant="detail" />
          </div>
          <ShareMenu candidateName={c.full_name} />
        </div>

        {/* Related Candidates */}
        {relatedCandidates.length > 0 && (
          <section>
            <SectionTitle>Similar Candidates</SectionTitle>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {relatedCandidates.map((rc) => <RelatedCard key={rc.id} c={rc} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen pb-20">
      {mobileLayout}
      {desktopLayout}

      <style jsx global>{`
        .shimmer-text {
          background: linear-gradient(
            120deg,
            #fff 0%,
            #fff 40%,
            rgba(96, 165, 250, 0.6) 50%,
            #fff 60%,
            #fff 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerText 3s ease-in-out infinite;
        }
        @keyframes shimmerText {
          0%, 100% { background-position: 200% center; }
          50% { background-position: -200% center; }
        }
      `}</style>
    </main>
  );
}
