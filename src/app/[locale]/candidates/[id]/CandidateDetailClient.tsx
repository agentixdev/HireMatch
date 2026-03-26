"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from "framer-motion";
import type { Candidate, WorkExperience, Education } from "@/types";

// ── Skill category colors ──────────────────────────────────────────
const SKILL_CATEGORIES: Record<string, { bg: string; text: string; border: string }> = {
  tech: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  soft: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
  language: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  cert: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  default: { bg: "bg-white/5", text: "text-white/80", border: "border-white/10" },
};

const TECH_SKILLS = new Set([
  "javascript", "typescript", "react", "vue", "angular", "node", "nodejs", "python",
  "java", "c#", "c++", "go", "rust", "ruby", "php", "swift", "kotlin", "dart",
  "flutter", "react native", "next.js", "nextjs", "nuxt", "svelte", "tailwind",
  "css", "html", "sql", "nosql", "mongodb", "postgresql", "mysql", "redis",
  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ci/cd", "git",
  "graphql", "rest", "api", "microservices", "machine learning", "ml", "ai",
  "deep learning", "data science", "tensorflow", "pytorch", "figma", "sketch",
  "adobe xd", "ux", "ui", "devops", "linux", "agile", "scrum",
]);

const SOFT_SKILLS = new Set([
  "leadership", "communication", "teamwork", "problem solving", "critical thinking",
  "project management", "time management", "mentoring", "negotiation", "presentation",
  "collaboration", "adaptability", "creativity", "empathy", "decision making",
]);

const LANGUAGE_SKILLS = new Set([
  "english", "french", "spanish", "german", "mandarin", "chinese", "japanese",
  "korean", "portuguese", "italian", "arabic", "hindi", "dutch", "russian",
  "swedish", "danish", "norwegian", "finnish", "polish", "turkish",
]);

function classifySkill(skill: string): string {
  const lower = skill.toLowerCase();
  if (TECH_SKILLS.has(lower)) return "tech";
  if (SOFT_SKILLS.has(lower)) return "soft";
  if (LANGUAGE_SKILLS.has(lower)) return "language";
  // Check partial matches
  for (const t of TECH_SKILLS) {
    if (lower.includes(t) || t.includes(lower)) return "tech";
  }
  return "default";
}

function getSkillStyle(skill: string) {
  const cat = classifySkill(skill);
  return SKILL_CATEGORIES[cat] || SKILL_CATEGORIES.default;
}

// ── Role/Industry badge mapping ────────────────────────────────────
const ROLE_BADGES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  SWE: { bg: "bg-blue-600/30", border: "border-blue-500/50", text: "text-blue-300", label: "SOFTWARE ENGINEER" },
  PM: { bg: "bg-purple-600/30", border: "border-purple-500/50", text: "text-purple-300", label: "PRODUCT MANAGER" },
  DS: { bg: "bg-emerald-600/30", border: "border-emerald-500/50", text: "text-emerald-300", label: "DATA SCIENCE" },
  UXD: { bg: "bg-pink-600/30", border: "border-pink-500/50", text: "text-pink-300", label: "UX DESIGN" },
  DevOps: { bg: "bg-orange-600/30", border: "border-orange-500/50", text: "text-orange-300", label: "DEVOPS" },
  QA: { bg: "bg-yellow-600/30", border: "border-yellow-500/50", text: "text-yellow-300", label: "QA ENGINEER" },
  ML: { bg: "bg-teal-600/30", border: "border-teal-500/50", text: "text-teal-300", label: "ML ENGINEER" },
  FE: { bg: "bg-cyan-600/30", border: "border-cyan-500/50", text: "text-cyan-300", label: "FRONTEND" },
  BE: { bg: "bg-indigo-600/30", border: "border-indigo-500/50", text: "text-indigo-300", label: "BACKEND" },
  FS: { bg: "bg-violet-600/30", border: "border-violet-500/50", text: "text-violet-300", label: "FULL STACK" },
  default: { bg: "bg-slate-600/30", border: "border-slate-500/50", text: "text-slate-300", label: "PROFESSIONAL" },
};

