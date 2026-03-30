import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';

/**
 * GET /api/v1/keys/analytics
 *
 * Returns usage analytics for the authenticated recruiter's API keys.
 * Query params:
 *   - key_id: filter by specific key (optional)
 *   - days: lookback window (default 30, max 90)
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await createServiceClient();
  const { data: recruiter } = await admin
    .from('recruiters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: 'Recruiter not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('key_id');
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '30')));

  // Get recruiter's API keys
  const { data: keys } = await admin
    .from('api_keys')
    .select('id, name, key_prefix, tier, is_active')
    .eq('recruiter_id', recruiter.id);

  if (!keys || keys.length === 0) {
    return NextResponse.json({
      ok: true,
      keys: [],
      daily: [],
      endpoints: [],
      summary: { total_requests: 0, avg_response_ms: 0, error_rate: 0, top_endpoint: null },
    });
  }

  const keyIds = keyId ? [keyId] : keys.map((k) => k.id);
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Fetch usage logs
  const { data: logs } = await admin
    .from('api_usage_logs')
    .select('api_key_id, endpoint, status_code, response_time_ms, created_at')
    .in('api_key_id', keyIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const allLogs = logs || [];

  // ── Aggregate daily requests ──
  const dailyMap: Record<string, Record<string, number>> = {};
  for (const log of allLogs) {
    const day = log.created_at.slice(0, 10); // YYYY-MM-DD
    if (!dailyMap[day]) dailyMap[day] = {};
    const kId = log.api_key_id;
    dailyMap[day][kId] = (dailyMap[day][kId] || 0) + 1;
  }

  // Fill in missing days
  const daily: { date: string; total: number; by_key: Record<string, number> }[] = [];
  const cursor = new Date(since);
  const now = new Date();
  while (cursor <= now) {
    const day = cursor.toISOString().slice(0, 10);
    const byKey = dailyMap[day] || {};
    const total = Object.values(byKey).reduce((a, b) => a + b, 0);
    daily.push({ date: day, total, by_key: byKey });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ── Endpoint breakdown ──
  const endpointMap: Record<string, { count: number; errors: number; total_ms: number }> = {};
  for (const log of allLogs) {
    if (!endpointMap[log.endpoint]) {
      endpointMap[log.endpoint] = { count: 0, errors: 0, total_ms: 0 };
    }
    endpointMap[log.endpoint].count++;
    if (log.status_code >= 400) endpointMap[log.endpoint].errors++;
    if (log.response_time_ms) endpointMap[log.endpoint].total_ms += log.response_time_ms;
  }

  const endpoints = Object.entries(endpointMap)
    .map(([endpoint, stats]) => ({
      endpoint,
      requests: stats.count,
      errors: stats.errors,
      error_rate: stats.count > 0 ? +(stats.errors / stats.count * 100).toFixed(1) : 0,
      avg_response_ms: stats.count > 0 ? Math.round(stats.total_ms / stats.count) : 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  // ── Summary stats ──
  const totalRequests = allLogs.length;
  const totalErrors = allLogs.filter((l) => l.status_code >= 400).length;
  const totalMs = allLogs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0);

  const summary = {
    total_requests: totalRequests,
    avg_response_ms: totalRequests > 0 ? Math.round(totalMs / totalRequests) : 0,
    error_rate: totalRequests > 0 ? +(totalErrors / totalRequests * 100).toFixed(1) : 0,
    top_endpoint: endpoints[0]?.endpoint || null,
  };

  // ── Hourly heatmap (last 7 days) ──
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const hourly: number[] = new Array(24).fill(0);
  for (const log of allLogs) {
    const logDate = new Date(log.created_at);
    if (logDate >= sevenDaysAgo) {
      hourly[logDate.getUTCHours()]++;
    }
  }

  return NextResponse.json({
    ok: true,
    keys,
    daily,
    endpoints,
    summary,
    hourly,
    period: { days, since: since.toISOString() },
  });
}
