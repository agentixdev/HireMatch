'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Candidate } from '@/types';
import CandidateCard from '@/components/CandidateCard';

const COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'ca', name: 'Canada' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'ch', name: 'Switzerland' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'es', name: 'Spain' },
  { code: 'it', name: 'Italy' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'be', name: 'Belgium' },
  { code: 'at', name: 'Austria' },
  { code: 'pt', name: 'Portugal' },
  { code: 'ie', name: 'Ireland' },
  { code: 'se', name: 'Sweden' },
  { code: 'dk', name: 'Denmark' },
  { code: 'no', name: 'Norway' },
  { code: 'fi', name: 'Finland' },
  { code: 'pl', name: 'Poland' },
  { code: 'cz', name: 'Czech Republic' },
  { code: 'ro', name: 'Romania' },
  { code: 'in', name: 'India' },
  { code: 'mx', name: 'Mexico' },
  { code: 'br', name: 'Brazil' },
  { code: 'ar', name: 'Argentina' },
  { code: 'cn', name: 'China' },
  { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' },
  { code: 'vn', name: 'Vietnam' },
  { code: 'ph', name: 'Philippines' },
];

const EXPERIENCE_LEVELS = [
  { value: '0-2', label: 'Junior (0-2 years)' },
  { value: '3-5', label: 'Mid-level (3-5 years)' },
  { value: '6-10', label: 'Senior (6-10 years)' },
  { value: '11-99', label: 'Staff+ (11+ years)' },
];

const PER_PAGE = 24;

export default function CandidatesList({
  candidates,
  totalCount,
  currentPage,
  searchQuery,
  filters,
}: {
  candidates: Candidate[];
  totalCount: number;
  currentPage: number;
  searchQuery: string;
  filters: { country?: string; mode?: string; experience?: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(searchQuery);

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const merged = { q: query || undefined, ...filters, ...overrides };
    const params = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return params.toString();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/candidates?${buildParams()}`);
  };

  const setFilter = (key: string, value: string) => {
    router.push(`/candidates?${buildParams({ [key]: value || undefined, page: undefined })}`);
  };

  const goToPage = (page: number) => {
    router.push(`/candidates?${buildParams({ page: String(page) })}`);
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  return (
    <div>
      {/* Search + Filters */}
      <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates by name or headline..."
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium"
          >
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.country || ''}
            onChange={(e) => setFilter('country', e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <select
            value={filters.mode || ''}
            onChange={(e) => setFilter('mode', e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">All Work Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
            <option value="any">Any</option>
          </select>
          <select
            value={filters.experience || ''}
            onChange={(e) => setFilter('experience', e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">All Experience</option>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
            ))}
          </select>
          <span className="text-sm text-white/50 self-center ml-auto">
            {totalCount} candidate{totalCount !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      {candidates.length === 0 ? (
        <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center text-white/50">
          No candidates found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {candidates.map((candidate, idx) => (
            <CandidateCard
              key={candidate.id}
              candidate={{
                id: candidate.id,
                full_name: candidate.full_name,
                headline: candidate.headline,
                photo_url: candidate.photo_url,
                skills: candidate.skills,
                experience_years: candidate.experience_years,
                country: candidate.country,
                city: candidate.city,
                is_public: candidate.is_public,
                visa_status: candidate.visa_status,
                available_now: candidate.available_now,
              }}
              priority={idx < 8}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > PER_PAGE && (
        <div className="flex justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <button
              onClick={() => goToPage(currentPage - 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
            >
              Previous
            </button>
          )}
          <span className="px-4 py-2 text-sm text-white/60">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <button
              onClick={() => goToPage(currentPage + 1)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
