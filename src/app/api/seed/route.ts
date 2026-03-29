import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceClient } from '@/lib/supabase-server';
import { parseLLMJson } from '@/lib/parse-json';

export const maxDuration = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TIERS: Array<'free' | 'pro' | 'enterprise'> = ['free', 'free', 'pro', 'pro', 'enterprise'];

// ---------------------------------------------------------------------------
// Gemini client
// ---------------------------------------------------------------------------

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Missing GEMINI_API_KEY');
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

async function geminiGenerate(prompt: string): Promise<string> {
  const model = getGemini();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

// ---------------------------------------------------------------------------
// Seed: RECRUITERS
// ---------------------------------------------------------------------------

interface GeneratedRecruiter {
  company_name: string;
  company_website: string;
  industry: string;
  company_size: string;
  country: string;
  city: string;
  bio: string;
  culture_tags: string[];
}

async function seedRecruiters(count: number): Promise<number> {
  const supabase = await createServiceClient();
  let created = 0;
  const batchSize = 10;

  for (let offset = 0; offset < count; offset += batchSize) {
    const batchCount = Math.min(batchSize, count - offset);
    try {
      const prompt = `Generate ${batchCount} realistic company profiles for a recruitment platform. Mix company sizes, industries, and countries. Include startups, scale-ups, and enterprises. Use diverse industries: tech, finance, healthcare, marketing, design, data science, engineering, legal, logistics, education.

Return ONLY a JSON array, no other text:
[{
  "company_name": "string",
  "company_website": "string (realistic .com domain)",
  "industry": "string",
  "company_size": "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+",
  "country": "2-letter lowercase code from: us, ca, gb, de, fr, nl, ch, es, it, se, ie, in, br, jp, kr, pl, cz",
  "city": "string (real city matching the country)",
  "bio": "string (2-3 sentences about the company culture and mission)",
  "culture_tags": ["string"] (3-5 tags like "remote-first", "diversity", "work-life-balance", "innovation", "mentorship", "flat-hierarchy")
}]`;

      const raw = await geminiGenerate(prompt);
      const recruiters = parseLLMJson<GeneratedRecruiter[]>(raw);

      for (const rec of recruiters) {
        try {
          const slug = slugify(rec.company_name);
          const email = `demo-${slug}-${Date.now()}@hirematch.demo`;

          // Create auth user
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password: `demo-${slug}-${Date.now()}`,
            email_confirm: true,
            user_metadata: { role: 'recruiter', full_name: rec.company_name },
          });

          if (authErr || !authData.user) {
            console.error(`[seed] Failed to create auth user for ${rec.company_name}:`, authErr?.message);
            continue;
          }

          const tier = randomPick(TIERS);
          const viewsMap = { free: 10, pro: 100, enterprise: 1000 };

          const { error: insertErr } = await supabase.from('recruiters').insert({
            user_id: authData.user.id,
            company_name: rec.company_name,
            company_website: rec.company_website,
            industry: rec.industry,
            company_size: rec.company_size,
            country: rec.country.toLowerCase(),
            city: rec.city,
            bio: rec.bio,
            culture_tags: rec.culture_tags,
            tier,
            jobs_posted_count: 0,
            candidate_views_remaining: viewsMap[tier],
          });

          if (insertErr) {
            console.error(`[seed] Failed to insert recruiter ${rec.company_name}:`, insertErr.message);
            continue;
          }

          created++;
        } catch (e) {
          console.error(`[seed] Error creating recruiter:`, e);
        }
      }
    } catch (e) {
      console.error(`[seed] Recruiter batch error at offset ${offset}:`, e);
    }

    if (offset + batchSize < count) await sleep(1000);
  }

  return created;
}

// ---------------------------------------------------------------------------
// Seed: JOBS
// ---------------------------------------------------------------------------

interface GeneratedJob {
  title: string;
  description: string;
  requirements: string[];
  nice_to_haves: string[];
  skills_required: string[];
  job_type: string;
  work_mode: string;
  country: string;
  city: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  visa_sponsorship: boolean;
  experience_min: number;
  experience_max: number;
  education_level: string | null;
  industry: string;
  company_name: string;
  company_logo: string | null;
}