function detectRole(headline?: string, skills?: string[]): string {
  const text = `${headline || ""} ${(skills || []).join(" ")}`.toLowerCase();
  if (/\b(machine learning|ml engineer|deep learning|ai engineer)\b/.test(text)) return "ML";
  if (/\b(data scien|data analy)\b/.test(text)) return "DS";
  if (/\b(ux|user experience|ui\/ux|product design)\b/.test(text)) return "UXD";
  if (/\b(product manager|product owner|pm)\b/.test(text)) return "PM";
  if (/\b(devops|sre|infrastructure|platform engineer)\b/.test(text)) return "DevOps";
  if (/\b(qa|quality assurance|test engineer|sdet)\b/.test(text)) return "QA";
  if (/\b(full.?stack|fullstack)\b/.test(text)) return "FS";
  if (/\b(frontend|front.?end|react|vue|angular)\b/.test(text)) return "FE";
  if (/\b(backend|back.?end|api|server|node|django|spring)\b/.test(text)) return "BE";
  if (/\b(software|engineer|developer|programmer|coder)\b/.test(text)) return "SWE";
  return "default";
}

// ── Industry color for gradients ───────────────────────────────────
function getIndustryColor(roleKey: string): string {
  const map: Record<string, string> = {
    SWE: "#3B82F6", PM: "#A855F7", DS: "#10B981", UXD: "#EC4899",
    DevOps: "#F97316", QA: "#EAB308", ML: "#14B8A6", FE: "#06B6D4",
    BE: "#6366F1", FS: "#8B5CF6", default: "#64748B",
  };
  return map[roleKey] || map.default;
}

// ── Score color helpers ────────────────────────────────────────────
function getScoreColors(value: number) {
  if (value >= 70) return { border: "border-green-500", bg: "bg-green-500/20", text: "text-green-400" };
  if (value >= 40) return { border: "border-yellow-500", bg: "bg-yellow-500/20", text: "text-yellow-400" };
  return { border: "border-red-500", bg: "bg-red-500/20", text: "text-red-400" };
}

// ── Animation variants ─────────────────────────────────────────────
const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const springTransition = { type: "spring" as const, stiffness: 300, damping: 25 };

// ── Animated Count-Up Number ───────────────────────────────────────
function AnimatedNumber({ value, suffix = "", className }: { value: number; suffix?: string; className?: string }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) spring.set(safeValue);
  }, [isInView, safeValue, spring]);

  useEffect(() => {
    const unsub = spring.on("change", (v: number) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}

// ── Available Now Ping Badge ───────────────────────────────────────
function AvailablePing() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
      </span>
      <span className="text-[10px] font-bold text-green-300 uppercase tracking-wide">Available Now</span>
    </div>
  );
}

// ── Stat Circle with staggered entrance ────────────────────────────
function StatCircle({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay, ...springTransition }}
      className="flex flex-col items-center"
    >
      {children}
    </motion.div>
  );
}

