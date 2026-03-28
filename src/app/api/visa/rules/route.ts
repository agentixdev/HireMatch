import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

/**
 * Public GET endpoint for reading visa rules.
 *
 * Query params:
 *   - country: filter by country code (e.g. "us")
 *   - type: filter by visa type (e.g. "H-1B")
 *   - sponsorship: filter by sponsorship_required in requirements ("true"/"false")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const type = searchParams.get('type');
    const sponsorship = searchParams.get('sponsorship');

    const supabase = await createServiceClient();
    let query = supabase.from('visa_rules').select('*');

    if (country) {
      query = query.eq('country_code', country.toLowerCase());
    }

    if (type) {
      query = query.eq('visa_type', type);
    }

    const { data: rules, error } = await query.order('country_code').order('visa_type');

    if (error) {
      console.error('Visa rules query error:', error);
      return NextResponse.json({ error: 'Failed to fetch visa rules' }, { status: 500 });
    }

    let filtered = rules || [];

    // Filter by sponsorship_required in the requirements JSONB
    if (sponsorship !== null) {
      const wantSponsorship = sponsorship === 'true';
      filtered = filtered.filter((rule: Record<string, unknown>) => {
        const req = rule.requirements as Record<string, unknown> | null;
        return req?.sponsorship_required === wantSponsorship;
      });
    }

    return NextResponse.json({
      ok: true,
      rules: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error('Visa rules endpoint error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
