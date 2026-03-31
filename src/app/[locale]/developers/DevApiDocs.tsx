'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const API_BASE = 'https://www.hirematch.com/api/v1';

const CODE_EXAMPLES = {
  curl: {
    label: 'cURL',
    icon: 'solar:command-linear',
    code: `curl -H "X-API-Key: hm_live_YOUR_KEY" \\
  "${API_BASE}/visa/rules?country=us"`,
  },
  javascript: {
    label: 'JavaScript',
    icon: 'solar:code-linear',
    code: `const res = await fetch("${API_BASE}/visa/rules?country=us", {
  headers: { "X-API-Key": "hm_live_YOUR_KEY" },
});
const { data, pagination } = await res.json();
console.log(data); // Array of visa rules`,
  },
  python: {
    label: 'Python',
    icon: 'solar:programming-linear',
    code: `import requests

resp = requests.get(
    "${API_BASE}/visa/rules",
    params={"country": "us"},
    headers={"X-API-Key": "hm_live_YOUR_KEY"},
)
data = resp.json()["data"]`,
  },
  widget: {
    label: 'Widget',
    icon: 'solar:widget-linear',
    code: `<!-- Drop this into any HTML page -->
<div id="hirematch-visa"></div>
<script
  src="https://www.hirematch.com/embed/visa-widget.js"
  data-api-key="hm_live_YOUR_KEY"
  data-country="us"
  data-theme="dark">
</script>`,
  },
};

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/v1/visa/countries',
    desc: 'List all supported countries with visa rule counts.',
    params: [],
  },
  {
    method: 'GET',
    path: '/v1/visa/rules',
    desc: 'Query visa rules with filtering, pagination, and field selection.',
    params: [
      { name: 'country', type: 'string', desc: 'Filter by country code (e.g. "us", "gb")' },
      { name: 'type', type: 'string', desc: 'Filter by visa type (e.g. "H-1B")' },
      { name: 'sponsorship', type: 'boolean', desc: 'Filter by sponsorship requirement' },
      { name: 'fields', type: 'string', desc: 'Comma-separated field list' },
      { name: 'page', type: 'number', desc: 'Page number (default: 1)' },
      { name: 'per_page', type: 'number', desc: 'Results per page (1-200, default: 50)' },
    ],
  },
  {
    method: 'GET',
    path: '/v1/visa/rules/:country',
    desc: 'Get all visa rules for a specific country.',
    params: [
      { name: ':country', type: 'path', desc: 'Country code (e.g. "us", "de", "jp")' },
    ],
  },
];

