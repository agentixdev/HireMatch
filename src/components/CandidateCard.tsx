'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef } from 'react';

/* ─────────────────────── Types ─────────────────────── */

interface CandidateCardProps {
  candidate: {
    id: string;
    full_name: string;
    headline?: string;
    photo_url?: string;
    skills: string[];
    experience_years?: number;
    country: string;
    city?: string;
    is_public: boolean;
    visa_status?: string;
    match_score?: number;
    trending?: boolean;
    available_now?: boolean;
  };
  priority?: boolean;
}

/* ─────────────────── Role Badge (like PartyBadge) ─────────────────── */

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
    if (role.keywords.some((kw) => lower.includes(kw))) {
      return { abbr: role.abbr, bg: role.bg, text: role.text };
    }
  }
  // Fallback: first 3 chars uppercased
  const fallback = headline.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || '---';
  return { abbr: fallback, bg: 'bg-white/10', text: 'text-white/60' };
}

function RoleBadge({ headline }: { headline?: string }) {
  const { abbr, bg, text } = getRoleInfo(headline);
  return (
    <div className={`${bg} backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-white/10`}>
      <span className={`text-[10px] font-bold tracking-wider ${text}`}>{abbr}</span>
    </div>
  );
}

/* ─────────────────── Industry color for headline text ─────────────────── */

function getIndustryColor(headline?: string): string {
  if (!headline) return 'rgba(255,255,255,0.4)';
  const lower = headline.toLowerCase();
  // Tech = blue
  if (['software', 'developer', 'engineer', 'devops', 'sre', 'frontend', 'backend', 'fullstack'].some((k) => lower.includes(k)))
    return '#60a5fa';
  // Finance = green
  if (['finance', 'accounting', 'cfo', 'financial'].some((k) => lower.includes(k)))
    return '#34d399';
  // Healthcare = purple
  if (['health', 'medical', 'nurse', 'doctor', 'pharma', 'biotech'].some((k) => lower.includes(k)))
    return '#a78bfa';
  // Design = pink
  if (['designer', 'ux', 'ui', 'creative', 'graphic'].some((k) => lower.includes(k)))
    return '#f472b6';
  // Marketing = orange
  if (['marketing', 'growth', 'content', 'seo', 'brand'].some((k) => lower.includes(k)))
    return '#fb923c';
  return 'rgba(255,255,255,0.4)';
}

/* ─────────────────── Confetti Burst ─────────────────── */

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  // 12 tiny particles bursting outward
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rad = (angle * Math.PI) / 180;
    const dist = 18 + ((i * 7 + 3) % 12);
    const x = Math.cos(rad) * dist;
    const y = Math.sin(rad) * dist;
    const colors = ['#22c55e', '#4ade80', '#86efac', '#a3e635', '#34d399'];
    const color = colors[i % colors.length];
    return (
      <motion.span
        key={i}
        initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        animate={{ opacity: 0, x, y, scale: 0.3 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="absolute rounded-full"
        style={{
          width: 4,
          height: 4,
          backgroundColor: color,
          top: '50%',
          left: '50%',
          marginTop: -2,
          marginLeft: -2,
        }}
      />
    );
  });
  return <div className="absolute inset-0 pointer-events-none overflow-visible">{particles}</div>;
}

/* ─────────────────── Endorse Button (like VoteButton card) ─────────────────── */

