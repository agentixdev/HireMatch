'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Icon } from '@iconify/react';
import DashboardLayout from '@/components/DashboardLayout';
import CandidateCard from '@/components/CandidateCard';
// supabase client removed — search uses /api/candidates/search (service client)

/* ---------- types ---------- */

interface Candidate {
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
}

interface Filters {
  country: string;
  expMin: number;
  expMax: number;
  remote: string;
  visa: string;
  skills: string[];
}

const COUNTRIES = [
  'US', 'UK', 'CA', 'DE', 'FR', 'AU', 'IN', 'BR', 'NL', 'SG', 'AE', 'JP',
];
const REMOTE_OPTIONS = ['Remote', 'Hybrid', 'On-site'];
const VISA_OPTIONS = ['Citizen', 'Permanent Resident', 'Work Visa', 'Sponsorship Needed'];
const POPULAR_SKILLS = [
  'React', 'TypeScript', 'Python', 'Node.js', 'AWS', 'Go', 'Rust',
  'Kubernetes', 'SQL', 'Java', 'Figma', 'Swift', 'Machine Learning',
  'Docker', 'GraphQL', 'C++', 'Ruby', 'Next.js', 'Vue', 'Terraform',
];
const PAGE_SIZE = 24;

/* ---------- animated counter ---------- */

function AnimatedCount({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(mv, value, {
      type: 'spring',
      stiffness: 80,
      damping: 20,
    });
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, mv, rounded]);

  return <span>{display.toLocaleString()}</span>;
}

/* ---------- filter pill ---------- */

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full"
    >
      {label}
      <button
        onClick={onRemove}
        className="hover:text-white transition-colors"
        aria-label={`Remove ${label}`}
      >
        <Icon icon="solar:close-circle-bold" className="w-3.5 h-3.5" />
      </button>
    </motion.span>
  );
}

/* ---------- scanning animation ---------- */

function ScanningOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 overflow-hidden rounded-2xl pointer-events-none"
    >
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
        className="absolute inset-y-0 w-1/3"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), rgba(59,130,246,0.3), rgba(59,130,246,0.15), transparent)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Icon icon="solar:magnifer-bold" className="w-8 h-8 text-blue-400/50" />
        </motion.div>
        <p className="ml-3 text-sm text-blue-400/70 font-medium">Scanning candidates...</p>
      </div>
    </motion.div>
  );
}

/* ---------- main page ---------- */

