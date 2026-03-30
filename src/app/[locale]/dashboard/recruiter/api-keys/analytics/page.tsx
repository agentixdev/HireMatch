'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

/* ─── Types ─── */
interface KeyInfo { id: string; name: string; key_prefix: string; tier: string; is_active: boolean }
interface DailyEntry { date: string; total: number; by_key: Record<string, number> }
interface EndpointEntry { endpoint: string; requests: number; errors: number; error_rate: number; avg_response_ms: number }
interface Summary { total_requests: number; avg_response_ms: number; error_rate: number; top_endpoint: string | null }

interface AnalyticsData {
  keys: KeyInfo[];
  daily: DailyEntry[];
  endpoints: EndpointEntry[];
  summary: Summary;
  hourly: number[];
  period: { days: number; since: string };
}

/* ─── Animation ─── */
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

/* ─── SVG Sparkline Chart ─── */
function AreaChart({ data, width = 600, height = 180 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const padding = { top: 10, right: 10, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((v, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + chartH - (v / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  // Y-axis labels
  const yTicks = [0, Math.round(max / 2), max];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(99,102,241)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(99,102,241)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(99,102,241)" />
          <stop offset="100%" stopColor="rgb(168,85,247)" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick) => {
        const y = padding.top + chartH - (tick / max) * chartH;
        return (
          <g key={tick}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{tick}</text>
          </g>
        );
      })}

      {/* Area */}
      <motion.path
        d={areaPath}
        fill="url(#areaGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.2, duration: 1, ease: 'easeOut' }}
      />

      {/* Dots on non-zero points */}
      {points.map((p, i) => data[i] > 0 && (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="#6366f1"
          stroke="#0F172A"
          strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.02 }}
        />
      ))}
    </svg>
  );
}

/* ─── Horizontal Bar Chart ─── */
function HBarChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 font-mono truncate max-w-[200px]">{item.label}</span>
            <span className="text-xs text-white/70 font-semibold tabular-nums">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 100, damping: 20 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Heatmap Row ─── */