function EndorseButton({ candidateId }: { candidateId: string }) {
  const [endorsed, setEndorsed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleEndorse = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (endorsed) {
        setEndorsed(false);
        console.log(`[HireMatch] Un-endorsed candidate ${candidateId}`);
        return;
      }
      setEndorsed(true);
      setShowConfetti(true);
      console.log(`[HireMatch] Endorsed candidate ${candidateId}`);
      // Clear confetti after animation
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowConfetti(false), 600);
    },
    [endorsed, candidateId]
  );

  return (
    <div className="relative">
      <motion.button
        onClick={handleEndorse}
        whileTap={{ scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer border ${
          endorsed
            ? 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]'
            : 'border-[#2a2f45] bg-transparent text-white hover:border-[#22c55e]/40 hover:bg-[#22c55e]/5'
        }`}
      >
        <AnimatePresence mode="wait">
          {endorsed ? (
            <motion.span
              key="endorsed"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              &#10003; Endorsed
            </motion.span>
          ) : (
            <motion.span
              key="endorse"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              &#128077; Endorse
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <ConfettiBurst active={showConfetti} />
    </div>
  );
}

/* ─────────────────── Initials fallback ─────────────────── */

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ─────────────────── Main Card ─────────────────── */

export default function CandidateCard({ candidate, priority }: CandidateCardProps) {
  const initials = getInitials(candidate.full_name);
  const hasPhoto = !!candidate.photo_url;
  const industryColor = getIndustryColor(candidate.headline);

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="overflow-hidden rounded-2xl bg-[#161929] border border-[#1e2235] group"
    >
      <Link href={`/candidates/${candidate.id}`} className="block">
        {/* Image area -- 3:4 portrait */}
        <div className="relative aspect-[3/4]">
          {hasPhoto ? (
            <Image
              src={candidate.photo_url!}
              alt={candidate.full_name}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
              className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
              {...(priority ? { priority: true, loading: 'eager' as const } : {})}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]">
              <span className="text-3xl font-bold text-white/20 select-none">{initials}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Role Badge -- top-left (like PartyBadge) */}
          <div className="absolute top-2 left-2">
            <RoleBadge headline={candidate.headline} />
          </div>

          {/* Hot Candidate / Trending -- top-right */}
          {candidate.trending && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm rounded-full px-1.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <span className="text-[10px] text-green-400 font-medium">Hot Candidate</span>
            </div>
          )}

          {/* Available Now -- bottom-left (like Recall badge but green) */}
          {candidate.available_now && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-500/25 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-green-500/40">
              <svg className="w-2.5 h-2.5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-[9px] text-green-300 font-bold uppercase tracking-wider">Available Now</span>
            </div>
          )}

          {/* Match score -- bottom-right */}
          {candidate.match_score != null && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[11px] font-bold text-green-400">{candidate.match_score}%</span>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-[14px] font-bold text-white truncate">{candidate.full_name}</p>
          {candidate.headline && (
            <p className="text-[12px] truncate" style={{ color: industryColor }}>
              {candidate.headline}
            </p>
          )}
          {/* Skills as small tags */}
          {candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {candidate.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full truncate max-w-[90px]"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills.length > 3 && (
                <span className="text-[10px] text-white/30">+{candidate.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Action buttons -- like WHB's Vote + Campaign HQ */}
      <div className="px-3 pb-2.5 flex flex-col gap-1.5">
        {/* Endorse button (like Vote) */}
        <EndorseButton candidateId={candidate.id} />

        {/* View Profile button with shimmer (like Campaign HQ) */}
        <Link href={`/candidates/${candidate.id}`}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="view-profile-btn relative w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer overflow-hidden bg-[#0d1117] border border-blue-500/30 text-blue-300/90 hover:scale-[1.03] hover:border-blue-400/50 hover:shadow-[0_0_12px_rgba(59,130,246,0.15)]"
          >
            {/* Shimmer overlay */}
            <span className="view-profile-shimmer absolute inset-0 pointer-events-none" />
            {/* Icon */}
            <svg
              className="w-3 h-3 relative z-10 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span className="relative z-10">View Profile &rarr;</span>
          </motion.button>
        </Link>
      </div>

      <style jsx>{`
        .view-profile-btn:hover .view-profile-shimmer {
          background: linear-gradient(
            120deg,
            transparent 0%,
            transparent 30%,
            rgba(59, 130, 246, 0.12) 45%,
            rgba(147, 197, 253, 0.18) 50%,
            rgba(59, 130, 246, 0.12) 55%,
            transparent 70%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: viewProfileShimmer 1.5s ease forwards;
        }
        @keyframes viewProfileShimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
      `}</style>
    </motion.div>
  );
}
