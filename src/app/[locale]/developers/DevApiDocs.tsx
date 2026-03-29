'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';

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

export default function DevApiDocs({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<keyof typeof CODE_EXAMPLES>('curl');
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);

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
          {/* Animated gradient orb */}
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
              <Link
                href={`/${locale}/auth?tab=signup&role=recruiter`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:key-bold" className="w-5 h-5" />
                Get API Key
              </Link>
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

        {/* ── Quick Start ── */}
        <section className="mb-16" style={{ animation: 'blurReveal 0.8s ease-out 0.4s both' }}>
          <h2 className="text-xl font-bold text-white mb-6">Quick Start</h2>

          {/* Language tabs */}
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

          {/* Code block */}
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

        {/* ── Widget embed ── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-4">Embeddable Widget</h2>
          <p className="text-white/50 text-sm mb-6">
            Drop a single script tag to show visa data on any website. Supports dark and light themes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
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

            {/* Preview mock */}
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

                <Link
                  href={`/${locale}/auth?tab=signup&role=recruiter`}
                  className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    tier.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'ring-1 ring-white/20 hover:ring-white/40 text-white/70 hover:text-white'
                  }`}
                >
                  {tier.cta}
                </Link>
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
              <Link
                href={`/${locale}/auth?tab=signup&role=recruiter`}
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon icon="solar:rocket-bold" className="w-5 h-5" />
                Get Started Free
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
