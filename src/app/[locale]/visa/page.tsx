'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Icon } from '@iconify/react';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase';
import type { VisaRequirement, CountryCode } from '@/types';

// ── Country data ──────────────────────────────────────────────────────
interface Country {
  code: CountryCode;
  name: string;
  flag: string;
  temp: 'warm' | 'neutral' | 'cool' | 'cold';
}

const COUNTRIES: Country[] = [
  { code: 'us', name: 'United States', flag: '🇺🇸', temp: 'neutral' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', temp: 'cold' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', temp: 'cool' },
  { code: 'ch', name: 'Switzerland', flag: '🇨🇭', temp: 'cold' },
  { code: 'de', name: 'Germany', flag: '🇩🇪', temp: 'cool' },
  { code: 'fr', name: 'France', flag: '🇫🇷', temp: 'neutral' },
  { code: 'es', name: 'Spain', flag: '🇪🇸', temp: 'warm' },
  { code: 'it', name: 'Italy', flag: '🇮🇹', temp: 'warm' },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', temp: 'cool' },
  { code: 'be', name: 'Belgium', flag: '🇧🇪', temp: 'cool' },
  { code: 'at', name: 'Austria', flag: '🇦🇹', temp: 'cool' },
  { code: 'pt', name: 'Portugal', flag: '🇵🇹', temp: 'warm' },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪', temp: 'cool' },
  { code: 'se', name: 'Sweden', flag: '🇸🇪', temp: 'cold' },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰', temp: 'cold' },
  { code: 'no', name: 'Norway', flag: '🇳🇴', temp: 'cold' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮', temp: 'cold' },
  { code: 'pl', name: 'Poland', flag: '🇵🇱', temp: 'cool' },
  { code: 'cz', name: 'Czech Republic', flag: '🇨🇿', temp: 'cool' },
  { code: 'ro', name: 'Romania', flag: '🇷🇴', temp: 'neutral' },
  { code: 'in', name: 'India', flag: '🇮🇳', temp: 'warm' },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽', temp: 'warm' },
  { code: 'br', name: 'Brazil', flag: '🇧🇷', temp: 'warm' },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷', temp: 'neutral' },
  { code: 'cn', name: 'China', flag: '🇨🇳', temp: 'neutral' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵', temp: 'neutral' },
  { code: 'kr', name: 'South Korea', flag: '🇰🇷', temp: 'neutral' },
  { code: 'vn', name: 'Vietnam', flag: '🇻🇳', temp: 'warm' },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭', temp: 'warm' },
];

const TEMP_GRADIENTS: Record<Country['temp'], string> = {
  warm: 'from-orange-950/30 via-[#0F172A] to-amber-950/20',
  neutral: 'from-[#0F172A] via-slate-900/80 to-[#0F172A]',
  cool: 'from-blue-950/30 via-[#0F172A] to-cyan-950/20',
  cold: 'from-indigo-950/40 via-[#0F172A] to-blue-950/30',
};

const POPULAR_ROUTES: { from: CountryCode; to: CountryCode; label: string }[] = [
  { from: 'in', to: 'us', label: 'H-1B Visa' },
  { from: 'us', to: 'ca', label: 'Express Entry' },
  { from: 'in', to: 'ca', label: 'PR Pathway' },
  { from: 'br', to: 'pt', label: 'D7 / Golden Visa' },
  { from: 'ph', to: 'jp', label: 'Specified Skilled Worker' },
  { from: 'in', to: 'gb', label: 'Skilled Worker Visa' },
  { from: 'mx', to: 'us', label: 'TN Visa' },
  { from: 'in', to: 'de', label: 'EU Blue Card' },
];

function getCountry(code: CountryCode): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

function difficultyColor(visa: VisaRequirement): string {
  if (visa.quota_limited) return 'bg-red-500/20 text-red-400 ring-red-500/30';
  if (visa.processing_time_days && visa.processing_time_days > 180)
    return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30';
  return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30';
}

function difficultyLabel(visa: VisaRequirement): string {
  if (visa.quota_limited) return 'Restricted';
  if (visa.processing_time_days && visa.processing_time_days > 180) return 'Moderate';
  return 'Straightforward';
}

// ── Country Dropdown ──────────────────────────────────────────────────
function CountryDropdown({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: CountryCode | null;
  onChange: (code: CountryCode) => void;
  exclude?: CountryCode | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bounceFlag, setBounceFlag] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.code !== exclude &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = value ? getCountry(value) : null;

  return (
    <div ref={ref} className="relative flex-1 min-w-[220px]">
      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#0F172A] ring-1 ring-white/10 rounded-xl text-left hover:ring-white/20 transition-all"
      >
        {selected ? (
          <>
            <AnimatePresence mode="wait">
              <motion.span
                key={selected.code}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="text-2xl"
              >
                {selected.flag}
              </motion.span>
            </AnimatePresence>
            <span className="text-white font-medium">{selected.name}</span>
          </>
        ) : (
          <span className="text-white/40">Select country...</span>
        )}
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={`w-4 h-4 text-white/40 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-[#161929] ring-1 ring-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2">
              <input
                autoFocus
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 rounded-lg text-sm text-white placeholder:text-white/30 outline-none ring-1 ring-white/5 focus:ring-blue-500/50"
              />
            </div>
            <div className="max-h-64 overflow-y-auto px-1 pb-1">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    onChange(c.code);
                    setBounceFlag(c.code);
                    setTimeout(() => setBounceFlag(null), 400);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/5 transition-colors ${
                    value === c.code ? 'bg-blue-500/10 text-blue-400' : 'text-white/80'
                  }`}
                >
                  <motion.span
                    className="text-xl"
                    animate={
                      bounceFlag === c.code
                        ? { scale: [1, 1.5, 1], rotate: [0, 10, -10, 0] }
                        : {}
                    }
                    transition={{ type: 'spring', stiffness: 300, damping: 10 }}
                  >
                    {c.flag}
                  </motion.span>
                  <span className="text-sm">{c.name}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-white/30 text-sm py-4">No countries found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Connecting Dots Animation ─────────────────────────────────────────
function ConnectingDotsAnimation({
  fromCountry,
  toCountry,
  onComplete,
}: {
  fromCountry: Country;
  toCountry: Country;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="flex items-center justify-center gap-4 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* From flag */}
      <motion.div
        initial={{ x: -60, opacity: 0, scale: 0.3 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0 }}
        className="text-5xl"
      >
        {fromCountry.flag}
      </motion.div>

      {/* Pulsing connection line */}
      <div className="relative w-40 h-1 mx-2">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          style={{ originX: 0 }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 blur-sm"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 0.8, 0.3] }}
          transition={{ duration: 1.2, delay: 0.3 }}
          style={{ originX: 0 }}
        />
        {/* Traveling dot */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-blue-500/50"
          initial={{ left: '0%', opacity: 0 }}
          animate={{
            left: ['0%', '100%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
      </div>

      {/* To flag */}
      <motion.div
        initial={{ x: 60, opacity: 0, scale: 0.3 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
        className="text-5xl"
      >
        {toCountry.flag}
      </motion.div>
    </motion.div>
  );
}

// ── Visa Card ─────────────────────────────────────────────────────────
function VisaCard({ visa, index }: { visa: VisaRequirement; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const processingPercent = visa.processing_time_days
    ? Math.min((visa.processing_time_days / 365) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: index * 0.1,
      }}
      className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl overflow-hidden hover:ring-white/20 transition-all"
    >
      {/* Summary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-white">{visa.visa_type}</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${difficultyColor(visa)}`}
              >
                {difficultyLabel(visa)}
              </span>
              {visa.sponsorship_required && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30">
                  <Icon icon="solar:buildings-bold" className="w-3 h-3" />
                  Sponsor Required
                </span>
              )}
            </div>
            <p className="text-white/50 text-sm line-clamp-2">{visa.description}</p>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Icon icon="solar:alt-arrow-down-linear" className="w-5 h-5 text-white/40" />
          </motion.div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          {visa.processing_time_days && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Icon icon="solar:clock-circle-linear" className="w-4 h-4 text-blue-400" />
              <span>{visa.processing_time_days} days processing</span>
            </div>
          )}
          {visa.fee_amount != null && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Icon icon="solar:wallet-linear" className="w-4 h-4 text-emerald-400" />
              <span>
                {visa.fee_currency ?? 'USD'} {visa.fee_amount.toLocaleString()}
              </span>
            </div>
          )}
          {visa.quota_limited && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Icon icon="solar:shield-warning-linear" className="w-4 h-4 text-amber-400" />
              <span>Quota limited{visa.annual_quota ? ` (${visa.annual_quota.toLocaleString()}/yr)` : ''}</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">
              {/* Processing time bar */}
              {visa.processing_time_days && (
                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                    Processing Timeline
                  </h4>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${processingPercent}%` }}
                      transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-white/30">
                    <span>0 days</span>
                    <span className="text-blue-400 font-medium">
                      {visa.processing_time_days} days
                    </span>
                    <span>365 days</span>
                  </div>
                </div>
              )}

              {/* Fees */}
              {visa.fee_amount != null && (
                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                    Estimated Fees
                  </h4>
                  <p className="text-xl font-semibold text-white">
                    {visa.fee_currency ?? 'USD'}{' '}
                    {visa.fee_amount.toLocaleString()}
                  </p>
                  {visa.min_salary != null && (
                    <p className="text-sm text-white/40 mt-1">
                      Minimum salary required: {visa.fee_currency ?? 'USD'}{' '}
                      {visa.min_salary.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Required Documents */}
              {visa.required_documents.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                    Required Documents
                  </h4>
                  <ul className="space-y-2">
                    {visa.required_documents.map((doc, i) => (
                      <motion.li
                        key={doc}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.07 }}
                        className="flex items-start gap-2.5"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 15,
                            delay: 0.4 + i * 0.07,
                          }}
                        >
                          <Icon
                            icon="solar:check-circle-bold"
                            className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0"
                          />
                        </motion.div>
                        <span className="text-sm text-white/70">{doc}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Eligible Occupations */}
              {visa.eligible_occupations && visa.eligible_occupations.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                    Eligible Occupations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {visa.eligible_occupations.map((occ, i) => (
                      <motion.span
                        key={occ}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="px-3 py-1 bg-white/5 ring-1 ring-white/10 rounded-lg text-xs text-white/60"
                      >
                        {occ}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education & Experience */}
              <div className="flex flex-wrap gap-6">
                {visa.education_requirements && (
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
                      Education
                    </h4>
                    <p className="text-sm text-white/70">{visa.education_requirements}</p>
                  </div>
                )}
                {visa.min_experience_years != null && (
                  <div>
                    <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">
                      Min. Experience
                    </h4>
                    <p className="text-sm text-white/70">{visa.min_experience_years}+ years</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {visa.notes && (
                <div className="bg-amber-500/5 ring-1 ring-amber-500/10 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Icon icon="solar:info-circle-linear" className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-200/70">{visa.notes}</p>
                  </div>
                </div>
              )}

              {/* Last Updated + Source */}
              <div className="flex items-center justify-between text-xs text-white/25 pt-2 border-t border-white/5">
                <span>
                  Last updated:{' '}
                  {new Date(visa.last_scraped_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {visa.source_url && (
                  <a
                    href={visa.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon icon="solar:link-round-linear" className="w-3 h-3" />
                    Source
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Popular Route Card ────────────────────────────────────────────────
function PopularRouteCard({
  route,
  index,
  onSelect,
}: {
  route: (typeof POPULAR_ROUTES)[number];
  index: number;
  onSelect: (from: CountryCode, to: CountryCode) => void;
}) {
  const from = getCountry(route.from);
  const to = getCountry(route.to);

  return (
    <motion.button
      onClick={() => onSelect(route.from, route.to)}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -4, 0],
      }}
      transition={{
        opacity: { delay: 0.2 + index * 0.08, duration: 0.4 },
        y: {
          delay: 0.5 + index * 0.15,
          duration: 3,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        },
      }}
      whileHover={{ scale: 1.04, y: -6 }}
      whileTap={{ scale: 0.97 }}
      className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 text-left hover:ring-white/20 transition-colors group cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{from.flag}</span>
        <Icon
          icon="solar:arrow-right-linear"
          className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors"
        />
        <span className="text-2xl">{to.flag}</span>
      </div>
      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
        {from.name} to {to.name}
      </p>
      <p className="text-xs text-white/40 mt-1">{route.label}</p>
    </motion.button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function VisaPage() {
  const [fromCode, setFromCode] = useState<CountryCode | null>(null);
  const [toCode, setToCode] = useState<CountryCode | null>(null);
  const [results, setResults] = useState<VisaRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const destCountry = toCode ? getCountry(toCode) : null;
  const bgTemp = destCountry?.temp ?? 'neutral';

  // Fetch visa requirements when both selected
  const fetchVisas = useCallback(async (from: CountryCode, to: CountryCode) => {
    // Batch state updates via startTransition to avoid cascading renders
    setShowAnimation(true);
    setSearched(false);
    setResults([]);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('visa_requirements')
      .select('*')
      .eq('origin_country', from)
      .eq('destination_country', to)
      .eq('is_active', true)
      .order('visa_type');

    if (!error && data) {
      // Delay results until animation completes
      setTimeout(() => {
        setResults(data as VisaRequirement[]);
        setLoading(false);
        setSearched(true);
      }, 1800);
    } else {
      setResults([]);
      setLoading(false);
      setSearched(true);
      setShowAnimation(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (fromCode && toCode) {
      fetchVisas(fromCode, toCode);
    } else {
      setResults([]);
      setSearched(false);
      setShowAnimation(false);
    }
  }, [fromCode, toCode, fetchVisas]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handlePopularRoute = (from: CountryCode, to: CountryCode) => {
    setFromCode(from);
    setToCode(to);
  };

  const fromCountry = fromCode ? getCountry(fromCode) : null;
  const toCountry = toCode ? getCountry(toCode) : null;

  return (
    <>
      <Header />

      {/* Temperature background */}
      <motion.div
        className={`fixed inset-0 bg-gradient-to-br ${TEMP_GRADIENTS[bgTemp]} -z-10`}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        key={bgTemp}
        initial={{ opacity: 0 }}
      />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 text-xs font-medium mb-4">
                <Icon icon="solar:passport-bold" className="w-3.5 h-3.5" />
                Visa & Work Permit Guide
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Work Anywhere in the World
              </h1>
              <p className="text-white/50 max-w-xl mx-auto">
                Select your nationality and destination to discover visa requirements,
                processing times, costs, and eligible pathways.
              </p>
            </motion.div>

            {/* Country selectors */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 items-end"
            >
              <CountryDropdown
                label="I'm from"
                value={fromCode}
                onChange={setFromCode}
                exclude={toCode}
              />

              <div className="hidden sm:flex items-center pb-3">
                <motion.div
                  animate={
                    fromCode && toCode
                      ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  <Icon
                    icon="solar:round-transfer-horizontal-bold"
                    className="w-6 h-6 text-white/20"
                  />
                </motion.div>
              </div>

              <CountryDropdown
                label="I want to work in"
                value={toCode}
                onChange={setToCode}
                exclude={fromCode}
              />
            </motion.div>
          </div>
        </section>

        {/* Results Area */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <AnimatePresence mode="wait">
            {/* Connecting animation */}
            {showAnimation && fromCountry && toCountry && !searched && (
              <motion.div key="animation" exit={{ opacity: 0 }}>
                <ConnectingDotsAnimation
                  fromCountry={fromCountry}
                  toCountry={toCountry}
                  onComplete={() => setShowAnimation(false)}
                />
              </motion.div>
            )}

            {/* Results */}
            {searched && results.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    {results.length} visa {results.length === 1 ? 'pathway' : 'pathways'} found
                  </h2>
                  <span className="text-white/30 text-sm">
                    {fromCountry?.flag} {fromCountry?.name} to {toCountry?.flag} {toCountry?.name}
                  </span>
                </div>
                {results.map((visa, i) => (
                  <VisaCard key={visa.id} visa={visa} index={i} />
                ))}
              </motion.div>
            )}

            {/* Empty state */}
            {searched && results.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                >
                  <Icon
                    icon="solar:compass-big-linear"
                    className="w-16 h-16 text-white/10 mx-auto mb-4"
                  />
                </motion.div>
                <h3 className="text-lg font-medium text-white/60 mb-2">Coming Soon</h3>
                <p className="text-white/30 max-w-md mx-auto text-sm">
                  We are currently building the visa requirements database for this route.
                  Check back soon or try a popular route below.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular Routes */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-20"
          >
            <h2 className="text-lg font-semibold text-white mb-1">Popular Routes</h2>
            <p className="text-sm text-white/40 mb-6">
              Commonly searched visa pathways for global talent
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {POPULAR_ROUTES.map((route, i) => (
                <PopularRouteCard
                  key={`${route.from}-${route.to}`}
                  route={route}
                  index={i}
                  onSelect={handlePopularRoute}
                />
              ))}
            </div>
          </motion.section>
        </section>
      </main>
    </>
  );
}
