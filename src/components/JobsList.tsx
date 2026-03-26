'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Job } from '@/types';

interface JobWithRecruiter extends Job {
  recruiter?: { company_name: string; company_logo_url?: string };
}

export default function JobsList({
  jobs,
  totalCount,
  currentPage,
  searchQuery,
  filters,
}: {
  jobs: JobWithRecruiter[];
  totalCount: number;
  currentPage: number;
  searchQuery: string;
  filters: { country?: string; type?: string; mode?: string };
}) {
  const router = useRouter();
  const [query, setQuery] = useState(searchQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filters.country) params.set('country', filters.country);
    if (filters.type) params.set('type', filters.type);
    if (filters.mode) params.set('mode', filters.mode);
    router.push(`/jobs?${params.toString()}`);
  };

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const newFilters = { ...filters, [key]: value || undefined };
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`/jobs?${params.toString()}`);
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return null;
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
    const cur = currency || 'USD';
    if (min && max) return `${cur} ${fmt(min)} - ${fmt(max)}`;
    if (min) return `${cur} ${fmt(min)}+`;
    return `Up to ${cur} ${fmt(max!)}`;
  };

  return (
    <div>
      {/* Search + Filters */}
      <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs by title or keyword..."
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-500/20 font-medium">
            Search
          </button>
        </form>
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.mode || ''}
            onChange={(e) => setFilter('mode', e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
          >
            <option value="">All Work Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilter('type', e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
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
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm"
          >
            <option value="">All Countries</option>
            <option value="us">United States</option>
            <option value="ca">Canada</option>
            <option value="gb">United Kingdom</option>
            <option value="de">Germany</option>
            <option value="fr">France</option>
            <option value="ch">Switzerland</option>
            <option value="in">India</option>
            <option value="jp">Japan</option>
            <option value="br">Brazil</option>
          </select>
          <span className="text-sm text-white/50 self-center ml-auto">{totalCount} jobs found</span>
        </div>
      </div>

      {/* Job Cards */}
      {jobs.length === 0 ? (
        <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-12 text-center text-white/50">
          No jobs found matching your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 hover:ring-white/20 transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {job.recruiter?.company_logo_url ? (
                    <img src={job.recruiter.company_logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-lg font-bold text-white/40">
                      {job.recruiter?.company_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-white">{job.title}</h2>
                    <p className="text-sm text-white/60">{job.recruiter?.company_name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="px-2.5 py-0.5 bg-white/5 text-white/60 text-xs rounded-full">
                        {job.city ? `${job.city}, ` : ''}{job.country.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full capitalize">
                        {job.work_mode}
                      </span>
                      <span className="px-2.5 py-0.5 bg-white/5 text-white/60 text-xs rounded-full capitalize">
                        {job.job_type}
                      </span>
                      {job.visa_sponsorship && (
                        <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                          Visa Sponsorship
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                    <div className="font-semibold text-white">
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </div>
                  )}
                  <div className="text-xs text-white/50 mt-1">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {job.skills_required.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {job.skills_required.slice(0, 6).map((skill) => (
                    <span key={skill} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                  {job.skills_required.length > 6 && (
                    <span className="px-2 py-0.5 bg-transparent text-white/50 text-xs rounded-full">
                      +{job.skills_required.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (query) params.set('q', query);
                Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
                params.set('page', String(currentPage - 1));
                router.push(`/jobs?${params.toString()}`);
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm hover:bg-transparent"
            >
              Previous
            </button>
          )}
          <span className="px-4 py-2 text-sm text-white/60">
            Page {currentPage} of {Math.ceil(totalCount / 20)}
          </span>
          {currentPage * 20 < totalCount && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (query) params.set('q', query);
                Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
                params.set('page', String(currentPage + 1));
                router.push(`/jobs?${params.toString()}`);
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm hover:bg-transparent"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
