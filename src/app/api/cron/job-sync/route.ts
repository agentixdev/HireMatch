import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const maxDuration = 120;

// Search queries by country — top tech roles
const SEARCH_QUERIES = [
  { query: 'software engineer', countries: ['us', 'gb', 'de', 'ca', 'fr', 'nl'] },
  { query: 'data scientist', countries: ['us', 'gb', 'de', 'ch'] },
  { query: 'product manager', countries: ['us', 'gb', 'de'] },
  { query: 'devops engineer', countries: ['us', 'gb', 'de', 'nl'] },
  { query: 'frontend developer', countries: ['us', 'gb', 'de', 'fr', 'es'] },
];

// Map Adzuna country codes
const ADZUNA_COUNTRIES: Record<string, string> = {
  us: 'us', gb: 'gb', de: 'de', fr: 'fr', nl: 'nl',
  ca: 'ca', it: 'it', br: 'br', in: 'in', pl: 'pl',
};

interface NormalizedJob {
  title: string;
  description: string;
  country: string;
  city: string | null;
  job_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills_required: string[];
  is_active: boolean;
  visa_sponsorship: boolean;
  external_id: string;
  external_url: string | null;
  company_name: string | null;
  company_logo: string | null;
  source: string;
  expires_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// JSearch (RapidAPI)
// ---------------------------------------------------------------------------

interface JSearchJob {
  job_id: string;
  employer_name: string;
  job_title: string;
  job_description: string;
  job_city: string;
  job_country: string;
  job_employment_type: string;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_salary_currency: string;
  job_required_skills: string[] | null;
  job_posted_at_datetime_utc: string;
  employer_logo: string | null;
  job_apply_link: string;
  job_is_remote: boolean;
}

function normalizeEmploymentType(raw: string | undefined): string {
  if (!raw) return 'full-time';
  const lower = raw.toLowerCase();
  if (lower.includes('part')) return 'part-time';
  if (lower.includes('contract') || lower.includes('freelance')) return 'contract';
  if (lower.includes('intern')) return 'internship';
  return 'full-time';
}

function normalizeJSearchJob(job: JSearchJob): NormalizedJob {
  return {
    title: job.job_title,
    description: job.job_description?.slice(0, 10000) || '',
    country: (job.job_country || '').toUpperCase().slice(0, 2),
    city: job.job_city || null,
    job_type: normalizeEmploymentType(job.job_employment_type),
    work_mode: job.job_is_remote ? 'remote' : 'onsite',
    salary_min: job.job_min_salary ?? null,
    salary_max: job.job_max_salary ?? null,
    salary_currency: job.job_salary_currency || null,
    skills_required: job.job_required_skills ?? [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `jsearch_${job.job_id}`,
    external_url: job.job_apply_link || null,
    company_name: job.employer_name || null,
    company_logo: job.employer_logo || null,
    source: 'jsearch',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchJSearch(query: string, country: string): Promise<NormalizedJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query: `${query} in ${country}`,
    page: '1',
    num_pages: '1',
    date_posted: 'month',
  });

  const url = `https://jsearch.p.rapidapi.com/search?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`JSearch API error ${res.status} for "${query}" in ${country}`);
      return [];
    }

    const json = await res.json();
    const data: JSearchJob[] = json?.data ?? [];
    return data.map(normalizeJSearchJob);
  } catch (err) {
    console.warn(`JSearch fetch failed for "${query}" in ${country}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Adzuna
// ---------------------------------------------------------------------------

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  salary_min: number | null;
  salary_max: number | null;
  created: string;
  redirect_url: string;
  category: { tag: string };
}

function normalizeAdzunaJob(job: AdzunaJob, country: string): NormalizedJob {
  const city =
    job.location?.area && job.location.area.length > 1
      ? job.location.area[job.location.area.length - 1]
      : job.location?.display_name || null;

  return {
    title: job.title,
    description: job.description?.slice(0, 10000) || '',
    country: country.toUpperCase(),
    city,
    job_type: 'full-time',
    work_mode: 'onsite',
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    salary_currency: country === 'us' ? 'USD' : country === 'gb' ? 'GBP' : 'EUR',
    skills_required: [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `adzuna_${job.id}`,
    external_url: job.redirect_url || null,
    company_name: job.company?.display_name || null,
    company_logo: null,
    source: 'adzuna',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchAdzuna(query: string, country: string): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return [];

  const adzunaCountry = ADZUNA_COUNTRIES[country];
  if (!adzunaCountry) return [];

  const params = new URLSearchParams({
    app_id: appId,
    app_key: apiKey,
    results_per_page: '50',
    what: query,
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/1?${params}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`Adzuna API error ${res.status} for "${query}" in ${country}`);
      return [];
    }

    const json = await res.json();
    const results: AdzunaJob[] = json?.results ?? [];
    return results.map((job) => normalizeAdzunaJob(job, country));
  } catch (err) {
    console.warn(`Adzuna fetch failed for "${query}" in ${country}:`, err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Upsert batch into Supabase
// ---------------------------------------------------------------------------

const UPSERT_BATCH_SIZE = 100;

async function upsertJobs(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  jobs: NormalizedJob[]
): Promise<number> {
  if (jobs.length === 0) return 0;

  let upserted = 0;

  for (let i = 0; i < jobs.length; i += UPSERT_BATCH_SIZE) {
    const batch = jobs.slice(i, i + UPSERT_BATCH_SIZE);

    const { error, data } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id');

    if (error) {
      console.error(`Upsert batch error (offset ${i}):`, error.message);
    } else {
      upserted += data?.length ?? batch.length;
    }
  }

  return upserted;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasJSearch = !!process.env.RAPIDAPI_KEY;
  const hasAdzuna = !!process.env.ADZUNA_APP_ID && !!process.env.ADZUNA_API_KEY;

  if (!hasJSearch && !hasAdzuna) {
    console.warn('Job sync cron: No API keys configured — skipping');
    return NextResponse.json({
      ok: true,
      warning: 'No external API keys configured',
      jsearch: { fetched: 0, upserted: 0 },
      adzuna: { fetched: 0, upserted: 0 },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = await createServiceClient();

    const stats = {
      jsearch: { fetched: 0, upserted: 0 },
      adzuna: { fetched: 0, upserted: 0 },
    };

    const allJSearchJobs: NormalizedJob[] = [];
    const allAdzunaJobs: NormalizedJob[] = [];

    // Process each search query + country combination.
    // We process queries sequentially but countries within a query in parallel
    // to balance speed vs rate-limit safety.
    for (const { query, countries } of SEARCH_QUERIES) {
      const countryPromises = countries.map(async (country) => {
        // JSearch
        if (hasJSearch) {
          const jobs = await fetchJSearch(query, country);
          if (jobs.length > 0) {
            allJSearchJobs.push(...jobs);
          }
        }

        // Adzuna (parallel with JSearch for same country)
        if (hasAdzuna) {
          const jobs = await fetchAdzuna(query, country);
          if (jobs.length > 0) {
            allAdzunaJobs.push(...jobs);
          }
        }
      });

      // Run all countries for this query in parallel
      await Promise.all(countryPromises);
    }

    stats.jsearch.fetched = allJSearchJobs.length;
    stats.adzuna.fetched = allAdzunaJobs.length;

    // Deduplicate by external_id before upserting (same job can appear in
    // multiple query variations)
    const dedup = (jobs: NormalizedJob[]): NormalizedJob[] => {
      const seen = new Set<string>();
      return jobs.filter((j) => {
        if (seen.has(j.external_id)) return false;
        seen.add(j.external_id);
        return true;
      });
    };

    const uniqueJSearch = dedup(allJSearchJobs);
    const uniqueAdzuna = dedup(allAdzunaJobs);

    // Upsert
    stats.jsearch.upserted = await upsertJobs(supabase, uniqueJSearch);
    stats.adzuna.upserted = await upsertJobs(supabase, uniqueAdzuna);

    console.log(
      `Job sync complete — JSearch: ${stats.jsearch.fetched} fetched / ${stats.jsearch.upserted} upserted, ` +
        `Adzuna: ${stats.adzuna.fetched} fetched / ${stats.adzuna.upserted} upserted`
    );

    return NextResponse.json({
      ok: true,
      jsearch: stats.jsearch,
      adzuna: stats.adzuna,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Job sync cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
