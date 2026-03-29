import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { extractApiKey, validateApiKey, logApiUsage } from '@/lib/api-keys';

/**
 * GET /api/v1/visa/countries
 *
 * Returns list of supported countries with visa rule counts.
 * Requires API key authentication.
 */
export async function GET(request: Request) {
  const start = Date.now();
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Pass via Authorization: Bearer <key> or X-API-Key header.' },
      { status: 401 },
    );
  }

  const auth = await validateApiKey(apiKey);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = await createServiceClient();

    const { data: rules, error } = await supabase
      .from('visa_rules')
      .select('country_code');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
    }

    // Count rules per country
    const counts: Record<string, number> = {};
    for (const r of rules || []) {
      const code = r.country_code.toLowerCase();
      counts[code] = (counts[code] || 0) + 1;
    }

    const countries = Object.entries(counts)
      .map(([code, count]) => ({ country_code: code, visa_type_count: count }))
      .sort((a, b) => a.country_code.localeCompare(b.country_code));

    const res = NextResponse.json({
      ok: true,
      data: countries,
      total: countries.length,
      meta: { api_version: 'v1', request_id: crypto.randomUUID() },
    });

    res.headers.set('X-RateLimit-Remaining', String(auth.data.remaining));

    await logApiUsage(auth.data.keyRecord.id, '/v1/visa/countries', 200, Date.now() - start, request);
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