const TIERS = [
  {
    name: 'Starter',
    price: 'Free',
    priceNote: 'with any paid plan',
    rateLimit: '30 req/min',
    quota: '1,000/mo',
    features: ['All endpoints', '29 countries', 'Embeddable widget', 'Email support'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$49',
    priceNote: '/month',
    rateLimit: '120 req/min',
    quota: '25,000/mo',
    features: ['Everything in Starter', 'Priority support', 'Usage analytics', 'Webhook notifications'],
    cta: 'Start Growing',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    priceNote: '/month',
    rateLimit: '600 req/min',
    quota: '500,000/mo',
    features: ['Everything in Growth', 'Dedicated support', 'Custom SLA', 'Bulk data export', 'White-label widget'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const SAMPLE_RESPONSE = `{
  "ok": true,
  "data": [
    {
      "id": "a1b2c3d4...",
      "country_code": "us",
      "visa_type": "H-1B",
      "title": "H-1B Specialty Occupation",
      "description": "For workers in specialty occupations...",
      "requirements": {
        "sponsorship_required": true,
        "min_education": "Bachelor's degree"
      },
      "processing_time": "3-6 months",
      "cost": "$460 + $500 fraud fee",
      "validity": "3 years",
      "source_url": "https://uscis.gov/...",
      "last_scraped_at": "2026-03-28T..."
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 12,
    "total_pages": 1,
    "has_next": false
  }
}`;

/* ─── Types ─── */
type AuthState = 'loading' | 'anonymous' | 'no-recruiter' | 'free-plan' | 'ready';
interface ExistingKey {
  id: string;
  name: string;
  key_prefix: string;
  tier: string;
  requests_this_month: number;
  monthly_quota: number;
  is_active: boolean;
}

/* ─── API Key Panel (inline on the developers page) ─── */
function GetApiKeyPanel({ locale, authState, existingKeys, onKeyCreated }: {
  locale: string;
  authState: AuthState;
  existingKeys: ExistingKey[];
  onKeyCreated: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'naming' | 'creating' | 'created' | 'error'>('idle');
  const [keyName, setKeyName] = useState('');
  const [keyTier, setKeyTier] = useState<'starter' | 'growth' | 'enterprise'>('starter');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleCreate() {
    setPhase('creating');
    setError('');
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Default', tier: keyTier }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreatedKey(data.key);
        setPhase('created');
        onKeyCreated();
      } else {
        setError(data.error || 'Failed to create key');
        setPhase('error');
      }
    } catch {
      setError('Network error. Please try again.');
      setPhase('error');
    }
  }

  // Auto-focus name input when entering naming phase
  useEffect(() => {
    if (phase === 'naming') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  const activeKeys = existingKeys.filter(k => k.is_active);

  /* ── Anonymous: sign up CTA ── */
  if (authState === 'anonymous') {
    return (
      <div className="bg-gradient-to-br from-indigo-600/15 to-purple-600/15 ring-1 ring-indigo-500/30 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30 flex items-center justify-center flex-shrink-0">
            <Icon icon="solar:key-bold" className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Get Your API Key</h3>
            <p className="text-white/50 text-sm mb-4">
              Create a free account to generate API keys. Takes under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${locale}/auth?tab=signup&role=recruiter&redirect=/developers`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:user-plus-bold" className="w-4 h-4" />
                Sign Up Free
              </Link>
              <Link
                href={`/${locale}/auth?tab=login&redirect=/developers`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 ring-1 ring-white/20 hover:ring-white/40 text-white/70 hover:text-white text-sm rounded-xl transition-all"
              >
                Already have an account? Log in
              </Link>
            </div>
          </div>
        </div>

        {/* Steps preview */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-4">
          {[
            { step: '1', icon: 'solar:user-plus-linear', text: 'Create account' },
            { step: '2', icon: 'solar:key-linear', text: 'Generate API key' },
            { step: '3', icon: 'solar:rocket-linear', text: 'Start building' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-8 h-8 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center mx-auto mb-2">
                <Icon icon={s.icon} className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xs text-white/40">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── No recruiter profile ── */
  if (authState === 'no-recruiter') {
    return (
      <div className="bg-[#0F172A] ring-1 ring-amber-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Icon icon="solar:info-circle-bold" className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-1">Recruiter Account Required</h3>
            <p className="text-white/50 text-sm mb-3">
              API keys are available for recruiter accounts. Complete your recruiter profile to get started.
            </p>
            <Link
              href={`/${locale}/auth?tab=signup&role=recruiter&redirect=/developers`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium rounded-lg transition-all"
            >
              <Icon icon="solar:buildings-linear" className="w-4 h-4" />
              Set Up Recruiter Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Free plan: upgrade prompt ── */
  if (authState === 'free-plan') {
    return (
      <div className="bg-[#0F172A] ring-1 ring-purple-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Icon icon="solar:crown-bold" className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-white mb-1">Upgrade to Access the API</h3>
            <p className="text-white/50 text-sm mb-3">
              API keys are included with any paid plan. Upgrade to Pro ($99/mo) or higher to start using the Visa Data API.
            </p>
            <Link
              href={`/${locale}/dashboard/recruiter/billing`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-all hover:scale-[1.02]"
            >
              <Icon icon="solar:crown-linear" className="w-4 h-4" />
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading state ── */
  if (authState === 'loading') {
    return (
      <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Ready: key creation flow ── */
  return (
    <div className="bg-[#0F172A] ring-1 ring-indigo-500/20 rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 ring-1 ring-indigo-500/30 flex items-center justify-center">
            <Icon icon="solar:key-bold" className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Your API Keys</h3>
            <p className="text-xs text-white/30">
              {activeKeys.length}/5 active keys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/dashboard/recruiter/api-keys`}
            className="text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            <Icon icon="solar:settings-linear" className="w-3.5 h-3.5" />
            Manage
          </Link>
          <Link
            href={`/${locale}/dashboard/recruiter/api-keys/analytics`}
            className="text-xs text-purple-400/70 hover:text-purple-400 transition-colors flex items-center gap-1"
          >
            <Icon icon="solar:chart-2-linear" className="w-3.5 h-3.5" />
            Analytics
          </Link>
        </div>
      </div>

      {/* Existing keys summary */}
      {activeKeys.length > 0 && phase === 'idle' && (
        <div className="px-6 py-3 border-b border-white/5">
          <div className="space-y-2">
            {activeKeys.slice(0, 3).map(key => {
              const pct = key.monthly_quota > 0 ? Math.min((key.requests_this_month / key.monthly_quota) * 100, 100) : 0;
              return (
                <div key={key.id} className="flex items-center gap-3 text-sm">
                  <code className="text-xs text-white/40 font-mono w-28">{key.key_prefix}</code>
                  <span className="text-white/60 flex-1 truncate">{key.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 uppercase font-semibold ${
                    key.tier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 ring-purple-500/20'
                      : key.tier === 'growth' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  }`}>{key.tier}</span>
                  <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-8 text-right">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
            {activeKeys.length > 3 && (
              <p className="text-xs text-white/20 text-center">
                +{activeKeys.length - 3} more — <Link href={`/${locale}/dashboard/recruiter/api-keys`} className="text-indigo-400/50 hover:text-indigo-400">view all</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Body content */}
      <div className="p-6">
        {/* Phase: idle — show Create button */}
        {phase === 'idle' && (
          <div className="text-center">
            {activeKeys.length >= 5 ? (
              <p className="text-sm text-white/40">
                Maximum 5 active keys reached.{' '}
                <Link href={`/${locale}/dashboard/recruiter/api-keys`} className="text-indigo-400 hover:underline">Revoke a key</Link> to create a new one.
              </p>
            ) : (
              <button
                onClick={() => setPhase('naming')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:add-circle-bold" className="w-5 h-5" />
                {activeKeys.length === 0 ? 'Create Your First API Key' : 'Create New Key'}
              </button>
            )}
          </div>
        )}

        {/* Phase: naming — configure key */}
        {phase === 'naming' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
            <div className="mb-4">
              <label className="block text-xs font-medium text-white/50 mb-1.5">Key Name</label>
              <input
                ref={inputRef}
                type="text"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
                placeholder="e.g. Production, Staging, Widget"
                className="w-full bg-white/5 ring-1 ring-white/10 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                maxLength={64}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-white/50 mb-2">API Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'starter' as const, label: 'Starter', rate: '30/min', quota: '1K/mo', price: 'Included' },
                  { key: 'growth' as const, label: 'Growth', rate: '120/min', quota: '25K/mo', price: '$49/mo' },
                  { key: 'enterprise' as const, label: 'Enterprise', rate: '600/min', quota: '500K/mo', price: '$199/mo' },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setKeyTier(t.key)}
                    className={`text-left p-3 rounded-xl ring-1 transition-all ${
                      keyTier === t.key
                        ? t.key === 'enterprise' ? 'bg-purple-500/10 ring-purple-500/30 ring-2'
                          : t.key === 'growth' ? 'bg-blue-500/10 ring-blue-500/30 ring-2'
                            : 'bg-emerald-500/10 ring-emerald-500/30 ring-2'
                        : 'ring-white/10 hover:ring-white/20'
                    }`}
                  >
                    <p className={`text-xs font-bold ${
                      keyTier === t.key
                        ? t.key === 'enterprise' ? 'text-purple-400'
                          : t.key === 'growth' ? 'text-blue-400'
                            : 'text-emerald-400'
                        : 'text-white/60'
                    }`}>{t.label}</p>
                    <p className="text-[10px] text-white/30 mt-1">{t.rate} &middot; {t.quota}</p>
                    <p className={`text-[10px] font-semibold mt-1 ${keyTier === t.key ? 'text-white/70' : 'text-white/30'}`}>{t.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('idle'); setKeyName(''); }}
                className="flex-1 py-2.5 rounded-xl ring-1 ring-white/10 hover:ring-white/20 text-white/50 hover:text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Icon icon="solar:key-bold" className="w-4 h-4" />
                Generate Key
              </button>
            </div>
          </div>
        )}

        {/* Phase: creating — spinner */}
        {phase === 'creating' && (
          <div className="text-center py-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/50">Generating your API key...</p>
          </div>
        )}

        {/* Phase: created — show key */}
        {phase === 'created' && createdKey && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="font-semibold text-emerald-400 text-sm">API Key Created</p>
            </div>

            <div className="bg-emerald-500/5 ring-1 ring-emerald-500/20 rounded-xl p-4 mb-3">
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-wider font-semibold mb-2">
                Your API Key (shown once)
              </p>
              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3">
                <code className="text-sm text-emerald-300 font-mono flex-1 break-all select-all">{createdKey}</code>
                <button
                  onClick={copyKey}
                  className="flex-shrink-0 p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all"
                >
                  <Icon
                    icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                    className="w-4 h-4"
                  />
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-400/70 mt-2 flex items-center gap-1">
                  <Icon icon="solar:check-circle-linear" className="w-3 h-3" />
                  Copied to clipboard
                </p>
              )}
            </div>

            <div className="bg-amber-500/5 ring-1 ring-amber-500/15 rounded-lg px-3 py-2 mb-4">
              <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                <Icon icon="solar:danger-triangle-linear" className="w-3.5 h-3.5 flex-shrink-0" />
                Save this key securely. It cannot be retrieved after you leave this page.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('idle'); setCreatedKey(null); setKeyName(''); }}
                className="flex-1 py-2.5 rounded-xl ring-1 ring-white/10 hover:ring-white/20 text-white/50 hover:text-white text-sm font-medium transition-all"
              >
                Done
              </button>
              <Link
                href={`/${locale}/dashboard/recruiter/api-keys`}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              >
                <Icon icon="solar:settings-linear" className="w-3.5 h-3.5" />
                Manage Keys
              </Link>
            </div>
          </div>
        )}

        {/* Phase: error */}
        {phase === 'error' && (
          <div style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
            <div className="bg-red-500/10 ring-1 ring-red-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 text-red-400" />
                <p className="text-sm font-semibold text-red-400">Failed to create key</p>
              </div>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase('idle')}
                className="flex-1 py-2.5 rounded-xl ring-1 ring-white/10 hover:ring-white/20 text-white/50 hover:text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── API Playground ─── */
function ApiPlayground() {
  const [endpoint, setEndpoint] = useState('/v1/visa/countries');
  const [apiKey, setApiKey] = useState('');
  const [country, setCountry] = useState('us');
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  async function runRequest() {
    if (!apiKey.trim()) return;
    setRunning(true);
    setResponse(null);
    const start = performance.now();

    let url = endpoint;
    if (endpoint === '/v1/visa/rules') url += `?country=${country}`;
    else if (endpoint === '/v1/visa/rules/:country') url = `/v1/visa/rules/${country}`;

    try {
      const res = await fetch(`/api${url}`, {
        headers: { 'X-API-Key': apiKey },
      });
      const elapsed = Math.round(performance.now() - start);
      const data = await res.json();
      setResponseStatus(res.status);
      setResponseTime(elapsed);
      setResponse(JSON.stringify(data, null, 2));
    } catch {
      setResponseStatus(0);
      setResponseTime(null);
      setResponse('{"error": "Network error — could not reach the API"}');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mb-16">
      <h2 className="text-xl font-bold text-white mb-2">API Playground</h2>
      <p className="text-white/40 text-sm mb-6">Test endpoints with your API key right here.</p>

      <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1">Endpoint</label>
              <select
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                className="w-full bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
              >
                {ENDPOINTS.map(ep => (
                  <option key={ep.path} value={ep.path}>
                    {ep.method} {ep.path}
                  </option>
                ))}
              </select>
            </div>
            {endpoint !== '/v1/visa/countries' && (
              <div className="w-full sm:w-28">
                <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1">Country</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  {['us','ca','gb','de','fr','es','it','nl','ch','se','dk','no','fi','pl','cz','ro','jp','kr','in','br','ar','mx','vn','ph','cn','ie','pt','be','at'].map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-white/30 uppercase tracking-wider mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="hm_live_..."
                className="w-full bg-white/5 ring-1 ring-white/10 focus:ring-indigo-500/50 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-white/15 outline-none transition-all"
                onKeyDown={e => e.key === 'Enter' && runRequest()}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runRequest}
                disabled={running || !apiKey.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-white/20 text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2"
              >
                {running ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon icon="solar:play-bold" className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Response */}
        <div className="relative">
          {response !== null && (
            <div className="px-5 py-2 border-b border-white/5 flex items-center gap-3 text-xs">
              <span className={`px-2 py-0.5 rounded font-bold ${
                responseStatus && responseStatus < 300 ? 'bg-emerald-500/15 text-emerald-400'
                  : responseStatus && responseStatus < 500 ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-red-500/15 text-red-400'
              }`}>
                {responseStatus || 'ERR'}
              </span>
              {responseTime !== null && (
                <span className="text-white/30">{responseTime}ms</span>
              )}
            </div>
          )}
          <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed max-h-80 overflow-y-auto">
            <code className={response !== null ? (responseStatus && responseStatus < 300 ? 'text-emerald-300' : 'text-red-300') : 'text-white/20'}>
              {response ?? '// Response will appear here after you send a request'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Component ─── */
export default function DevApiDocs({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_EXAMPLES>('curl');
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [existingKeys, setExistingKeys] = useState<ExistingKey[]>([]);

  /* ── Check auth + recruiter status on mount ── */
  const checkAuth = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthState('anonymous'); return; }

      // Check if they have a recruiter profile
      const res = await fetch('/api/v1/keys');
      if (res.status === 401) { setAuthState('anonymous'); return; }

      const data = await res.json();
      if (data.error) {
        // No recruiter profile found
        setAuthState('no-recruiter');
        return;
      }
      setExistingKeys(data.keys || []);
      // Check if recruiter is on free plan
      if (data.tier === 'free' || !data.tier) {
        setAuthState('free-plan');
        return;
      }
      setAuthState('ready');
    } catch {
      setAuthState('anonymous');
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  function copyCode(code: string, blockId: string) {
    navigator.clipboard.writeText(code);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
              animation: 'glowPulse 4s ease-in-out infinite',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20 text-indigo-400 text-xs font-medium mb-4"
              style={{ animation: 'blurReveal 0.6s ease-out' }}
            >
              <Icon icon="solar:code-square-bold" className="w-3.5 h-3.5" />
              Visa Data API
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ animation: 'blurReveal 0.6s ease-out 0.1s both' }}
            >
              Visa intelligence,{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
                style={{ backgroundSize: '200% 200%', animation: 'gradientShift 3s ease infinite' }}
              >
                one API call
              </span>
            </h1>

            <p className="text-white/50 max-w-xl mx-auto text-lg mb-8"
              style={{ animation: 'blurReveal 0.6s ease-out 0.2s both' }}
            >
              29 countries. Real-time updates from official sources.
              Embeddable widget or REST API. Ship visa features in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4"
              style={{ animation: 'blurReveal 0.6s ease-out 0.3s both' }}
            >
              <a
                href="#get-api-key"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:key-bold" className="w-5 h-5" />
                Get API Key
              </a>
              <a
                href="#endpoints"
                className="inline-flex items-center gap-2 px-6 py-3 ring-1 ring-white/20 hover:ring-white/40 text-white/70 hover:text-white rounded-xl transition-all"
              >
                <Icon icon="solar:document-text-linear" className="w-5 h-5" />
                View Docs
              </a>
            </div>
          </div>
        </div>

        {/* ── Get API Key (inline panel) ── */}
        <section id="get-api-key" className="mb-16 scroll-mt-8" style={{ animation: 'blurReveal 0.6s ease-out 0.35s both' }}>
          <h2 className="text-xl font-bold text-white mb-6">Get API Key</h2>
          <GetApiKeyPanel
            locale={locale}
            authState={authState}
            existingKeys={existingKeys}
            onKeyCreated={checkAuth}
          />
        </section>

        {/* ── Quick Start ── */}
        <section className="mb-16" style={{ animation: 'blurReveal 0.8s ease-out 0.4s both' }}>
          <h2 className="text-xl font-bold text-white mb-6">Quick Start</h2>

          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-4 w-fit">
            {(Object.keys(CODE_EXAMPLES) as (keyof typeof CODE_EXAMPLES)[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <Icon icon={CODE_EXAMPLES[key].icon} className="w-4 h-4" />
                {CODE_EXAMPLES[key].label}
              </button>
            ))}
          </div>

          <div className="relative group">
            <pre className="bg-[#0a0e1a] ring-1 ring-white/10 rounded-xl p-6 overflow-x-auto text-sm font-mono text-indigo-300 leading-relaxed">
              <code>{CODE_EXAMPLES[activeTab].code}</code>
            </pre>
            <button
              onClick={() => copyCode(CODE_EXAMPLES[activeTab].code, 'quickstart')}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <Icon
                icon={copiedBlock === 'quickstart' ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                className="w-4 h-4"
              />
            </button>
          </div>
        </section>

        {/* ── Auth ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-4">Authentication</h2>
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
            <p className="text-white/60 text-sm mb-4">
              All API requests require an API key. Pass it via any of these methods:
            </p>
            <div className="space-y-3">
              {[
                { label: 'Header (recommended)', code: 'X-API-Key: hm_live_YOUR_KEY' },
                { label: 'Bearer token', code: 'Authorization: Bearer hm_live_YOUR_KEY' },
                { label: 'Query parameter', code: '?api_key=hm_live_YOUR_KEY' },
              ].map((m) => (
                <div key={m.label} className="flex items-start gap-3">
                  <span className="text-xs text-white/30 w-32 flex-shrink-0 pt-1">{m.label}</span>
                  <code className="text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{m.code}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Endpoints ── */}
        <section id="endpoints" className="mb-16 scroll-mt-8">
          <h2 className="text-xl font-bold text-white mb-6">Endpoints</h2>
          <div className="space-y-3">
            {ENDPOINTS.map((ep, i) => (
              <div
                key={ep.path}
                className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl overflow-hidden hover:ring-indigo-500/30 transition-all"
              >
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left"
                >
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20">
                    {ep.method}
                  </span>
                  <code className="text-sm text-white/80 font-mono">{ep.path}</code>
                  <span className="flex-1 text-sm text-white/30 truncate ml-2">{ep.desc}</span>
                  <Icon
                    icon="solar:alt-arrow-down-linear"
                    className={`w-4 h-4 text-white/30 transition-transform ${expandedEndpoint === i ? 'rotate-180' : ''}`}
                  />
                </button>

                {expandedEndpoint === i && (
                  <div className="px-6 pb-5 border-t border-white/5 pt-4"
                    style={{ animation: 'fadeSlideDown 0.2s ease-out' }}
                  >
                    <p className="text-sm text-white/50 mb-4">{ep.desc}</p>
                    {ep.params.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Parameters</p>
                        {ep.params.map((p) => (
                          <div key={p.name} className="flex items-start gap-3 text-sm">
                            <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-xs font-mono">{p.name}</code>
                            <span className="text-white/20 text-xs pt-0.5">{p.type}</span>
                            <span className="text-white/50 text-xs pt-0.5">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Response Example ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Response Format</h2>
          <div className="relative group">
            <pre className="bg-[#0a0e1a] ring-1 ring-white/10 rounded-xl p-6 overflow-x-auto text-sm font-mono text-indigo-300 leading-relaxed">
              <code>{SAMPLE_RESPONSE}</code>
            </pre>
            <button
              onClick={() => copyCode(SAMPLE_RESPONSE, 'response')}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <Icon
                icon={copiedBlock === 'response' ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                className="w-4 h-4"
              />
            </button>
          </div>
        </section>

        {/* ── API Playground ── */}
        <ApiPlayground />

        {/* ── Widget embed ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-4">Embeddable Widget</h2>
          <p className="text-white/50 text-sm mb-6">
            Drop a single script tag to show visa data on any website. Supports dark and light themes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative group">
              <pre className="bg-[#0a0e1a] ring-1 ring-white/10 rounded-xl p-6 overflow-x-auto text-xs font-mono text-indigo-300 leading-relaxed h-full">
                <code>{CODE_EXAMPLES.widget.code}</code>
              </pre>
              <button
                onClick={() => copyCode(CODE_EXAMPLES.widget.code, 'widget')}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <Icon
                  icon={copiedBlock === 'widget' ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                  className="w-4 h-4"
                />
              </button>
            </div>

            <div className="bg-[#0f172a] ring-1 ring-white/10 rounded-xl overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
                <span className="font-semibold text-sm">Visa Rules — US</span>
                <span className="text-xs text-white/30">3 types</span>
              </div>
              {[
                { title: 'H-1B Specialty Occupation', type: 'H-1B', time: '3-6 months', cost: '$460' },
                { title: 'L-1 Intracompany Transfer', type: 'L-1', time: '2-4 months', cost: '$460' },
                { title: 'O-1 Extraordinary Ability', type: 'O-1', time: '2-3 months', cost: '$460' },
              ].map((r) => (
                <div key={r.type} className="px-5 py-3 border-b border-white/5">
                  <p className="text-sm font-medium mb-1">{r.title}</p>
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 mb-2">{r.type}</span>
                  <div className="flex gap-4 text-xs text-white/40">
                    <span>{r.time}</span>
                    <span>{r.cost}</span>
                  </div>
                </div>
              ))}
              <div className="px-5 py-2 text-center text-[10px] text-white/20">
                Powered by HireMatch
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="mb-16" id="pricing">
          <h2 className="text-xl font-bold text-white mb-2 text-center">API Pricing</h2>
          <p className="text-white/40 text-sm text-center mb-8">
            Start free with any paid HireMatch plan. Scale as you grow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 transition-all hover:scale-[1.02] ${
                  tier.highlight
                    ? 'bg-gradient-to-br from-indigo-600/20 to-purple-600/20 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'bg-[#0F172A] ring-1 ring-white/10'
                }`}
              >
                {tier.highlight && (
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500 text-white mb-3">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-sm text-white/40 ml-1">{tier.priceNote}</span>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-white/30 text-xs">Rate Limit</p>
                    <p className="text-white font-semibold">{tier.rateLimit}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <p className="text-white/30 text-xs">Monthly Quota</p>
                    <p className="text-white font-semibold">{tier.quota}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#get-api-key"
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    tier.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'ring-1 ring-white/20 hover:ring-white/40 text-white/70 hover:text-white'
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Rate Limits + Errors ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6">Rate Limits & Errors</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-3">Rate Limit Headers</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <code className="text-indigo-400 text-xs">X-RateLimit-Remaining</code>
                  <span className="text-white/40">Requests left this minute</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-3">Error Codes</h3>
              <div className="space-y-2 text-sm">
                {[
                  { code: '401', desc: 'Invalid or missing API key' },
                  { code: '403', desc: 'Key revoked or plan required' },
                  { code: '404', desc: 'Country not found' },
                  { code: '429', desc: 'Rate limit or quota exceeded' },
                ].map((e) => (
                  <div key={e.code} className="flex justify-between">
                    <code className="text-red-400 text-xs">{e.code}</code>
                    <span className="text-white/40">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="text-center py-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                filter: 'blur(40px)',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
            />
            <div className="relative bg-[#0F172A] ring-1 ring-indigo-500/20 rounded-2xl p-8 sm:p-12">
              <h2 className="text-2xl font-bold text-white mb-3">Ready to integrate?</h2>
              <p className="text-white/40 mb-6 max-w-md mx-auto">
                Get your API key in under 2 minutes. Start building visa features today.
              </p>
              <a
                href="#get-api-key"
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:rocket-bold" className="w-5 h-5" />
                Get Started Free
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