async function seedJobs(count: number): Promise<number> {
  const supabase = await createServiceClient();
  let created = 0;
  const batchSize = 10;
  const now = Date.now();
  const sixtyDays = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  for (let offset = 0; offset < count; offset += batchSize) {
    const batchCount = Math.min(batchSize, count - offset);
    try {
      const prompt = `Generate ${batchCount} realistic job postings for a global recruitment platform. Each job should feel like a real listing from a real company. Mix industries (tech, finance, healthcare, marketing, design, data science, engineering). Mix countries from: us, ca, gb, de, fr, nl, ch, es, it, se, ie, in, br, jp, kr, pl, cz. Mix work modes (remote, hybrid, onsite). Include realistic salary ranges appropriate to each country and role. Include realistic skills.

Return ONLY a JSON array, no other text:
[{
  "title": "string",
  "description": "string (2-3 paragraphs, realistic job description with About Us, Role, Requirements sections)",
  "requirements": ["string"] (4-6 items),
  "nice_to_haves": ["string"] (2-4 items),
  "skills_required": ["string"] (4-8 skills),
  "job_type": "full-time" | "part-time" | "contract" | "freelance" | "internship",
  "work_mode": "remote" | "hybrid" | "onsite",
  "country": "2-letter lowercase code",
  "city": "string",
  "salary_min": number,
  "salary_max": number,
  "salary_currency": "string (3-letter currency code matching country)",
  "visa_sponsorship": boolean,
  "experience_min": number,
  "experience_max": number,
  "education_level": "string or null",
  "industry": "string",
  "company_name": "string (realistic company names, mix of startups and enterprises)",
  "company_logo": null
}]`;

      const raw = await geminiGenerate(prompt);
      const jobs = parseLLMJson<GeneratedJob[]>(raw);

      const rows = jobs.map((job, i) => ({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        nice_to_haves: job.nice_to_haves,
        skills_required: job.skills_required,
        job_type: job.job_type,
        work_mode: job.work_mode,
        country: job.country.toLowerCase(),
        city: job.city,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        visa_sponsorship: job.visa_sponsorship ?? false,
        experience_min: job.experience_min,
        experience_max: job.experience_max,
        education_level: job.education_level,
        industry: job.industry,
        company_name: job.company_name,
        company_logo: job.company_logo,
        match_tags: (job.skills_required || []).map((s: string) => s.toLowerCase()),
        source: 'seed',
        external_id: `seed_job_${offset + i}_${now}`,
        recruiter_id: null,
        is_active: true,
        is_featured: false,
        expires_at: sixtyDays,
      }));

      const { error } = await supabase.from('jobs').insert(rows);
      if (error) {
        console.error(`[seed] Jobs batch insert error at offset ${offset}:`, error.message);
      } else {
        created += rows.length;
      }
    } catch (e) {
      console.error(`[seed] Jobs batch error at offset ${offset}:`, e);
    }

    if (offset + batchSize < count) await sleep(1000);
  }

  return created;
}

// ---------------------------------------------------------------------------
// Seed: CANDIDATES
// ---------------------------------------------------------------------------

interface GeneratedCandidate {
  full_name: string;
  headline: string;
  bio: string;
  country: string;
  city: string;
  remote_preference: string;
  skills: string[];
  experience_years: number;
  education: { institution: string; degree: string; field: string; year: number }[];
  work_history: { company: string; title: string; from: string; to: string; description: string }[];
  languages: string[];
  visa_status: string;
  salary_expectation_min: number;
  salary_expectation_max: number;
  salary_currency: string;
}

