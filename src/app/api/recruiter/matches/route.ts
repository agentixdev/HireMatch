import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const maxDuration = 30;

/**
 * GET /api/recruiter/matches
 * Fetch saved match results for the authenticated recruiter.
 */
export async function GET() {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: 'Not a recruiter' }, { status: 403 });
  }

  const { data: results, error } = await supabase
    .from('recruiter_match_results')
    .select('*')
    .eq('recruiter_id', recruiter.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Match results fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, results: results || [] });
}