export default function RecruiterSearchPage() {
  // supabase client removed — using API route instead

  /* state */
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    country: '',
    expMin: 0,
    expMax: 30,
    remote: '',
    visa: '',
    skills: [],
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* derived */
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters =
    filters.country || filters.remote || filters.visa || filters.skills.length > 0 ||
    filters.expMin > 0 || filters.expMax < 30;

  /* temperature gradient based on result count */
  const bgGradient = useMemo(() => {
    if (!searched) return 'from-[#0B1120] via-[#0F172A] to-[#0B1120]';
    if (totalCount === 0) return 'from-[#0B1120] via-[#0c1631] to-[#0B1120]';
    if (totalCount < 10) return 'from-[#0B1120] via-[#101d3a] to-[#0B1120]';
    if (totalCount < 50) return 'from-[#0B1120] via-[#131f3d] to-[#111827]';
    return 'from-[#0F172A] via-[#1a1635] to-[#1e1230]';
  }, [searched, totalCount]);

  /* search function — uses service-client API route to bypass RLS */
  const fetchCandidates = useCallback(
    async (q: string, f: Filters, p: number) => {
      setLoading(true);
      setSearched(true);

      // Small delay so scanning animation is visible
      await new Promise((r) => setTimeout(r, 600));

      try {
        const res = await fetch('/api/candidates/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            page: p,
            country: f.country,
            remote: f.remote,
            visa: f.visa,
            expMin: f.expMin,
            expMax: f.expMax,
            skills: f.skills,
          }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          console.error('Search error:', json.error);
          setCandidates([]);
          setTotalCount(0);
        } else {
          setCandidates((json.candidates as Candidate[]) ?? []);
          setTotalCount(json.total ?? 0);
        }
      } catch (err) {
        console.error('Search fetch error:', err);
        setCandidates([]);
        setTotalCount(0);
      }

      setLoading(false);
    },
    [],
  );

  /* debounced search on query/filter/page change */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCandidates(query, filters, page);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, filters, page, fetchCandidates]);

  /* helpers */
  const toggleSkill = (skill: string) => {
    setPage(0);
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const addCustomSkill = () => {
    const s = skillInput.trim();
    if (s && !filters.skills.includes(s)) {
      setPage(0);
      setFilters((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput('');
  };

  const clearFilters = () => {
    setPage(0);
    setFilters({ country: '', expMin: 0, expMax: 30, remote: '', visa: '', skills: [] });
  };

  const allActivePills = [
    ...(filters.country ? [{ key: 'country', label: filters.country, clear: () => setFilters((f) => ({ ...f, country: '' })) }] : []),
    ...(filters.remote ? [{ key: 'remote', label: filters.remote, clear: () => setFilters((f) => ({ ...f, remote: '' })) }] : []),
    ...(filters.visa ? [{ key: 'visa', label: filters.visa, clear: () => setFilters((f) => ({ ...f, visa: '' })) }] : []),
    ...(filters.expMin > 0 || filters.expMax < 30
      ? [{ key: 'exp', label: `${filters.expMin}-${filters.expMax} yrs`, clear: () => setFilters((f) => ({ ...f, expMin: 0, expMax: 30 })) }]
      : []),
    ...filters.skills.map((s) => ({
      key: `skill-${s}`,
      label: s,
      clear: () => toggleSkill(s),
    })),
  ];

  /* stagger variants */
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <DashboardLayout role="recruiter">
      <div className={`min-h-screen bg-gradient-to-b ${bgGradient} transition-colors duration-1000`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ---------- search header ---------- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Find Candidates</h1>
          <p className="text-white/40 text-sm">AI-powered candidate search across the entire talent pool</p>
        </div>

        {/* ---------- search bar ---------- */}
        <div className="relative mb-4">
          <motion.div
            animate={{
              boxShadow: inputFocused
                ? '0 0 0 3px rgba(59,130,246,0.35), 0 0 24px rgba(59,130,246,0.15)'
                : '0 0 0 1px rgba(255,255,255,0.1)',
            }}
            transition={{ duration: 0.25 }}
            className="flex items-center rounded-xl bg-[#0F172A] overflow-hidden"
          >
            <div className="pl-4 text-white/30">
              <Icon icon="solar:magnifer-linear" className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Search by name, skills, or headline..."
              className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder:text-white/30 outline-none"
            />
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`mr-1 p-2.5 rounded-lg transition-colors ${
                filtersOpen || hasActiveFilters
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
              aria-label="Toggle filters"
            >
              <Icon icon="solar:tuning-2-linear" className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute top-2 right-14 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => fetchCandidates(query, filters, page)}
              className="mr-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              Search
            </button>
          </motion.div>
        </div>

        {/* ---------- active filter pills ---------- */}
        <AnimatePresence mode="popLayout">
          {allActivePills.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-2 mb-4"
            >
              <AnimatePresence mode="popLayout">
                {allActivePills.map((pill) => (
                  <FilterPill key={pill.key} label={pill.label} onRemove={pill.clear} />
                ))}
              </AnimatePresence>
              <button
                onClick={clearFilters}
                className="text-xs text-white/30 hover:text-white/60 transition-colors ml-1"
              >
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- advanced filters ---------- */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="p-5 rounded-2xl bg-[#0F172A] ring-1 ring-white/10 space-y-5">
                {/* Row 1: Country, Remote, Visa */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Country */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-medium">Country</label>
                    <select
                      value={filters.country}
                      onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, country: e.target.value })); }}
                      className="w-full bg-[#161929] text-white text-sm rounded-lg px-3 py-2.5 border border-white/10 outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="">All countries</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remote */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-medium">Remote Preference</label>
                    <select
                      value={filters.remote}
                      onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, remote: e.target.value })); }}
                      className="w-full bg-[#161929] text-white text-sm rounded-lg px-3 py-2.5 border border-white/10 outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="">Any</option>
                      {REMOTE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Visa */}
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5 font-medium">Visa Status</label>
                    <select
                      value={filters.visa}
                      onChange={(e) => { setPage(0); setFilters((f) => ({ ...f, visa: e.target.value })); }}
                      className="w-full bg-[#161929] text-white text-sm rounded-lg px-3 py-2.5 border border-white/10 outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="">Any</option>
                      {VISA_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Experience range */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">
                    Experience: {filters.expMin} - {filters.expMax === 30 ? '30+' : filters.expMax} years
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={filters.expMin}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPage(0);
                        setFilters((f) => ({ ...f, expMin: Math.min(v, f.expMax) }));
                      }}
                      className="flex-1 accent-blue-500"
                    />
                    <input
                      type="range"
                      min={0}
                      max={30}
                      value={filters.expMax}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPage(0);
                        setFilters((f) => ({ ...f, expMax: Math.max(v, f.expMin) }));
                      }}
                      className="flex-1 accent-blue-500"
                    />
                  </div>
                </div>

                {/* Row 3: Skills */}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 font-medium">Skills</label>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                      placeholder="Add a skill..."
                      className="flex-1 bg-[#161929] text-white text-sm rounded-lg px-3 py-2 border border-white/10 outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20"
                    />
                    <button
                      onClick={addCustomSkill}
                      className="px-3 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map((skill) => {
                      const active = filters.skills.includes(skill);
                      return (
                        <motion.button
                          key={skill}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => { setPage(0); toggleSkill(skill); }}
                          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                            active
                              ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                              : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {skill}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- results header ---------- */}
        {searched && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-white/50">
              <span className="text-white font-semibold">
                <AnimatedCount value={totalCount} />
              </span>{' '}
              candidate{totalCount !== 1 ? 's' : ''} found
            </p>
            {totalPages > 1 && (
              <p className="text-xs text-white/30">
                Page {page + 1} of {totalPages}
              </p>
            )}
          </div>
        )}

        {/* ---------- results grid ---------- */}
        <div className="relative min-h-[200px]">
          <AnimatePresence>
            {loading && <ScanningOverlay />}
          </AnimatePresence>

          {!loading && searched && candidates.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Icon icon="solar:ghost-bold-duotone" className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/30 text-sm">No candidates match your search</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear all filters
              </button>
            </motion.div>
          )}

          {!loading && candidates.length > 0 && (
            <motion.div
              key={`page-${page}-${query}-${JSON.stringify(filters)}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
            >
              {candidates.map((candidate, i) => (
                <motion.div key={candidate.id} variants={itemVariants}>
                  <CandidateCard candidate={candidate} priority={i < 6} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* ---------- pagination ---------- */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <Icon icon="solar:arrow-left-linear" className="w-5 h-5" />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = page - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    page === pageNum
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <Icon icon="solar:arrow-right-linear" className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
