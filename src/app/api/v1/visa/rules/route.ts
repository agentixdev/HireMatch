import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { extractApiKey, validateApiKey, logApiUsage } from '@/lib/api-keys';

/**
 * GET /api/v1/visa/rules
 *
 * Returns visa rules with filtering, pagination, and field selection.
 * Requires API key authentication.
 *
 * Query params:
 *   - country: filter by country code (e.g. "us", "gb")
 *   - type: filter by visa type (e.g. "H-1B")
 *   - sponsorship: "true" or "false"
 *   - fields: comma-separated list of fields to include
 *   - page: page number (default 1)
 *   - per_page: results per page (default 50, max 200)
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
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const type = searchParams.get('type');
    const sponsorship = searchParams.get('sponsorship');
    const fieldsParam = searchParams.get('fields');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') || '50')));

    const supabase = await createServiceClient();

    // Build select fields
    const allowedFields = [
      'id', 'country_code', 'visa_type', 'title', 'description',
      'requirements', 'processing_time', 'cost', 'validity',
      'source_url', 'last_scraped_at', 'updated_at',
    ];
    let selectFields = '*';
    if (fieldsParam) {
      const requested = fieldsParam.split(',').map((f) => f.trim()).filter((f) => allowedFields.includes(f));
      if (requested.length > 0) selectFields = requested.join(',');
    }

    let query = supabase.from('visa_rules').select(selectFields, { count: 'exact' });

    if (country) query = query.eq('country_code', country.toLowerCase());
    if (type) query = query.ilike('visa_type', `%${type}%`);

    // Pagination
    const from = (page - 1) * perPage;
    query = query.order('country_code').order('visa_type').range(from, from + perPage - 1);

    const { data: rules, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch visa rules' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filtered: any[] = rules || [];

    // Post-filter sponsorship (JSONB field)
    if (sponsorship === 'true' || sponsorship === 'false') {
      const want = sponsorship === 'true';
      filtered = filtered.filter((r) => {
        const req = r.requirements as Record<string, unknown> | null;
        return req?.sponsorship_required === want;
      });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / perPage);

    const res = NextResponse.json({
      ok: true,
      data: filtered,
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
      },
      meta: { api_version: 'v1', request_id: crypto.randomUUID() },
    });

    res.headers.set('X-RateLimit-Remaining', String(auth.data.remaining));

    await logApiUsage(auth.data.keyRecord.id, '/v1/visa/rules', 200, Date.now() - start, request);
    return res;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
