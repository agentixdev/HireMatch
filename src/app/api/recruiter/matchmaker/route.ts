import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

interface CandidateRow {
  id: string;
  full_name: string;
  headline: string | null;
  photo_url: string | null;
  skills: string[];
  experience_years: number;
  country: string;
  city: string | null;
  match_tags: string[];
  bio: string | null;
  remote_preference: string;
  visa_status: string | null;
  languages: string[];
  education: unknown[];
  available_now: boolean | null;
}

/**
 * POST /api/recruiter/matchmaker
 * Runs the matchmaker quiz: scores candidates against quiz answers + job requirements.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('id, company_name, industry, culture_tags, match_tags, values_dna, work_style')
    .eq('user_id', user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: 'Not a recruiter' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      job_title,
      job_description,
      must_have_skills,
      nice_to_have_skills,
      experience_range,
      culture_fit,       // { teamwork: 0-100, innovation: 0-100, autonomy: 0-100, structure: 0-100, pace: 0-100 }
      values_ranking,    // string[] ordered by priority
      work_preferences,  // { remote_ok: bool, relocation_ok: bool, visa_sponsor: bool }
      country_filter,
    } = body;

    if (!job_title) {
      return NextResponse.json({ error: 'Job title is required' }, { status: 400 });
    }

    // Step 1: Pre-filter candidates from DB using tag overlap + basic filters
    const serviceClient = await createServiceClient();

    let query = serviceClient
      .from('candidates')
      .select('id, full_name, headline, photo_url, skills, experience_years, country, city, match_tags, bio, remote_preference, visa_status, languages, education, available_now')
      .eq('is_public', true)
      .order('experience_years', { ascending: false })
      .limit(200);

    // Apply experience filter
    if (experience_range?.min != null) {
      query = query.gte('experience_years', experience_range.min);
    }
    if (experience_range?.max != null && experience_range.max < 30) {
      query = query.lte('experience_years', experience_range.max);
    }

    // Apply country filter
    if (country_filter && country_filter !== 'all') {
      query = query.eq('country', country_filter);
    }

    // Apply skill overlap filter if we have must-have skills
    if (must_have_skills?.length > 0) {
      query = query.overlaps('skills', must_have_skills);
    }

    const { data: candidates, error: fetchError } = await query;

    if (fetchError) {
      console.error('Candidate fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }

    const candidatePool = (candidates || []) as CandidateRow[];
    const totalScanned = candidatePool.length;

    if (totalScanned === 0) {
      // Save empty result
      await serviceClient.from('recruiter_match_results').insert({
        recruiter_id: recruiter.id,
        quiz_answers: body,
        candidates: [],
        total_scanned: 0,
      });

      return NextResponse.json({
        ok: true,
        total_scanned: 0,
        matches: [],
        result_id: null,
      });
    }

    // Step 2: Batch score candidates with Gemini
    // Send top 50 candidates to AI for detailed scoring (cost optimization)
    const candidatesForAI = candidatePool.slice(0, 50);

    const scoringPrompt = `You are an expert recruitment matching engine. Score each candidate against this job and company profile.

JOB REQUIREMENTS:
- Title: ${job_title}
- Description: ${job_description || 'Not provided'}
- Must-have skills: ${(must_have_skills || []).join(', ') || 'None specified'}
- Nice-to-have skills: ${(nice_to_have_skills || []).join(', ') || 'None specified'}
- Experience range: ${experience_range?.min || 0}-${experience_range?.max || 30} years

COMPANY CULTURE:
- Company: ${recruiter.company_name}
- Industry: ${recruiter.industry}
- Culture tags: ${(recruiter.culture_tags || []).join(', ')}
- Values DNA: ${JSON.stringify(recruiter.values_dna || {})}
- Work style: ${JSON.stringify(recruiter.work_style || {})}

QUIZ PREFERENCES:
- Culture fit weights: ${JSON.stringify(culture_fit || {})}
- Values priority: ${(values_ranking || []).join(' > ')}
- Work preferences: ${JSON.stringify(work_preferences || {})}

CANDIDATES (score each one):
${candidatesForAI.map((c, i) => `
[${i}] ${c.full_name}
  - Headline: ${c.headline || 'N/A'}
  - Skills: ${c.skills.join(', ')}
  - Experience: ${c.experience_years} years
  - Location: ${c.city || ''}, ${c.country}
  - Tags: ${c.match_tags.join(', ')}
  - Bio: ${(c.bio || '').slice(0, 200)}
  - Remote: ${c.remote_preference}
  - Visa: ${c.visa_status || 'Unknown'}
  - Languages: ${c.languages.join(', ')}
  - Available now: ${c.available_now ? 'Yes' : 'No'}
`).join('')}

Return a JSON object:
{
  "scores": [
    {
      "index": 0,
      "overall_score": 0-100,
      "skills_score": 0-100,
      "experience_score": 0-100,
      "culture_score": 0-100,
      "values_score": 0-100,
      "location_score": 0-100,
      "explanation": "2-3 sentences explaining this match",
      "highlights": ["highlight1", "highlight2"],
      "concerns": ["concern1"]
    }
  ]
}

Score criteria:
- overall_score: weighted average (skills 30%, experience 20%, culture 25%, values 15%, location 10%)
- Be honest — low scores for poor fits. Only score 80+ for genuinely strong matches.
- Highlights: 2-3 key strengths
- Concerns: 0-2 potential issues (empty array if none)`;

    let scoredCandidates: Array<{
      candidate_id: string;
      full_name: string;
      headline: string | null;
      photo_url: string | null;
      skills: string[];
      experience_years: number;
      country: string;
      city: string | null;
      available_now: boolean | null;
      score: number;
      breakdown: {
        skills_score: number;
        experience_score: number;
        culture_score: number;
        values_score: number;
        location_score: number;
      };
      explanation: string;
      highlights: string[];
      concerns: string[];
    }> = [];

    try {
      const result = await model.generateContent(scoringPrompt);
      const text = result.response.text();
      const parsed = JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, ''));

      const scores = parsed.scores || [];

      scoredCandidates = scores
        .filter((s: { index: number }) => s.index >= 0 && s.index < candidatesForAI.length)
        .map((s: {
          index: number;
          overall_score: number;
          skills_score: number;
          experience_score: number;
          culture_score: number;
          values_score: number;
          location_score: number;
          explanation: string;
          highlights: string[];
          concerns: string[];
        }) => {
          const c = candidatesForAI[s.index];
          return {
            candidate_id: c.id,
            full_name: c.full_name,
            headline: c.headline,
            photo_url: c.photo_url,
            skills: c.skills,
            experience_years: c.experience_years,
            country: c.country,
            city: c.city,
            available_now: c.available_now,
            score: Math.min(100, Math.max(0, s.overall_score)),
            breakdown: {
              skills_score: s.skills_score || 0,
              experience_score: s.experience_score || 0,
              culture_score: s.culture_score || 0,
              values_score: s.values_score || 0,
              location_score: s.location_score || 0,
            },
            explanation: s.explanation || '',
            highlights: s.highlights || [],
            concerns: s.concerns || [],
          };
        })
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    } catch (aiErr) {
      console.error('Gemini scoring error:', aiErr);
      // Fallback: simple tag-overlap scoring
      scoredCandidates = candidatesForAI.map((c) => {
        const skillOverlap = (must_have_skills || []).filter((s: string) =>
          c.skills.map((sk: string) => sk.toLowerCase()).includes(s.toLowerCase())
        ).length;
        const tagOverlap = (recruiter.match_tags || []).filter((t: string) =>
          c.match_tags.includes(t)
        ).length;
        const baseScore = Math.min(100, Math.round(
          (skillOverlap / Math.max(1, (must_have_skills || []).length)) * 50 +
          (tagOverlap / Math.max(1, (recruiter.match_tags || []).length)) * 30 +
          Math.min(20, c.experience_years * 2)
        ));
        return {
          candidate_id: c.id,
          full_name: c.full_name,
          headline: c.headline,
          photo_url: c.photo_url,
          skills: c.skills,
          experience_years: c.experience_years,
          country: c.country,
          city: c.city,
          available_now: c.available_now,
          score: baseScore,
          breakdown: {
            skills_score: Math.round((skillOverlap / Math.max(1, (must_have_skills || []).length)) * 100),
            experience_score: Math.min(100, c.experience_years * 10),
            culture_score: Math.round((tagOverlap / Math.max(1, (recruiter.match_tags || []).length)) * 100),
            values_score: 50,
            location_score: 50,
          },
          explanation: 'Scored using skill and tag overlap (AI fallback).',
          highlights: c.skills.slice(0, 2),
          concerns: [],
        };
      }).sort((a, b) => b.score - a.score);
    }

    // Step 3: Save results
    const { data: savedResult } = await serviceClient
      .from('recruiter_match_results')
      .insert({
        recruiter_id: recruiter.id,
        quiz_answers: body,
        candidates: scoredCandidates.slice(0, 25), // Top 25 matches
        total_scanned: totalScanned,
      })
      .select('id')
      .single();

    return NextResponse.json({
      ok: true,
      total_scanned: totalScanned,
      matches: scoredCandidates.slice(0, 25),
      result_id: savedResult?.id || null,
    });
  } catch (error) {
    console.error('Matchmaker error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Matchmaker failed' },
      { status: 500 }
    );
  }
}
