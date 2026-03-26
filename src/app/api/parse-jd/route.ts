import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseJobDescriptionWithAI } from '@/lib/gemini';

export const maxDuration = 60;

/**
 * POST /api/parse-jd
 * Parse a job description text with Gemini AI.
 * Returns structured job data (title, requirements, skills, etc.)
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is a recruiter
  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: 'Not a recruiter' }, { status: 403 });
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ error: 'Job description too short' }, { status: 400 });
    }

    const parsed = await parseJobDescriptionWithAI(text);

    return NextResponse.json({ ok: true, parsed });
  } catch (error) {
    console.error('JD parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parsing failed' },
      { status: 500 }
    );
  }
}
