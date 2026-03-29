import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseLLMJson } from '@/lib/parse-json';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/** Sanitise user-supplied text: cap length & strip control chars. */
const sanitize = (s: string, max = 500) =>
  s.slice(0, max).replace(/[\x00-\x1F\x7F]/g, '');

const JOB_SCHEMA = `{
  "title": "string",
  "description": "string (full job description, well-formatted with sections)",
  "requirements": ["requirement1", "requirement2", ...],
  "nice_to_haves": ["nice1", "nice2", ...],
  "skills_required": ["skill1", "skill2", ...],
  "experience_min": number or null,
  "experience_max": number or null,
  "education_level": "none|bachelor|master|phd" or null,
  "job_type": "full-time|part-time|contract|freelance|internship" or null,
  "work_mode": "remote|hybrid|onsite" or null,
  "salary_min": number or null,
  "salary_max": number or null,
  "salary_currency": "USD|EUR|GBP|..." or null,
  "city": "string" or null,
  "visa_sponsorship": boolean or null,
  "match_tags": ["tag1", "tag2", ...]
}`;

async function callGemini(prompt: string) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseLLMJson(text);
}

/**
 * POST /api/parse-jd
 * Modes:
 *   - parse:    Extract structured data from raw JD text
 *   - generate: Create a complete JD from minimal input (role, company, etc.)
 *   - refine:   Take existing structured data + user feedback and improve it
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 requests per minute per user
  const { success, remaining } = rateLimit(`parse-jd:${user.id}`, 10, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!recruiter) {
    return NextResponse.json({ error: 'Not a recruiter' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { mode = 'parse' } = body;

    let parsed;

    if (mode === 'parse') {
      const { text } = body;
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return NextResponse.json({ error: 'Job description too short' }, { status: 400 });
      }

      const sanitizedText = sanitize(text, 10000);

      parsed = await callGemini(
        `You are an expert job description parser. Extract structured data from this job description.

Return ONLY valid JSON matching this schema:
${JOB_SCHEMA}

Extract as much as possible. For match_tags, generate lowercase tags useful for matching candidates.

JOB DESCRIPTION:
${sanitizedText}`
      );
    } else if (mode === 'generate') {
      const { context } = body;
      if (!context?.role) {
        return NextResponse.json({ error: 'Role is required for generation' }, { status: 400 });
      }

      const parts = [
        `Role: ${context.role}`,
        context.seniority && `Seniority: ${context.seniority}`,
        context.company && `Company: ${context.company}`,
        context.industry && `Industry: ${context.industry}`,
        context.skills?.length && `Key Skills: ${context.skills.join(', ')}`,
        context.workMode && `Work Mode: ${context.workMode}`,
        context.notes && `Additional Notes: ${sanitize(context.notes)}`,
      ].filter(Boolean).join('\n');

      parsed = await callGemini(
        `You are an expert technical recruiter and copywriter. Generate a complete, compelling job description from these details.

Write the description in a professional but engaging tone. Include:
- An exciting overview paragraph
- Key responsibilities (4-6 bullet points)
- What the ideal candidate brings
- Perks and benefits if relevant

Return ONLY valid JSON matching this schema:
${JOB_SCHEMA}

Fill in ALL fields as best you can. The "description" field should be the full, well-written job description (multiple paragraphs). Generate realistic salary ranges if not specified.

INPUT:
${parts}`
      );
    } else if (mode === 'refine') {
      const { context, feedback } = body;
      if (!context || !feedback) {
        return NextResponse.json({ error: 'Context and feedback required for refinement' }, { status: 400 });
      }

      parsed = await callGemini(
        `You are an expert technical recruiter. You have an existing job posting and the recruiter wants to refine it.

CURRENT JOB DATA:
${JSON.stringify(context, null, 2)}

RECRUITER FEEDBACK:
"${sanitize(feedback, 1000)}"

Apply the feedback to improve the job posting. Only change fields that are relevant to the feedback. Keep everything else the same.

Return ONLY valid JSON matching this schema:
${JOB_SCHEMA}

Return the COMPLETE updated object (not just changed fields).`
      );
    } else {
      return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, parsed });
  } catch (error) {
    console.error('JD parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI processing failed' },
      { status: 500 }
    );
  }
}