async function seedCandidates(count: number): Promise<number> {
  const supabase = await createServiceClient();
  let created = 0;
  const batchSize = 10;

  for (let offset = 0; offset < count; offset += batchSize) {
    const batchCount = Math.min(batchSize, count - offset);
    try {
      const prompt = `Generate ${batchCount} realistic candidate profiles for a global job platform. Mix experience levels (junior 0-2yr, mid 3-5yr, senior 6-10yr, staff 10+yr). Mix countries from: us, ca, gb, de, fr, nl, ch, es, it, se, ie, in, br, jp, kr, pl, cz. Mix skills and industries. Include realistic work histories with real-sounding companies.

Return ONLY a JSON array, no other text:
[{
  "full_name": "string",
  "headline": "string (e.g. 'Senior React Developer | 8 years experience')",
  "bio": "string (2-3 sentences)",
  "country": "2-letter lowercase code",
  "city": "string (real city matching country)",
  "remote_preference": "remote" | "hybrid" | "onsite" | "any",
  "skills": ["string"] (5-10 skills),
  "experience_years": number,
  "education": [{"institution": "string", "degree": "string", "field": "string", "year": number}],
  "work_history": [{"company": "string", "title": "string", "from": "YYYY-MM", "to": "YYYY-MM or Present", "description": "string (1-2 sentences)"}],
  "languages": ["string"],
  "visa_status": "citizen" | "permanent_resident" | "work_visa" | "needs_sponsorship",
  "salary_expectation_min": number,
  "salary_expectation_max": number,
  "salary_currency": "string (3-letter code matching country)"
}]`;

      const raw = await geminiGenerate(prompt);
      const candidates = parseLLMJson<GeneratedCandidate[]>(raw);

      for (const cand of candidates) {
        try {
          const slug = slugify(cand.full_name);
          const email = `demo-${slug}-${Date.now()}@hirematch.demo`;

          // Create auth user
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password: `demo-${slug}-${Date.now()}`,
            email_confirm: true,
            user_metadata: { role: 'candidate', full_name: cand.full_name },
          });

          if (authErr || !authData.user) {
            console.error(`[seed] Failed to create auth user for ${cand.full_name}:`, authErr?.message);
            continue;
          }

          // Map work_history to DB schema
          const workHistory = (cand.work_history || []).map((w) => ({
            company: w.company,
            title: w.title,
            description: w.description || '',
            start_date: w.from,
            end_date: w.to === 'Present' ? null : w.to,
            is_current: w.to === 'Present',
            skills: [],
          }));

          // Map education to DB schema
          const education = (cand.education || []).map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field,
            start_year: e.year - 4,
            end_year: e.year,
          }));

          const { error: insertErr } = await supabase.from('candidates').insert({
            user_id: authData.user.id,
            full_name: cand.full_name,
            email,
            headline: cand.headline,
            bio: cand.bio,
            country: cand.country.toLowerCase(),
            city: cand.city,
            remote_preference: cand.remote_preference,
            skills: cand.skills,
            experience_years: cand.experience_years,
            education,
            work_history: workHistory,
            certifications: [],
            languages: cand.languages || [],
            visa_status: cand.visa_status,
            salary_expectation_min: cand.salary_expectation_min,
            salary_expectation_max: cand.salary_expectation_max,
            salary_currency: cand.salary_currency,
            match_tags: (cand.skills || []).map((s) => s.toLowerCase()),
            is_public: true,
            available_now: Math.random() > 0.3,
          });

          if (insertErr) {
            console.error(`[seed] Failed to insert candidate ${cand.full_name}:`, insertErr.message);
            continue;
          }

          created++;
        } catch (e) {
          console.error(`[seed] Error creating candidate:`, e);
        }
      }
    } catch (e) {
      console.error(`[seed] Candidate batch error at offset ${offset}:`, e);
    }

    if (offset + batchSize < count) await sleep(1000);
  }

  return created;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: string; count?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = body.type || 'all';
  const validTypes = ['jobs', 'candidates', 'recruiters', 'all'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    );
  }

  const result: Record<string, number> = {};

  try {
    if (type === 'recruiters' || type === 'all') {
      const count = type === 'all' ? 15 : (body.count ?? 15);
      result.recruiters = await seedRecruiters(count);
    }

    if (type === 'jobs' || type === 'all') {
      const count = type === 'all' ? 50 : (body.count ?? 50);
      result.jobs = await seedJobs(count);
    }

    if (type === 'candidates' || type === 'all') {
      const count = type === 'all' ? 30 : (body.count ?? 30);
      result.candidates = await seedCandidates(count);
    }

    return NextResponse.json({
      ok: true,
      created: result,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[seed] Fatal error:', e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        created: result,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
