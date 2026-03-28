import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase } from '@/lib/supabase-server';
import { parseLLMJson } from '@/lib/parse-json';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, jobDescription, platform } = await request.json();

    // Fetch candidate profile
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'No candidate profile found' }, { status: 404 });
    }

    switch (action) {
      case 'improve-resume': {
        const jobContext = jobDescription
          ? `\n\nTARGET JOB DESCRIPTION (tailor the resume to this):\n${jobDescription}`
          : '';

        const prompt = `You are an elite career coach and resume writer. Analyze this candidate's profile and produce a dramatically improved version.

CANDIDATE PROFILE:
- Name: ${candidate.full_name}
- Current Headline: ${candidate.headline || 'None'}
- Bio: ${candidate.bio || 'None'}
- Skills: ${(candidate.skills || []).join(', ')}
- Experience: ${candidate.experience_years || 0} years
- Education: ${JSON.stringify(candidate.education || [])}
- Work History: ${JSON.stringify(candidate.work_history || [])}
- Certifications: ${(candidate.certifications || []).join(', ')}
${jobContext}

Return JSON:
{
  "improved_headline": "Power headline that grabs attention (max 80 chars)",
  "improved_bio": "Compelling 3-sentence professional summary with quantified achievements",
  "improved_skills": ["skill1", "skill2", ...],
  "added_skills": ["skills the candidate likely has but didn't list, based on their experience"],
  "work_history_improvements": [
    {
      "company": "company name",
      "original_description": "what they wrote",
      "improved_description": "rewritten with action verbs, metrics, and impact"
    }
  ],
  "headline_score_before": 0-100,
  "headline_score_after": 0-100,
  "bio_score_before": 0-100,
  "bio_score_after": 0-100,
  "overall_score_before": 0-100,
  "overall_score_after": 0-100,
  "key_improvements": ["improvement1", "improvement2", "improvement3"]
}`;

        const result = await model.generateContent(prompt);
        const data = parseLLMJson(result.response.text());
        return NextResponse.json({ ok: true, data });
      }

      case 'find-jobs': {
        // Fetch active jobs from database
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, description, industry, skills_required, city, country, work_mode, salary_min, salary_max, salary_currency, job_type, recruiter:recruiters(company_name, company_logo_url)')
          .eq('is_active', true)
          .limit(100);

        if (!jobs || jobs.length === 0) {
          return NextResponse.json({ ok: true, data: { matches: [], message: 'No active jobs available right now.' } });
        }

        const jobSummaries = jobs.map((j, i) => `[${i}] ${j.title} at ${(j.recruiter as { company_name?: string } | null)?.company_name || 'Company'} — ${j.industry} — Skills: ${(j.skills_required || []).join(', ')} — ${j.work_mode} — ${j.city || ''}, ${j.country || ''}`).join('\n');

        const prompt = `You are an AI career matchmaker. Find the best job matches for this candidate from the available jobs.

CANDIDATE:
- Name: ${candidate.full_name}
- Headline: ${candidate.headline || 'Not set'}
- Skills: ${(candidate.skills || []).join(', ')}
- Experience: ${candidate.experience_years || 0} years
- Preferred work mode: ${candidate.remote_preference || 'any'}
- Country: ${candidate.country || 'any'}
- Visa status: ${candidate.visa_status || 'unknown'}

AVAILABLE JOBS:
${jobSummaries}

Return JSON with the top 6 best matches:
{
  "matches": [
    {
      "job_index": 0,
      "match_score": 0-100,
      "match_reasons": ["reason1", "reason2", "reason3"],
      "gaps": ["what the candidate is missing for this role"],
      "tip": "one actionable tip to strengthen their application"
    }
  ]
}`;

        const result = await model.generateContent(prompt);
        const parsed = parseLLMJson<{ matches: Array<{ job_index: number; match_score: number; match_reasons: string[]; gaps: string[]; tip: string }> }>(result.response.text());

        // Enrich with full job data
        const enriched = (parsed.matches || [])
          .filter(m => m.job_index >= 0 && m.job_index < jobs.length)
          .map(m => ({
            ...m,
            job: jobs[m.job_index],
          }));

        return NextResponse.json({ ok: true, data: { matches: enriched } });
      }

      case 'recommend-actions': {
        const prompt = `You are a career strategist. Analyze this candidate's profile and provide specific, actionable recommendations to make them more competitive in the job market.

CANDIDATE:
- Name: ${candidate.full_name}
- Headline: ${candidate.headline || 'MISSING — critical gap'}
- Bio: ${candidate.bio || 'MISSING — critical gap'}
- Skills: ${(candidate.skills || []).join(', ') || 'NONE — critical gap'}
- Experience: ${candidate.experience_years || 0} years
- Education: ${JSON.stringify(candidate.education || [])}
- Work History: ${JSON.stringify(candidate.work_history || [])}
- Certifications: ${(candidate.certifications || []).join(', ') || 'None'}
- Languages: ${(candidate.languages || []).join(', ') || 'None'}
- Country: ${candidate.country || 'Not set'}
- Visa Status: ${candidate.visa_status || 'Not set'}
- Public Profile: ${candidate.is_public ? 'Yes' : 'No'}
- Photo: ${candidate.photo_url ? 'Yes' : 'No — critical gap'}
- CV Uploaded: ${candidate.cv_url ? 'Yes' : 'No — critical gap'}

Return JSON:
{
  "profile_grade": "A|B|C|D|F",
  "profile_score": 0-100,
  "critical_actions": [
    { "action": "what to do", "impact": "high|medium|low", "effort": "easy|medium|hard", "reason": "why this matters" }
  ],
  "skill_gaps": ["trending skills they should learn based on their field"],
  "certification_suggestions": ["specific certs that would boost their profile"],
  "career_trajectory": "A 2-sentence prediction of where their career is heading based on current trajectory",
  "market_demand": "How in-demand their skillset is right now (high/medium/low with explanation)",
  "salary_insight": "Expected salary range based on their skills and experience"
}`;

        const result = await model.generateContent(prompt);
        const data = parseLLMJson(result.response.text());
        return NextResponse.json({ ok: true, data });
      }

      case 'social-content': {
        const p = platform || 'linkedin';
        const prompt = `You are a personal branding expert. Generate compelling social media content to promote this job seeker and attract recruiters.

CANDIDATE:
- Name: ${candidate.full_name}
- Headline: ${candidate.headline || ''}
- Bio: ${candidate.bio || ''}
- Skills: ${(candidate.skills || []).join(', ')}
- Experience: ${candidate.experience_years || 0} years
- Top achievements from work history: ${JSON.stringify((candidate.work_history || []).slice(0, 3))}

PLATFORM: ${p}

Return JSON:
{
  "posts": [
    {
      "type": "availability-announcement|achievement-highlight|thought-leadership|skill-showcase",
      "content": "The full post text, ready to copy-paste. Include relevant hashtags. Make it engaging, authentic, and professional.",
      "hook": "The attention-grabbing first line",
      "estimated_engagement": "low|medium|high",
      "best_time_to_post": "e.g. Tuesday 9am EST"
    }
  ],
  "profile_optimization": {
    "headline_suggestion": "Optimized ${p} headline",
    "about_section": "Optimized ${p} about/bio section",
    "banner_idea": "What their cover/banner image should convey"
  }
}`;

        const result = await model.generateContent(prompt);
        const data = parseLLMJson(result.response.text());
        return NextResponse.json({ ok: true, data });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[ai-coach] Error:', err);
    return NextResponse.json({ error: 'AI coach failed' }, { status: 500 });
  }
}