// ── Experience Card — slides in from alternating sides ─────────────
function ExperienceCard({ job, index }: { job: WorkExperience; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });
  const fromLeft = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: fromLeft ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: fromLeft ? -30 : 30 }}
      transition={{ duration: 0.5, delay: index * 0.08, ...springTransition }}
      className="bg-white/[0.03] ring-1 ring-white/[0.08] rounded-2xl p-5 hover:ring-white/[0.14] transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-[15px]">{job.title}</h3>
          <p className="text-[13px] text-white/60 mt-0.5">{job.company}</p>
          <p className="text-[12px] text-white/40 mt-0.5">
            {job.start_date} — {job.is_current ? "Present" : job.end_date || "N/A"}
          </p>
        </div>
        {job.is_current && (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold uppercase">
            Current
          </span>
        )}
      </div>
      {job.description && (
        <p className="mt-3 text-[13px] leading-relaxed text-white/60">{job.description}</p>
      )}
      {job.skills && job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.map((s) => (
            <span key={s} className="px-2 py-0.5 bg-white/5 text-white/60 text-[11px] rounded-full border border-white/[0.06]">
              {s}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Education Card ─────────────────────────────────────────────────
function EducationEntry({ edu, index }: { edu: Education; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.4, delay: index * 0.1, ...springTransition }}
      className="border-l-2 border-purple-500/30 pl-5"
    >
      <h3 className="font-semibold text-white text-[14px]">
        {edu.degree}{edu.field ? ` in ${edu.field}` : ""}
      </h3>
      <p className="text-[13px] text-white/60">{edu.institution}</p>
      <p className="text-[12px] text-white/40">
        {edu.start_year} — {edu.end_year || "Present"}
      </p>
    </motion.div>
  );
}

// ── Confetti burst ─────────────────────────────────────────────────
function createConfetti(container: HTMLElement) {
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: absolute; width: 6px; height: 6px; border-radius: 50%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: 50%; top: 50%; pointer-events: none; z-index: 50;
    `;
    container.appendChild(particle);
    const angle = Math.random() * Math.PI * 2;
    const velocity = 80 + Math.random() * 120;
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity - 40;
    particle.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: "1" },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: "0" },
      ],
      { duration: 600 + Math.random() * 400, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" }
    );
    setTimeout(() => particle.remove(), 1100);
  }
}

// ── Career Timeline Node ───────────────────────────────────────────
function TimelineNode({
  item,
  index,
  industryColor,
  isDesktop,
}: {
  item: WorkExperience;
  index: number;
  industryColor: string;
  isDesktop: boolean;
}) {
  const isMajor = item.is_current || index === 0;
  const isAbove = isDesktop && index % 2 === 0;

  const content = (
    <>
      <span className={`font-bold ${isMajor ? "text-[12px]" : "text-[11px]"}`} style={{ color: industryColor }}>
        {item.start_date}
      </span>
      <span className={`leading-tight ${isMajor ? "text-[12px] font-semibold text-white/70" : "text-[11px] text-white/50"} max-w-[110px]`}>
        {item.title}
      </span>
      <span className="text-[10px] text-white/40">{item.company}</span>
    </>
  );

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      className={`flex flex-col items-center text-center px-2.5 ${isDesktop ? (isAbove ? "flex-col" : "flex-col-reverse") : ""}`}
      style={{ minWidth: isMajor ? "130px" : "110px" }}
    >
      {isDesktop && isAbove && <div className="mb-2 flex flex-col items-center">{content}</div>}
      {isMajor ? (
        <div
          className="relative z-10 h-[24px] w-[24px] rounded-full border-[3px] border-neutral-900 flex items-center justify-center shadow-lg"
          style={{ backgroundColor: industryColor, boxShadow: `0 0 0 3px ${industryColor}40` }}
        >
          <div className="h-[8px] w-[8px] rounded-full bg-white" />
        </div>
      ) : (
        <div
          className="relative z-10 h-[18px] w-[18px] rounded-full border-2 border-neutral-900 flex items-center justify-center mt-[3px]"
          style={{ backgroundColor: `${industryColor}80`, boxShadow: `0 0 0 2px ${industryColor}30` }}
        >
          <div className="h-[6px] w-[6px] rounded-full bg-white/80" />
        </div>
      )}
      {(!isDesktop || !isAbove) && <div className="mt-2 flex flex-col items-center">{content}</div>}
      {isDesktop && !isAbove && <div className="mt-2 flex flex-col items-center">{content}</div>}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ════════════════════════════════════════════════════════════════════

interface CandidateDetailClientProps {
  candidate: Candidate;
  relatedCandidates: Candidate[];
}

export default function CandidateDetailClient({ candidate, relatedCandidates }: CandidateDetailClientProps) {
  const [endorsed, setEndorsed] = useState(false);
  const [endorseCount, setEndorseCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const endorseRef = useRef<HTMLButtonElement>(null);

  const roleKey = detectRole(candidate.headline, candidate.skills);
  const roleBadge = ROLE_BADGES[roleKey] || ROLE_BADGES.default;
  const industryColor = getIndustryColor(roleKey);

  // Simulated match score (would come from match API in production)
  const matchScore = 78;
  const matchColors = getScoreColors(matchScore);
  const expColors = getScoreColors(Math.min(candidate.experience_years * 10, 100));
  const skillsCount = candidate.skills?.length || 0;
  const skillsColors = getScoreColors(Math.min(skillsCount * 5, 100));

  // Hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const heroParallaxY = useTransform(heroScrollProgress, [0, 1], ["-5%", "5%"]);

  // Endorse handler with confetti
  const handleEndorse = useCallback(() => {
    if (endorsed) return;
    setEndorsed(true);
    setEndorseCount((c) => c + 1);
    if (endorseRef.current) {
      createConfetti(endorseRef.current);
    }
  }, [endorsed]);

  // Share handlers
  const candidateUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${candidate.full_name}${candidate.headline ? ` — ${candidate.headline}` : ""}\n\nCheck out this candidate on HireMatch!`;

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [candidateUrl]);

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(candidateUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(candidateUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Check out ${candidate.full_name} on HireMatch`)}&body=${encodeURIComponent(`${shareText}\n\n${candidateUrl}`)}`;

  const workHistory = Array.isArray(candidate.work_history) ? candidate.work_history : [];
  const education = Array.isArray(candidate.education) ? candidate.education : [];

  return (
    <main
      className="min-h-screen bg-neutral-900"
      style={{ "--industry-color": industryColor, "--industry-glow": `${industryColor}40` } as React.CSSProperties}
    >
      {/* Shimmer + glow CSS */}
      <style>{`
        @keyframes name-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .candidate-name-shimmer {
          background: linear-gradient(
            90deg,
            #fff 0%, #fff 40%,
            var(--industry-color) 50%,
            #fff 60%, #fff 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: name-shimmer 4s ease-in-out infinite;
        }
        .cta-shimmer {
          position: relative;
          overflow: hidden;
        }
        .cta-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: cta-sweep 3s ease-in-out infinite;
        }
        @keyframes cta-sweep {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>

      {/* ── MOBILE LAYOUT ───────────────────────────────────────── */}
      <div className="lg:hidden">
        {/* Hero Image — 3:4 parallax with gradient overlay */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative h-[55vh] w-full overflow-hidden"
        >
          <motion.div className="absolute inset-0" style={{ y: heroParallaxY }}>
            {candidate.photo_url ? (
              <Image
                src={candidate.photo_url}
                alt={candidate.full_name}
                fill
                className="object-cover object-top scale-110"
                sizes="(max-width: 480px) 100vw, 480px"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center">
                <span className="text-8xl font-bold text-white/20">{candidate.full_name.charAt(0)}</span>
              </div>
            )}
          </motion.div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />
          <div
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
            style={{ background: `linear-gradient(to top, ${industryColor}18, transparent)` }}
          />

          {/* Role badge — top left */}
          <div className="absolute top-3 left-4">
            <span className={`px-2.5 py-1 rounded-full ${roleBadge.bg} border ${roleBadge.border} ${roleBadge.text} text-[10px] font-bold uppercase tracking-wide`}>
              {roleBadge.label}
            </span>
          </div>

          {/* Available Now — top right */}
          {candidate.available_now && (
            <div className="absolute top-3 right-4">
              <AvailablePing />
            </div>
          )}

          {/* Name overlay — bottom with shimmer */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-[28px] font-bold tracking-tight leading-tight candidate-name-shimmer"
            >
              {candidate.full_name}
            </motion.h1>
            {candidate.headline && (
              <p className="text-[13px] text-white/60 mt-1">{candidate.headline}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-[12px] text-white/50 flex-wrap">
              {candidate.city && <span>{candidate.city}</span>}
              <span>{candidate.country?.toUpperCase()}</span>
              <span className="capitalize">{candidate.remote_preference}</span>
            </div>
          </div>
        </motion.div>

        {/* Info Section */}
        <motion.div
          className="px-5 pt-5 pb-8"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Stats Circles */}
          <motion.div variants={fadeOnly} className="flex items-center justify-around mb-6">
            <StatCircle delay={0}>
              <div className={`h-16 w-16 rounded-full border-2 ${matchColors.border} flex items-center justify-center ${matchColors.bg}`}>
                <AnimatedNumber value={matchScore} suffix="%" className={`text-lg font-bold ${matchColors.text}`} />
              </div>
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Match</span>
            </StatCircle>
            <StatCircle delay={0.1}>
              <div className={`h-16 w-16 rounded-full border-2 ${expColors.border} flex items-center justify-center ${expColors.bg}`}>
                <AnimatedNumber value={candidate.experience_years} className={`text-lg font-bold ${expColors.text}`} />
              </div>
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Years</span>
            </StatCircle>
            <StatCircle delay={0.2}>
              <div className={`h-16 w-16 rounded-full border-2 ${skillsColors.border} flex items-center justify-center ${skillsColors.bg}`}>
                <AnimatedNumber value={skillsCount} className={`text-lg font-bold ${skillsColors.text}`} />
              </div>
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Skills</span>
            </StatCircle>
            <StatCircle delay={0.3}>
              <div className="h-16 w-16 rounded-full border-2 border-amber-500 flex items-center justify-center bg-amber-500/20">
                <AnimatedNumber value={endorseCount} className="text-lg font-bold text-amber-400" />
              </div>
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Endorsed</span>
            </StatCircle>
          </motion.div>

          {/* Professional Summary */}
          {candidate.bio && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-2">Professional Summary</p>
              <p className="text-[15px] leading-relaxed text-white/70 font-light">{candidate.bio}</p>
            </motion.div>
          )}

          {/* Skills Section */}
          {candidate.skills && candidate.skills.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Skills & Expertise</p>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, i) => {
                  const style = getSkillStyle(skill);
                  return (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, ...springTransition }}
                      whileTap={{ scale: 1.1 }}
                      className={`px-3 py-1.5 rounded-xl ${style.bg} border ${style.border} ${style.text} text-[12px] font-medium cursor-default`}
                    >
                      {skill}
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Experience Cards */}
          {workHistory.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Work Experience</p>
              <div className="space-y-3">
                {workHistory.map((job, i) => (
                  <ExperienceCard key={`${job.company}-${i}`} job={job} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Education</p>
              <div className="space-y-4">
                {education.map((edu, i) => (
                  <EducationEntry key={`${edu.institution}-${i}`} edu={edu} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Languages & Certifications */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {candidate.languages && candidate.languages.length > 0 && (
              <motion.div variants={fadeOnly} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-2">Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {candidate.languages.map((lang) => (
                    <span key={lang} className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[11px] border border-purple-500/20">
                      {lang}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            {candidate.certifications && candidate.certifications.length > 0 && (
              <motion.div variants={fadeOnly} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-4">
                <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-2">Certifications</p>
                <ul className="space-y-1">
                  {candidate.certifications.map((cert) => (
                    <li key={cert} className="text-[11px] text-white/70 flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">&#10003;</span> {cert}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Career Timeline — Mobile horizontal scroll */}
          {workHistory.length > 0 && (
            <motion.div variants={fadeOnly} className="mb-6">
              <p className="text-[10px] uppercase font-bold text-white/50 tracking-[2px] mb-4 text-center">Career Timeline</p>
              <div className="overflow-x-auto pb-2 -mx-5 px-5">
                <div className="relative min-w-max">
                  <div
                    className="absolute top-[12px] left-4 right-4 h-[2px]"
                    style={{ background: `linear-gradient(to right, ${industryColor}60, ${industryColor}30, ${industryColor}60)` }}
                  />
                  <motion.div
                    className="flex gap-0"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
                    initial="hidden"
                    animate="show"
                  >
                    {workHistory.map((item, i) => (
                      <TimelineNode key={i} item={item} index={i} industryColor={industryColor} isDesktop={false} />
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Endorse Button */}
          <motion.div variants={fadeOnly} className="mb-4">
            <button
              ref={endorseRef}
              onClick={handleEndorse}
              disabled={endorsed}
              className="relative w-full py-3.5 rounded-2xl font-bold text-white text-[15px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 cursor-pointer disabled:opacity-60 overflow-hidden"
            >
              <motion.span
                animate={endorsed ? { scale: [1, 1.2, 1] } : {}}
                transition={springTransition}
              >
                {endorsed ? "Endorsed!" : "Endorse This Candidate"}
              </motion.span>
            </button>
          </motion.div>

          {/* Share Menu */}
          <motion.div variants={fadeOnly} className="relative mb-6">
            <button
              onClick={() => setShareOpen(!shareOpen)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              <span className="text-[12px] font-medium text-white/45">Share Profile</span>
            </button>
            <AnimatePresence>
              {shareOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 rounded-xl p-1.5 ring-1 ring-white/10 z-50"
                  style={{ background: "rgba(23,23,23,0.95)", backdropFilter: "blur(20px)" }}
                >
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="text-sky-400 text-sm">&#120143;</span>
                    <span className="text-[12px] text-white/70">Post on X</span>
                  </a>
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="text-blue-400 text-sm">in</span>
                    <span className="text-[12px] text-white/70">LinkedIn</span>
                  </a>
                  <a href={emailUrl} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <span className="text-amber-400 text-sm">@</span>
                    <span className="text-[12px] text-white/70">Email</span>
                  </a>
                  <div className="h-px bg-white/5 mx-2 my-1" />
                  <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="text-white/50 text-sm">{copied ? "✓" : "⧉"}</span>
                    <span className="text-[12px] text-white/70">{copied ? "Copied!" : "Copy Link"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* View Profile / Contact CTA with shimmer */}
          {candidate.cv_url && (
            <motion.div variants={fadeOnly} className="mb-6">
              <a
                href={candidate.cv_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-shimmer block w-full py-3 rounded-2xl text-center font-semibold text-white text-[14px] bg-gradient-to-r from-blue-600/80 to-indigo-600/80 ring-1 ring-white/10 hover:ring-white/20 transition-all"
              >
                View Full CV / Resume
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── DESKTOP LAYOUT ──────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="px-6 pb-12 pt-6 flex gap-8 items-start max-w-7xl mx-auto">
          {/* ── Left Sidebar — sticky photo + stats ─── */}
          <div className="w-[380px] flex-shrink-0 sticky top-[100px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Photo Card */}
              <div className="rounded-3xl overflow-hidden ring-1 ring-white/10 relative group">
                <div className="relative aspect-[3/4]">
                  {candidate.photo_url ? (
                    <Image
                      src={candidate.photo_url}
                      alt={candidate.full_name}
                      fill
                      className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-500"
                      sizes="380px"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center">
                      <span className="text-9xl font-bold text-white/10">{candidate.full_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div
                    className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
                    style={{ background: `linear-gradient(to top, ${industryColor}20, transparent)` }}
                  />

                  {/* Role badge — top left */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full ${roleBadge.bg} border ${roleBadge.border} ${roleBadge.text} text-[10px] font-bold uppercase tracking-wide`}>
                      {roleBadge.label}
                    </span>
                  </div>

                  {/* Available Now — top right */}
                  {candidate.available_now && (
                    <div className="absolute top-4 right-4">
                      <AvailablePing />
                    </div>
                  )}

                  {/* Bottom overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 text-[12px] text-white/60 flex-wrap">
                      {candidate.city && <span>{candidate.city}</span>}
                      <span>{candidate.country?.toUpperCase()}</span>
                      <span className="capitalize">{candidate.remote_preference}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* By the Numbers — stat circles */}
              <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5">
                <p className="text-[10px] uppercase font-bold text-white/50 tracking-[2px] mb-4">By the Numbers</p>
                <div className="flex items-center justify-around">
                  <StatCircle delay={0}>
                    <div className={`h-16 w-16 rounded-full border-2 ${matchColors.border} flex items-center justify-center ${matchColors.bg}`}>
                      <AnimatedNumber value={matchScore} suffix="%" className={`text-lg font-bold ${matchColors.text}`} />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Match</span>
                  </StatCircle>
                  <StatCircle delay={0.1}>
                    <div className={`h-16 w-16 rounded-full border-2 ${expColors.border} flex items-center justify-center ${expColors.bg}`}>
                      <AnimatedNumber value={candidate.experience_years} className={`text-lg font-bold ${expColors.text}`} />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Years Exp</span>
                  </StatCircle>
                  <StatCircle delay={0.2}>
                    <div className={`h-16 w-16 rounded-full border-2 ${skillsColors.border} flex items-center justify-center ${skillsColors.bg}`}>
                      <AnimatedNumber value={skillsCount} className={`text-lg font-bold ${skillsColors.text}`} />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1.5">Skills</span>
                  </StatCircle>
                </div>
              </div>

              {/* Quick Facts */}
              <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5">
                <p className="text-[10px] uppercase font-bold text-white/50 tracking-[2px] mb-3">Quick Facts</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/60">Location</span>
                    <span className="text-[12px] font-semibold text-white/70">{candidate.city || candidate.country?.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/60">Work Mode</span>
                    <span className="text-[12px] font-semibold text-white/70 capitalize">{candidate.remote_preference}</span>
                  </div>
                  {candidate.visa_status && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/60">Visa Status</span>
                      <span className="text-[12px] font-semibold text-white/70 capitalize">{candidate.visa_status.replace(/_/g, " ")}</span>
                    </div>
                  )}
                  {candidate.notice_period && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/60">Notice Period</span>
                      <span className="text-[12px] font-semibold text-white/70 capitalize">{candidate.notice_period}</span>
                    </div>
                  )}
                  {candidate.open_to_relocation && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/60">Relocation</span>
                      <span className="text-[12px] font-semibold text-green-400">Open to relocate</span>
                    </div>
                  )}
                  {candidate.salary_expectation_min && candidate.salary_expectation_max && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/60">Salary Range</span>
                      <span className="text-[12px] font-semibold text-white/70">
                        {candidate.salary_currency || "$"}{candidate.salary_expectation_min.toLocaleString()} — {candidate.salary_currency || "$"}{candidate.salary_expectation_max.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CV Download CTA with shimmer */}
              {candidate.cv_url && (
                <a
                  href={candidate.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-shimmer block w-full py-3 rounded-2xl text-center font-semibold text-white text-[14px] bg-gradient-to-r from-blue-600/80 to-indigo-600/80 ring-1 ring-white/10 hover:ring-white/20 transition-all"
                >
                  View Full CV / Resume
                </a>
              )}
            </motion.div>
          </div>

          {/* ── Right — Main Content ──────────────────────── */}
          <motion.div
            className="flex-1 min-w-0 pt-2"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {/* Name — shimmer */}
            <motion.h1
              variants={fadeOnly}
              className="text-[42px] font-bold tracking-tight leading-tight candidate-name-shimmer"
            >
              {candidate.full_name}
            </motion.h1>
            {candidate.headline && (
              <motion.p variants={fadeOnly} className="text-[16px] text-white/50 mt-1">
                {candidate.headline}
              </motion.p>
            )}

            <motion.div variants={fadeOnly} className="h-px bg-white/5 my-6" />

            {/* Professional Summary */}
            {candidate.bio && (
              <motion.div variants={fadeOnly} className="mb-6">
                <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-2">Professional Summary</p>
                <p className="text-[15px] leading-relaxed text-white/60 max-w-[600px]">{candidate.bio}</p>
              </motion.div>
            )}

            {/* Skills Section */}
            {candidate.skills && candidate.skills.length > 0 && (
              <motion.div variants={fadeOnly} className="mb-6">
                <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Skills & Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill, i) => {
                    const style = getSkillStyle(skill);
                    return (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03, ...springTransition }}
                        whileHover={{ scale: 1.08, transition: { duration: 0.15 } }}
                        className={`px-3.5 py-1.5 rounded-xl ${style.bg} border ${style.border} ${style.text} text-[13px] font-medium cursor-default`}
                      >
                        {skill}
                      </motion.span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Experience Cards — alternating slide-in */}
            {workHistory.length > 0 && (
              <motion.div variants={fadeOnly} className="mb-6">
                <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Work Experience</p>
                <div className="space-y-3">
                  {workHistory.map((job, i) => (
                    <ExperienceCard key={`${job.company}-${i}`} job={job} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <motion.div variants={fadeOnly} className="mb-6">
                <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-3">Education</p>
                <div className="space-y-4">
                  {education.map((edu, i) => (
                    <EducationEntry key={`${edu.institution}-${i}`} edu={edu} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Languages & Certifications */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {candidate.languages && candidate.languages.length > 0 && (
                <motion.div variants={fadeOnly} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-5">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-3">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.languages.map((lang) => (
                      <span key={lang} className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[12px] border border-purple-500/20">
                        {lang}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <motion.div variants={fadeOnly} className="bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-5">
                  <p className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-3">Certifications</p>
                  <ul className="space-y-1.5">
                    {candidate.certifications.map((cert) => (
                      <li key={cert} className="text-[12px] text-white/70 flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5">&#10003;</span> {cert}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Career Timeline — Desktop zigzag */}
            {workHistory.length > 1 && (
              <motion.div variants={fadeOnly} className="mb-8">
                <p className="text-[10px] uppercase font-bold text-white/50 tracking-[2px] mb-6 text-center">Career Timeline</p>
                <div className="relative">
                  <div
                    className="absolute top-1/2 left-4 right-4 h-[2px] -translate-y-1/2"
                    style={{ background: `linear-gradient(to right, ${industryColor}60, ${industryColor}30, ${industryColor}60)` }}
                  />
                  <motion.div
                    className="flex justify-around items-center"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
                    initial="hidden"
                    animate="show"
                  >
                    {workHistory.map((item, i) => (
                      <TimelineNode key={i} item={item} index={i} industryColor={industryColor} isDesktop />
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Endorse Button — desktop */}
            <motion.div variants={fadeOnly} className="mb-4">
              <button
                ref={endorsed ? undefined : endorseRef}
                onClick={handleEndorse}
                disabled={endorsed}
                className="relative w-full py-4 rounded-2xl font-bold text-white text-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 cursor-pointer disabled:opacity-60 overflow-hidden"
              >
                <motion.span
                  animate={endorsed ? { scale: [1, 1.15, 1] } : {}}
                  transition={springTransition}
                >
                  {endorsed ? "Endorsed!" : "Endorse This Candidate"}
                </motion.span>
              </button>
            </motion.div>

            {/* Share Menu — desktop */}
            <motion.div variants={fadeOnly} className="relative mb-8">
              <button
                onClick={() => setShareOpen(!shareOpen)}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                <span className="text-[13px] font-medium text-white/45">Share Profile</span>
              </button>
              <AnimatePresence>
                {shareOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 right-0 mb-2 rounded-xl p-1.5 ring-1 ring-white/10 z-50"
                    style={{ background: "rgba(23,23,23,0.95)", backdropFilter: "blur(20px)" }}
                  >
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-sky-400 text-sm font-bold">X</span>
                      <span className="text-[13px] text-white/70">Post on X</span>
                    </a>
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-blue-400 text-sm font-bold">in</span>
                      <span className="text-[13px] text-white/70">LinkedIn</span>
                    </a>
                    <a href={emailUrl} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                      <span className="text-amber-400 text-sm">@</span>
                      <span className="text-[13px] text-white/70">Email</span>
                    </a>
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <span className="text-white/50 text-sm">{copied ? "✓" : "⧉"}</span>
                      <span className="text-[13px] text-white/70">{copied ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Related Candidates */}
            {relatedCandidates.length > 0 && (
              <motion.div variants={fadeOnly}>
                <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-4">Similar Candidates</p>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {relatedCandidates.map((rc) => (
                    <Link
                      key={rc.id}
                      href={`/candidates/${rc.id}`}
                      className="group bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-4 hover:ring-white/[0.14] hover:bg-white/[0.05] transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {rc.photo_url ? (
                          <Image
                            src={rc.photo_url}
                            alt={rc.full_name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                            {rc.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-white truncate group-hover:text-blue-400 transition-colors">{rc.full_name}</p>
                          <p className="text-[11px] text-white/50 truncate">{rc.headline || `${rc.experience_years}y exp`}</p>
                        </div>
                      </div>
                      {rc.skills && rc.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rc.skills.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-white/5 text-white/50 text-[10px] rounded-full">{s}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Related Candidates — Mobile (below main content) */}
      {relatedCandidates.length > 0 && (
        <div className="lg:hidden px-5 pb-8">
          <p className="text-[11px] uppercase font-semibold text-white/50 tracking-wider mb-4">Similar Candidates</p>
          <div className="grid grid-cols-2 gap-3">
            {relatedCandidates.map((rc) => (
              <Link
                key={rc.id}
                href={`/candidates/${rc.id}`}
                className="group bg-white/[0.03] ring-1 ring-white/[0.06] rounded-xl p-3 hover:ring-white/[0.14] transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  {rc.photo_url ? (
                    <Image
                      src={rc.photo_url}
                      alt={rc.full_name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                      {rc.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{rc.full_name}</p>
                    <p className="text-[10px] text-white/50 truncate">{rc.headline || `${rc.experience_years}y`}</p>
                  </div>
                </div>
                {rc.skills && rc.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rc.skills.slice(0, 2).map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-white/5 text-white/50 text-[9px] rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
