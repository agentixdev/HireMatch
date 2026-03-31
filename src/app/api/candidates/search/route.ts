import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const PAGE_SIZE = 24;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      query = '',
      page = 0,
      country = '',
      remote = '',
      visa = '',
      expMin = 0,
      expMax = 30,
      skills = [],
    } = body;

    const supabase = await createServiceClient();

    let builder = supabase
      .from('candidates')
      .select('id, full_name, headline, photo_url, skills, experience_years, country, city, is_public, visa_status, match_score', { count: 'exact' })
      .eq('is_public', true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('match_score', { ascending: false, nullsFirst: false });

    // text search
    if (query.trim()) {
      const term = `%${query.trim()}%`;
      builder = builder.or(`full_name.ilike.${term},headline.ilike.${term}`);
    }

    // filters
    if (country) builder = builder.eq('country', country);
    if (remote) builder = builder.eq('remote_preference', remote);
    if (visa) builder = builder.eq('visa_status', visa);
    if (expMin > 0) builder = builder.gte('experience_years', expMin);
    if (expMax < 30) builder = builder.lte('experience_years', expMax);
    if (skills.length > 0) builder = builder.overlaps('skills', skills);

    const { data, count, error } = await builder;

    if (error) {
      console.error('Candidate search error:', error);
      return NextResponse.json({ candidates: [], total: 0, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      candidates: data ?? [],
      total: count ?? 0,
    });
  } catch (err) {
    console.error('Candidate search route error:', err);
    return NextResponse.json({ candidates: [], total: 0, error: 'Internal server error' }, { status: 500 });
  }
}
