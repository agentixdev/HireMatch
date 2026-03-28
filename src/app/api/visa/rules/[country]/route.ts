import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { VISA_SOURCES } from '@/lib/visa-scraper';

/**
 * Country-specific visa rules endpoint.
 * GET /api/visa/rules/:country — All visa rules for a specific country.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ country: string }> }
) {
  try {
    const { country } = await params;
    const countryCode = country.toLowerCase();

    const source = VISA_SOURCES[countryCode];
    if (!source) {
      return NextResponse.json(
        { error: `Unknown country code: ${countryCode}` },
        { status: 404 }
      );
    }

    const supabase = await createServiceClient();
    const { data: rules, error } = await supabase
      .from('visa_rules')
      .select('*')
      .eq('country_code', countryCode)
      .order('visa_type');

    if (error) {
      console.error(`Visa rules query error for ${countryCode}:`, error);
      return NextResponse.json({ error: 'Failed to fetch visa rules' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      country: {
        code: countryCode,
        name: source.name,
        source_urls: source.urls,
      },
      rules: rules || [],
      count: (rules || []).length,
    });
  } catch (error) {
    console.error('Visa country rules endpoint error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
