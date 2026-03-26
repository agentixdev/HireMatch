'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

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
  };
  priority?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function CandidateCard({ candidate, priority }: CandidateCardProps) {
  const initials = getInitials(candidate.full_name);
  const hasPhoto = !!candidate.photo_url;
  const extraSkillsCount = Math.max(0, candidate.skills.length - 3);
  const visibleSkills = candidate.skills.slice(0, 3);

  const location = [candidate.city, candidate.country.toUpperCase()]
    .filter(Boolean)
    .join(', ');

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="overflow-hidden rounded-2xl bg-[#161929] border border-[#1e2235] group"
    >
      <Link href={`/candidates/${candidate.id}`} className="block">
        {/* Image area — 3:4 portrait */}
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
              <span className="text-3xl font-bold text-white/20 select-none">
                {initials}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Open to Work badge — top-left */}
          {candidate.is_public && (
            <div className="absolute top-2 left-2 flex items-center bg-green-500/20 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[10px] text-green-400 font-medium">Open to Work</span>
            </div>
          )}

          {/* Trending badge — top-right */}
          {candidate.trending && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm rounded-full px-1.5 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <span className="text-[10px] text-green-400 font-medium">
                Trending
              </span>
            </div>
          )}

          {/* Match score — bottom-right */}
          {candidate.match_score != null && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[11px] font-bold text-blue-400">
                {candidate.match_score}%
              </span>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="px-3 pt-2 pb-2.5">
          <p className="text-sm font-bold text-white truncate">
            {candidate.full_name}
          </p>

          {candidate.headline && (
            <p className="text-[11px] text-white/40 truncate">
              {candidate.headline}
            </p>
          )}

          {/* Skills */}
          {visibleSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {visibleSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-full truncate max-w-[90px]"
                >
                  {skill}
                </span>
              ))}
              {extraSkillsCount > 0 && (
                <span className="text-[10px] text-white/30">
                  +{extraSkillsCount}
                </span>
              )}
            </div>
          )}

          {/* Location */}
          {location && (
            <p className="text-[10px] text-white/30 mt-1 truncate">
              {location}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
