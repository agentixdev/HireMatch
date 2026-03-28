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

export async function GET(request: Request) {
  try {
    // Auth
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Recruiter profile
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('id, company_name, industry, culture_tags, match_tags, values_dna, work_style')
      .eq('user_id', user.id)
      .single();

    if (!recruiter) return NextResponse.json({ error: 'Not a recruiter' }, { status: 403 });

    // Get optional job_id filter from query
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');

    // Fetch recruiter's jobs for context
    const service = await createServiceClient();
    let jobContext = '';
    let targetJob = null;

    if (jobId) {
      const { data: job } = await service
        .from('jobs')
        .select('id, title, description, skills_required, match_tags, experience_min, experience_max, work_mode, country')
        .eq('id', jobId)
        .eq('recruiter_id', recruiter.id)
        .single();
      if (job) {
        targetJob = job;
        jobContext = `\nTARGET JOB: "${job.title}" | Skills: ${(job.skills_required || []).join(', ')} | Tags: ${(job.match_tags || []).join(', ')} | Exp: ${job.experience_min || 0}-${job.experience_max || 99}yr | ${job.work_mode} | ${job.country || 'any'}`;
      }
    } else {
      // Use all active jobs as context
      const { data: jobs } = await service
        .from('jobs')
        .select('title, skills_required, match_tags, experience_min, experience_max, work_mode')
        .eq('recruiter_id', recruiter.id)
        .eq('is_active', true)
        .limit(5);
      if (jobs && jobs.length > 0) {
        jobContext = '\nACTIVE JOBS:\n' + jobs.map(j => `- "${j.title}" | Skills: ${(j.skills_required || []).join(', ')} | Tags: ${(j.match_tags || []).join(', ')}`).join('\n');
      }
    }

    // Fetch public candidates
    const { data: candidates } = await service
      .from('candidates')
      .select('id, full_name, headline, photo_url, skills, experience_years, match_tags, bio, country, city, remote_preference, visa_status, languages, available_now, education, certifications')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ ok: true, matches: [] });
    }

    // Build candidate summaries
    const candidateSummaries = candidates.map((c, i) =>
      `[${i}] ${c.full_name} | "${c.headline || 'No headline'}" | Skills: ${(c.skills || []).join(', ')} | Tags: ${(c.match_tags || []).join(', ')} | Exp: ${c.experience_years || 0}yr | ${c.country || '??'} ${c.city || ''} | Remote: ${c.remote_preference || 'any'} | Visa: ${c.visa_status || '??'} | Available: ${c.available_now ? 'Yes' : 'No'}`
    ).join('\n');

    const prompt = `You are an elite recruitment matching engine. Score how well each candidate matches this company's hiring needs.

COMPANY: ${recruiter.company_name} (${recruiter.industry || 'General'})
Company Culture Tags: ${(recruiter.culture_tags || []).join(', ')}
Company Match Tags: ${(recruiter.match_tags || []).join(', ')}
${jobContext}

CANDIDATES:
${candidateSummaries}

Score ALL candidates, then return the top 8 best matches. Consider skill fit, experience level, culture alignment, availability, location compatibility, and visa status.

Return JSON:
{
  "matches": [
    {
      "candidate_index": 0,
      "score": 0-100,
      "skills_match": 0-100,
      "experience_match": 0-100,
      "culture_match": 0-100,
      "highlights": ["strength1", "strength2"],
      "concerns": ["potential concern if any"],
      "why": "One sentence on why this candidate stands out"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const parsed = parseLLMJson<{ matches: Array<{ candidate_index: number; score: number; skills_match: number; experience_match: number; culture_match: number; highlights: string[]; concerns: string[]; why: string }> }>(result.response.text());

    // Enrich
    const enriched = (parsed.matches || [])
      .filter(m => m.candidate_index >= 0 && m.candidate_index < candidates.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(m => ({
        ...m,
        candidate: candidates[m.candidate_index],
      }));

    return NextResponse.json({ ok: true, matches: enriched, job: targetJob });
  } catch (err) {
    console.error('[matched-candidates] Error:', err);
    return NextResponse.json({ error: 'Failed to find matches' }, { status: 500 });
  }
}
