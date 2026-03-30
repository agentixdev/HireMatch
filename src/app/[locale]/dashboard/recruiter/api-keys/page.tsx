'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

/* ─── Types ─── */
interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  tier: 'starter' | 'growth' | 'enterprise';
  rate_limit_per_min: number;
  monthly_quota: number;
  requests_this_month: number;
  quota_reset_at: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/* ─── Animation variants ─── */
const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

const TIER_COLORS = {
  starter: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  growth: { bg: 'bg-blue-500/10', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  enterprise: { bg: 'bg-purple-500/10', text: 'text-purple-400', ring: 'ring-purple-500/20' },
};

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://www.hirematch.com';

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyTier, setKeyTier] = useState<'starter' | 'growth' | 'enterprise'>('starter');
  const [widgetKey, setWidgetKey] = useState<string | null>(null);
  const [widgetCountry, setWidgetCountry] = useState('us');
  const [widgetTheme, setWidgetTheme] = useState<'dark' | 'light'>('dark');

  /* ─── Auth check + fetch keys ─── */
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/keys');
      if (res.status === 401) { router.push('/auth'); return; }
      const data = await res.json();
      if (data.ok) setKeys(data.keys);
      else setError(data.error);
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  /* ─── Create key ─── */
  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName || 'Default', tier: keyTier }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewKey(data.key);
        setShowCreateModal(false);
        setKeyName('');
        await fetchKeys();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  /* ─── Revoke key ─── */
  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/v1/keys?id=${keyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        await fetchKeys();
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to revoke key');
    } finally {
      setRevoking(null);
    }
  }

  /* ─── Copy helper ─── */
  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  /* ─── Widget embed code ─── */
  function getWidgetCode(apiKey: string) {
    return `<div id="hirematch-visa"></div>
<script
  src="${SITE_URL}/embed/visa-widget.js"
  data-api-key="${apiKey}"
  data-country="${widgetCountry}"
  data-theme="${widgetTheme}">
</script>`;
  }

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <DashboardLayout role="recruiter">
      <div className="max-w-4xl mx-auto">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30 flex items-center justify-center">
                <Icon icon="solar:key-bold" className="w-5 h-5 text-indigo-400" />
              </div>
              API Keys
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Manage your Visa Data API keys and embeddable widget access.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Icon icon="solar:add-circle-bold" className="w-4 h-4" />
            Create Key
          </button>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 bg-red-500/10 ring-1 ring-red-500/20 rounded-xl flex items-center gap-3"
            >
              <Icon icon="solar:danger-triangle-bold" className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400">
                <Icon icon="solar:close-circle-linear" className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New key reveal ── */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6 p-5 bg-emerald-500/10 ring-1 ring-emerald-500/20 rounded-2xl"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-400 text-sm">API Key Created</p>
                  <p className="text-emerald-400/60 text-xs mt-0.5">
                    Copy this key now — it will not be shown again.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-3">
                <code className="text-sm text-emerald-300 font-mono flex-1 break-all">{newKey}</code>
                <button
                  onClick={() => copyText(newKey, 'newkey')}
                  className="flex-shrink-0 p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all"
                >
                  <Icon
                    icon={copied === 'newkey' ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                    className="w-4 h-4"
                  />
                </button>
              </div>

              <button
                onClick={() => setNewKey(null)}
                className="mt-3 text-xs text-emerald-400/40 hover:text-emerald-400/70 transition-colors"
              >
                Dismiss (I&apos;ve saved my key)
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Active Keys ── */}
            {activeKeys.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Icon icon="solar:key-linear" className="w-8 h-8 text-white/20" />
                </div>
                <h2 className="text-lg font-medium text-white/60 mb-2">No API keys yet</h2>
                <p className="text-white/30 text-sm mb-6">
                  Create your first API key to start using the Visa Data API.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition-all"
                >
                  <Icon icon="solar:add-circle-bold" className="w-4 h-4" />
                  Create Your First Key
                </button>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {activeKeys.map((key) => {
                  const usagePercent = key.monthly_quota > 0
                    ? Math.min((key.requests_this_month / key.monthly_quota) * 100, 100)
                    : 0;
                  const tierStyle = TIER_COLORS[key.tier];
                  const isHot = usagePercent > 80;
                  const isWarm = usagePercent > 50;

                  return (
                    <motion.div
                      key={key.id}
                      variants={cardVariants}
                      layout
                      className={`bg-[#0F172A] ring-1 rounded-2xl p-5 transition-all hover:ring-white/15 ${
                        isHot ? 'ring-red-500/20' : 'ring-white/10'
                      }`}
                      style={isHot ? { animation: 'breatheSaturation 3s ease-in-out infinite' } : undefined}
                    >
                      {/* Row 1: Name + tier + actions */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-lg ${tierStyle.bg} ring-1 ${tierStyle.ring} flex items-center justify-center`}>
                          <Icon icon="solar:key-bold" className={`w-4 h-4 ${tierStyle.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white text-sm">{key.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${tierStyle.bg} ${tierStyle.text} ring-1 ${tierStyle.ring}`}>
                              {key.tier}
                            </span>
                          </div>
                          <p className="text-xs text-white/30 font-mono mt-0.5">{key.key_prefix}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setWidgetKey(widgetKey === key.key_prefix ? null : key.key_prefix)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-all"
                            title="Widget embed code"
                          >
                            <Icon icon="solar:widget-bold" className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRevoke(key.id)}
                            disabled={revoking === key.id}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all disabled:opacity-50"
                            title="Revoke key"
                          >
                            {revoking === key.id ? (
                              <div className="w-4 h-4 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <Icon icon="solar:trash-bin-2-bold" className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Usage stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">Requests</p>
                          <p className="text-sm font-bold text-white">
                            {key.requests_this_month.toLocaleString()}
                            <span className="text-white/20 font-normal"> / {key.monthly_quota.toLocaleString()}</span>
                          </p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">Rate Limit</p>
                          <p className="text-sm font-bold text-white">{key.rate_limit_per_min}<span className="text-white/20 font-normal">/min</span></p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Used</p>
                          <p className="text-sm font-medium text-white/60">
                            {key.last_used_at
                              ? new Date(key.last_used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      {/* Row 3: Usage bar with temperature */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-white/30 uppercase tracking-wider">Monthly Usage</span>
                          <span className={`text-xs font-semibold ${
                            isHot ? 'text-red-400' : isWarm ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {usagePercent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${usagePercent}%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
                            className={`h-full rounded-full ${
                              isHot
                                ? 'bg-gradient-to-r from-red-500 to-red-400'
                                : isWarm
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                                  : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Widget embed section (expandable) */}
                      <AnimatePresence>
                        {widgetKey === key.key_prefix && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <p className="text-xs font-semibold text-white/50 mb-3 flex items-center gap-1.5">
                                <Icon icon="solar:widget-bold" className="w-3.5 h-3.5 text-indigo-400" />
                                Widget Embed Code
                              </p>

                              <div className="flex gap-3 mb-3">
                                <div>
                                  <label className="text-[10px] text-white/30 uppercase tracking-wider">Country</label>
                                  <select
                                    value={widgetCountry}
                                    onChange={(e) => setWidgetCountry(e.target.value)}
                                    className="block mt-1 bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                                  >
                                    {['us','ca','gb','de','fr','es','it','nl','ch','jp','kr','in','br','au'].map((c) => (
                                      <option key={c} value={c}>{c.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/30 uppercase tracking-wider">Theme</label>
                                  <select
                                    value={widgetTheme}
                                    onChange={(e) => setWidgetTheme(e.target.value as 'dark' | 'light')}
                                    className="block mt-1 bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                                  >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                  </select>
                                </div>
                              </div>

                              <div className="relative group">
                                <pre className="bg-black/30 rounded-lg p-3 text-xs font-mono text-indigo-300 overflow-x-auto leading-relaxed">
                                  <code>{getWidgetCode(key.key_prefix.replace('...', 'YOUR_FULL_KEY'))}</code>
                                </pre>
                                <button
                                  onClick={() => copyText(getWidgetCode(key.key_prefix.replace('...', 'YOUR_FULL_KEY')), `widget-${key.id}`)}
                                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Icon
                                    icon={copied === `widget-${key.id}` ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                                    className="w-3.5 h-3.5"
                                  />
                                </button>
                              </div>

                              <p className="text-[10px] text-white/20 mt-2">
                                Replace YOUR_FULL_KEY with your actual API key shown at creation time.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* ── Revoked Keys ── */}
            {revokedKeys.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white/30 mb-3">Revoked Keys</h3>
                <div className="space-y-2">
                  {revokedKeys.map((key) => (
                    <div
                      key={key.id}
                      className="bg-white/[0.02] ring-1 ring-white/5 rounded-xl px-5 py-3 flex items-center gap-3 opacity-50"
                    >
                      <Icon icon="solar:key-linear" className="w-4 h-4 text-white/20" />
                      <span className="text-sm text-white/40 font-mono">{key.key_prefix}</span>
                      <span className="text-xs text-white/20">{key.name}</span>
                      <span className="ml-auto text-xs text-red-400/50">
                        Revoked {key.revoked_at ? new Date(key.revoked_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quick Links ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 flex items-center gap-4 justify-center"
            >
              <Link
                href="/dashboard/recruiter/api-keys/analytics"
                className="inline-flex items-center gap-1.5 text-sm text-purple-400/70 hover:text-purple-400 transition-colors"
              >
                <Icon icon="solar:chart-2-linear" className="w-4 h-4" />
                Analytics
              </Link>
              <span className="text-white/10">|</span>
              <Link
                href="/developers"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-400/70 hover:text-indigo-400 transition-colors"
              >
                <Icon icon="solar:document-text-linear" className="w-4 h-4" />
                API Docs
              </Link>
              <span className="text-white/10">|</span>
              <Link
                href="/dashboard/recruiter/billing"
                className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <Icon icon="solar:tag-price-linear" className="w-4 h-4" />
                Upgrade Plan
              </Link>
            </motion.div>
          </>
        )}

        {/* ── Create Key Modal ── */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-[#161929] ring-1 ring-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 ring-1 ring-indigo-500/30 flex items-center justify-center">
                    <Icon icon="solar:key-bold" className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Create API Key</h2>
                    <p className="text-xs text-white/40">The key will be shown once after creation.</p>
                  </div>
                </div>

                {/* Key name */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Key Name</label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Production, Staging, Widget"
                    className="w-full bg-white/5 ring-1 ring-white/10 focus:ring-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition-all"
                    maxLength={64}
                  />
                </div>

                {/* Tier selection */}
                <div className="mb-6">
                  <label className="block text-xs font-medium text-white/50 mb-2">API Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'starter' as const, label: 'Starter', rate: '30/min', quota: '1K/mo', price: 'Free' },
                      { key: 'growth' as const, label: 'Growth', rate: '120/min', quota: '25K/mo', price: '$49/mo' },
                      { key: 'enterprise' as const, label: 'Enterprise', rate: '600/min', quota: '500K/mo', price: '$199/mo' },
                    ]).map((t) => {
                      const style = TIER_COLORS[t.key];
                      return (
                        <button
                          key={t.key}
                          onClick={() => setKeyTier(t.key)}
                          className={`text-left p-3 rounded-xl ring-1 transition-all ${
                            keyTier === t.key
                              ? `${style.bg} ${style.ring} ring-2`
                              : 'ring-white/10 hover:ring-white/20'
                          }`}
                        >
                          <p className={`text-xs font-bold ${keyTier === t.key ? style.text : 'text-white/60'}`}>
                            {t.label}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">{t.rate}</p>
                          <p className="text-[10px] text-white/30">{t.quota}</p>
                          <p className={`text-[10px] font-semibold mt-1 ${keyTier === t.key ? style.text : 'text-white/40'}`}>
                            {t.price}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl ring-1 ring-white/10 hover:ring-white/20 text-white/50 hover:text-white text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Icon icon="solar:key-bold" className="w-4 h-4" />
                        Create Key
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
