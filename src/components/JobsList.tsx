'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { springSnappy } from '@/lib/wow';
import type { Job } from '@/types';

interface JobWithExtras extends Job {
  recruiter?: { company_name: string; company_logo_url?: string };
  company_name?: string;
  company_logo?: string;
  external_url?: string;
  source?: string;
}

const COUNTRIES = [
  { code: 'us', name: 'United States' }, { code: 'ca', name: 'Canada' },
  { code: 'gb', name: 'United Kingdom' }, { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' }, { code: 'ch', name: 'Switzerland' },
  { code: 'nl', name: 'Netherlands' }, { code: 'es', name: 'Spain' },
  { code: 'it', name: 'Italy' }, { code: 'ie', name: 'Ireland' },
  { code: 'se', name: 'Sweden' }, { code: 'dk', name: 'Denmark' },
  { code: 'no', name: 'Norway' }, { code: 'fi', name: 'Finland' },
  { code: 'at', name: 'Austria' }, { code: 'be', name: 'Belgium' },
  { code: 'pt', name: 'Portugal' }, { code: 'pl', name: 'Poland' },
  { code: 'cz', name: 'Czech Republic' }, { code: 'ro', name: 'Romania' },
  { code: 'in', name: 'India' }, { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' }, { code: 'cn', name: 'China' },
  { code: 'br', name: 'Brazil' }, { code: 'mx', name: 'Mexico' },
  { code: 'ar', name: 'Argentina' }, { code: 'vn', name: 'Vietnam' },
  { code: 'ph', name: 'Philippines' },
];

const SOURCE_COLORS: Record<string, string> = {
  remotive: 'bg-emerald-500/15 text-emerald-400',
  arbeitnow: 'bg-amber-500/15 text-amber-400',
  remoteok: 'bg-cyan-500/15 text-cyan-400',
  weworkremotely: 'bg-purple-500/15 text-purple-400',
  jsearch: 'bg-blue-500/15 text-blue-400',
  adzuna: 'bg-orange-500/15 text-orange-400',
  seed: 'bg-pink-500/15 text-pink-400',
  manual: 'bg-white/10 text-white/60',
};

function getCompanyName(job: JobWithExtras): string {
  return job.recruiter?.company_name || job.company_name || 'Company';
}

function getCompanyLogo(job: JobWithExtras): string | undefined {
  return job.recruiter?.company_logo_url || job.company_logo || undefined;
}

function getCompanyInitial(job: JobWithExtras): string {
  return getCompanyName(job).charAt(0).toUpperCase();
}

export default function JobsList({
  jobs,
  totalCount,
  currentPage,
  searchQuery,
  filters,
}: {
  jobs: JobWithExtras[];
  totalCount: number;
  currentPage: number;
  searchQuery: string;
  filters: { country?: string; type?: string; mode?: string; source?: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(searchQuery);

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    const merged = { q: query || undefined, ...filters, ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/jobs?${buildParams({ page: undefined })}`);
  };

  const setFilter = (key: string, value: string) => {
    router.push(`/jobs?${buildParams({ [key]: value || undefined, page: undefined })}`);
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null;
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
    const cur = currency || 'USD';
    if (min && max) return `${cur} ${fmt(min)} – ${fmt(max)}`;
    if (min) return `${cur} ${fmt(min)}+`;
    return `Up to ${cur} ${fmt(max!)}`;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
            Browse Jobs
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'job' : 'jobs'} across {COUNTRIES.length} countries
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white/[0.03] ring-1 ring-white/[0.08] rounded-2xl p-4 sm:p-5 mb-6 backdrop-blur-sm">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, skill, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all text-sm"
            />
          </div>
          <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20 font-medium text-sm hover:shadow-blue-500/30 transition-shadow">
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-2.5">
          <select
            value={filters.mode || ''}
            onChange={(e) => setFilter('mode', e.target.value)}
            className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="">All Work Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilter('type', e.target.value)}
            className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
          <select
            value={filters.country || ''}
            onChange={(e) => setFilter('country', e.target.value)}
            className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {/* Active filters clear */}
          {(filters.country || filters.type || filters.mode || searchQuery) && (
            <button
              onClick={() => router.push('/jobs')}
              className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Job Cards */}
      {jobs.length === 0 ? (
        <div className="bg-white/[0.03] ring-1 ring-white/[0.08] rounded-2xl p-16 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-white/60 text-lg font-medium">No jobs found</p>
          <p className="text-white/40 text-sm mt-1">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSnappy, delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => {
                if (job.external_url) {
                  window.open(job.external_url, '_blank', 'noopener');
                } else {
                  router.push(`/jobs/${job.id}`);
                }
              }}
              className="group bg-white/[0.03] ring-1 ring-white/[0.08] rounded-2xl p-5 sm:p-6 hover:ring-white/20 hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  {/* Company logo */}
                  {getCompanyLogo(job) ? (
                    <img src={getCompanyLogo(job)} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-white/10 flex items-center justify-center text-base font-bold text-blue-400 flex-shrink-0">
                      {getCompanyInitial(job)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                      {job.title}
                    </h2>
                    <p className="text-sm text-white/50 truncate">{getCompanyName(job)}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {job.city && (
                        <span className="px-2 py-0.5 bg-white/[0.06] text-white/50 text-xs rounded-full">
                          {job.city}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-white/[0.06] text-white/50 text-xs rounded-full">
                        {job.country.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full capitalize">
                        {job.work_mode}
                      </span>
                      <span className="px-2 py-0.5 bg-white/[0.06] text-white/50 text-xs rounded-full capitalize">
                        {job.job_type}
                      </span>
                      {job.visa_sponsorship && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                          Visa Sponsor
                        </span>
                      )}
                      {job.source && job.source !== 'manual' && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${SOURCE_COLORS[job.source] || SOURCE_COLORS.manual}`}>
                          {job.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                    <div className="font-semibold text-white text-sm">
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </div>
                  )}
                  <div className="text-xs text-white/40 mt-1">
                    {timeAgo(job.created_at)}
                  </div>
                  {job.external_url && (
                    <div className="text-xs text-blue-400 mt-1.5 flex items-center gap-1 justify-end">
                      Apply
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              {job.skills_required && job.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pl-15">
                  {job.skills_required.slice(0, 6).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-blue-500/8 text-blue-400/80 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                  {job.skills_required.length > 6 && (
                    <span className="px-2 py-0.5 text-white/40 text-xs">
                      +{job.skills_required.length - 6}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            disabled={currentPage <= 1}
            onClick={() => router.push(`/jobs?${buildParams({ page: String(currentPage - 1) })}`)}
            className="px-4 py-2 bg-white/[0.05] ring-1 ring-white/[0.08] rounded-xl text-sm text-white/70 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-white/50">
            {currentPage} / {Math.ceil(totalCount / 20)}
          </span>
          <button
            disabled={currentPage * 20 >= totalCount}
            onClick={() => router.push(`/jobs?${buildParams({ page: String(currentPage + 1) })}`)}
            className="px-4 py-2 bg-white/[0.05] ring-1 ring-white/[0.08] rounded-xl text-sm text-white/70 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