function HourlyHeatmap({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex gap-1">
      {data.map((v, h) => {
        const intensity = v / max;
        return (
          <motion.div
            key={h}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + h * 0.02 }}
            className="flex-1 aspect-square rounded-sm relative group cursor-default"
            style={{
              backgroundColor: intensity > 0
                ? `rgba(99, 102, 241, ${0.1 + intensity * 0.7})`
                : 'rgba(255,255,255,0.03)',
            }}
            title={`${h}:00 UTC — ${v} requests`}
          >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {h}:00 — {v}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ApiAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (selectedKey) params.set('key_id', selectedKey);
      const res = await fetch(`/api/v1/keys/analytics?${params}`);
      if (res.status === 401) { router.push('/auth'); return; }
      const json = await res.json();
      if (json.ok) setData(json);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [days, selectedKey, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ENDPOINT_COLORS = ['#6366f1', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <DashboardLayout role="recruiter">
      <div className="max-w-5xl mx-auto">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/dashboard/recruiter/api-keys"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 ring-1 ring-purple-500/30 flex items-center justify-center">
                  <Icon icon="solar:chart-2-bold" className="w-5 h-5 text-purple-400" />
                </div>
                API Analytics
              </h1>
            </div>
            <p className="text-white/40 text-sm ml-[52px]">Monitor your API usage, performance, and errors.</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {data && data.keys.length > 1 && (
              <select
                value={selectedKey || ''}
                onChange={(e) => setSelectedKey(e.target.value || null)}
                className="bg-white/5 ring-1 ring-white/10 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">All Keys</option>
                {data.keys.map((k) => (
                  <option key={k.id} value={k.id}>{k.name} ({k.key_prefix})</option>
                ))}
              </select>
            )}
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    days === d
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-white/30">Failed to load analytics</div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                {
                  label: 'Total Requests',
                  value: data.summary.total_requests.toLocaleString(),
                  icon: 'solar:graph-up-bold',
                  color: 'text-indigo-400',
                  bg: 'bg-indigo-500/10',
                  ring: 'ring-indigo-500/20',
                },
                {
                  label: 'Avg Response',
                  value: `${data.summary.avg_response_ms}ms`,
                  icon: 'solar:clock-circle-bold',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  ring: 'ring-blue-500/20',
                },
                {
                  label: 'Error Rate',
                  value: `${data.summary.error_rate}%`,
                  icon: 'solar:danger-triangle-bold',
                  color: data.summary.error_rate > 5 ? 'text-red-400' : 'text-emerald-400',
                  bg: data.summary.error_rate > 5 ? 'bg-red-500/10' : 'bg-emerald-500/10',
                  ring: data.summary.error_rate > 5 ? 'ring-red-500/20' : 'ring-emerald-500/20',
                },
                {
                  label: 'Top Endpoint',
                  value: data.summary.top_endpoint?.replace('/v1/visa/', '/') || '—',
                  icon: 'solar:routing-bold',
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                  ring: 'ring-purple-500/20',
                },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={cardVariants}
                  className={`${stat.bg} ring-1 ${stat.ring} rounded-xl p-4`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon={stat.icon} className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Requests Over Time Chart ── */}
            <motion.div variants={cardVariants} className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Icon icon="solar:graph-up-linear" className="w-4 h-4 text-indigo-400" />
                  Requests Over Time
                </h2>
                <span className="text-[10px] text-white/30">Last {days} days</span>
              </div>

              {data.daily.every((d) => d.total === 0) ? (
                <div className="flex items-center justify-center py-12 text-white/20 text-sm">
                  <Icon icon="solar:chart-2-linear" className="w-5 h-5 mr-2" />
                  No API requests yet
                </div>
              ) : (
                <AreaChart data={data.daily.map((d) => d.total)} />
              )}

              {/* Date labels */}
              {data.daily.length > 0 && (
                <div className="flex justify-between mt-1 px-10">
                  <span className="text-[9px] text-white/20">{data.daily[0]?.date}</span>
                  <span className="text-[9px] text-white/20">{data.daily[data.daily.length - 1]?.date}</span>
                </div>
              )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* ── Endpoint Breakdown ── */}
              <motion.div variants={cardVariants} className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <Icon icon="solar:routing-linear" className="w-4 h-4 text-purple-400" />
                  Endpoints
                </h2>

                {data.endpoints.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-sm">No endpoint data</div>
                ) : (
                  <HBarChart
                    items={data.endpoints.map((ep, i) => ({
                      label: ep.endpoint.replace('/v1/visa/', '/'),
                      value: ep.requests,
                      color: ENDPOINT_COLORS[i % ENDPOINT_COLORS.length],
                    }))}
                  />
                )}

                {/* Response time table */}
                {data.endpoints.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Response Times</p>
                    <div className="space-y-1">
                      {data.endpoints.map((ep) => (
                        <div key={ep.endpoint} className="flex items-center justify-between text-xs">
                          <span className="text-white/40 font-mono truncate max-w-[160px]">
                            {ep.endpoint.replace('/v1/visa/', '/')}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={`font-semibold ${
                              ep.avg_response_ms > 1000 ? 'text-red-400' : ep.avg_response_ms > 500 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {ep.avg_response_ms}ms
                            </span>
                            {ep.error_rate > 0 && (
                              <span className="text-red-400/60 text-[10px]">{ep.error_rate}% err</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── Hourly Heatmap ── */}
              <motion.div variants={cardVariants} className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <Icon icon="solar:calendar-bold" className="w-4 h-4 text-blue-400" />
                  Peak Hours (7d)
                </h2>

                <div className="mb-2">
                  <HourlyHeatmap data={data.hourly} />
                </div>
                <div className="flex justify-between text-[8px] text-white/20 mt-1">
                  <span>0:00</span>
                  <span>6:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>23:00</span>
                </div>

                {/* Key legend */}
                {data.keys.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Active Keys</p>
                    <div className="space-y-1.5">
                      {data.keys.filter((k) => k.is_active).map((k) => (
                        <div key={k.id} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${
                            k.tier === 'enterprise' ? 'bg-purple-400' : k.tier === 'growth' ? 'bg-blue-400' : 'bg-emerald-400'
                          }`} />
                          <span className="text-white/50">{k.name}</span>
                          <span className="text-white/20 font-mono text-[10px]">{k.key_prefix}</span>
                          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                            k.tier === 'enterprise'
                              ? 'bg-purple-500/10 text-purple-400'
                              : k.tier === 'growth'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>{k.tier}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── Footer links ── */}
            <motion.div
              variants={cardVariants}
              className="flex items-center justify-center gap-4 mt-4"
            >
              <Link
                href="/dashboard/recruiter/api-keys"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-400/70 hover:text-indigo-400 transition-colors"
              >
                <Icon icon="solar:key-linear" className="w-4 h-4" />
                Manage Keys
              </Link>
              <span className="text-white/10">|</span>
              <Link
                href="/developers"
                className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
              >
                <Icon icon="solar:document-text-linear" className="w-4 h-4" />
                API Docs
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
