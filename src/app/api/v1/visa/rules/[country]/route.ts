import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { extractApiKey, validateApiKey, logApiUsage } from '@/lib/api-keys';

/**
 * GET /api/v1/visa/rules/:country
 *
 * Returns all visa rules for a specific country.
 * Requires API key authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ country: string }> },
) {
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
    const { country } = await params;
    const countryCode = country.toLowerCase();
    const supabase = await createServiceClient();

    const { data: rules, error } = await supabase
      .from('visa_rules')
      .select('*')
      .eq('country_code', countryCode)
      .order('visa_type');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch visa rules' }, { status: 500 });
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json(
        { error: `No visa rules found for country: ${countryCode}` },
        { status: 404 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      data: rules,
      country: countryCode,
      total: rules.length,
      meta: { api_version: 'v1', request_id: crypto.randomUUID() },
    });

    res.headers.set('X-RateLimit-Remaining', String(auth.data.remaining));

    await logApiUsage(auth.data.keyRecord.id, `/v1/visa/rules/${countryCode}`, 200, Date.now() - start, request);
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
