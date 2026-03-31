import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { parseLLMJson } from '@/lib/parse-json';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

export const maxDuration = 60;

export async function GET() {
  try {
    // Auth
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Candidate profile
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, full_name, headline, skills, experience_years, match_tags, bio, country, remote_preference, visa_status')
      .eq('user_id', user.id)
      .single();

    if (!candidate) return NextResponse.json({ error: 'No profile' }, { status: 404 });

    // Pre-filter jobs by skill/tag overlap
    const service = await createServiceClient();
    const { data: jobs } = await service
      .from('jobs')
      .select('id, title, description, industry, skills_required, match_tags, city, country, work_mode, salary_min, salary_max, salary_currency, job_type, experience_min, experience_max, recruiter:recruiters(company_name, company_logo_url)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ ok: true, matches: [] });
    }

    // Build job summaries for LLM
    const jobSummaries = jobs.map((j, i) =>
      `[${i}] "${j.title}" at ${(j.recruiter as { company_name?: string } | null)?.company_name || 'Company'} | Industry: ${j.industry} | Skills: ${(j.skills_required || []).join(', ')} | Tags: ${(j.match_tags || []).join(', ')} | ${j.work_mode} | ${j.city || ''} ${j.country || ''} | Exp: ${j.experience_min || 0}-${j.experience_max || 99}yr`
    ).join('\n');

    const prompt = `You are an expert job matching engine. Score how well this candidate matches each available job.

CANDIDATE:
- Name: ${candidate.full_name}
- Headline: ${candidate.headline || 'Not set'}
- Bio: ${candidate.bio || ''}
- Skills: ${(candidate.skills || []).join(', ')}
- Tags: ${(candidate.match_tags || []).join(', ')}
- Experience: ${candidate.experience_years || 0} years
- Country: ${candidate.country || 'any'}
- Work preference: ${candidate.remote_preference || 'any'}
- Visa: ${candidate.visa_status || 'unknown'}

AVAILABLE JOBS:
${jobSummaries}

Score ALL jobs, then return the top 8 best matches. Consider skill overlap, experience fit, tag alignment, location/remote compatibility, and visa requirements.

Return JSON:
{
  "matches": [
    {
      "job_index": 0,
      "score": 0-100,
      "skills_match": 0-100,
      "experience_match": 0-100,
      "culture_match": 0-100,
      "why": "One sentence explaining why this is a great match",
      "tip": "One tip to strengthen their application"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const parsed = parseLLMJson<{ matches: Array<{ job_index: number; score: number; skills_match: number; experience_match: number; culture_match: number; why: string; tip: string }> }>(result.response.text());

    // Enrich with full job data
    const enriched = (parsed.matches || [])
      .filter(m => m.job_index >= 0 && m.job_index < jobs.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(m => ({
        ...m,
        job: jobs[m.job_index],
      }));

    // Persist matches to DB so counters and history work
    if (enriched.length > 0) {
      const matchRows = enriched.map(m => ({
        candidate_id: candidate.id,
        job_id: m.job.id,
        score: Math.round(m.score),
        breakdown: {
          skills_match: m.skills_match,
          experience_match: m.experience_match,
          culture_match: m.culture_match,
        },
        explanation: m.why,
      }));

      // Upsert — update score if match already exists
      service.from('matches').upsert(matchRows, { onConflict: 'candidate_id,job_id' }).then(
        ({ error }) => { if (error) console.error('[matched-jobs] Failed to persist matches:', error.message); },
        (err: unknown) => console.error('[matched-jobs] Failed to persist matches:', err),
      );
    }

    return NextResponse.json({ ok: true, matches: enriched });
  } catch (err) {
    console.error('[matched-jobs] Error:', err);
    return NextResponse.json({ error: 'Failed to find matches' }, { status: 500 });
  }
}
