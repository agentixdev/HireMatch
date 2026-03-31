import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const maxDuration = 300;

// Search queries — top tech roles
const SEARCH_QUERIES_LIST = [
  'software engineer', 'data scientist', 'product manager', 'devops engineer', 'frontend developer',
  'backend developer', 'full stack developer', 'mobile developer', 'AI engineer', 'machine learning engineer',
  'security engineer', 'QA engineer', 'data engineer', 'cloud architect', 'UX designer',
  'technical writer', 'engineering manager', 'solutions architect', 'site reliability engineer',
  'blockchain developer',
];

// Countries to search across for paid APIs
const SEARCH_COUNTRIES = ['us', 'gb', 'de', 'ca', 'fr', 'nl', 'ch', 'es', 'au', 'sg', 'ae', 'jp'];

// Build query/country combos for paid sources
const SEARCH_QUERIES = SEARCH_QUERIES_LIST.map((query) => ({
  query,
  countries: SEARCH_COUNTRIES,
}));

// Map Adzuna country codes
const ADZUNA_COUNTRIES: Record<string, string> = {
  us: 'us', gb: 'gb', de: 'de', fr: 'fr', nl: 'nl',
  ca: 'ca', it: 'it', br: 'br', in: 'in', pl: 'pl',
  au: 'au', sg: 'sg', at: 'at',
};

// ---------------------------------------------------------------------------
// Country name → 2-letter ISO code mapping
// ---------------------------------------------------------------------------

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'us', 'usa': 'us', 'us': 'us', 'u.s.': 'us', 'u.s.a.': 'us',
  'united kingdom': 'gb', 'uk': 'gb', 'england': 'gb', 'scotland': 'gb', 'wales': 'gb',
  'germany': 'de', 'deutschland': 'de',
  'france': 'fr',
  'spain': 'es', 'españa': 'es',
  'italy': 'it', 'italia': 'it',
  'netherlands': 'nl', 'holland': 'nl', 'the netherlands': 'nl',
  'belgium': 'be', 'belgique': 'be',
  'austria': 'at', 'österreich': 'at',
  'portugal': 'pt',
  'ireland': 'ie',
  'sweden': 'se', 'sverige': 'se',
  'denmark': 'dk', 'danmark': 'dk',
  'norway': 'no', 'norge': 'no',
  'finland': 'fi', 'suomi': 'fi',
  'poland': 'pl', 'polska': 'pl',
  'czech republic': 'cz', 'czechia': 'cz',
  'romania': 'ro',
  'switzerland': 'ch', 'schweiz': 'ch', 'suisse': 'ch',
  'canada': 'ca',
  'india': 'in',
  'mexico': 'mx', 'méxico': 'mx',
  'brazil': 'br', 'brasil': 'br',
  'argentina': 'ar',
  'china': 'cn',
  'japan': 'jp',
  'south korea': 'kr', 'korea': 'kr',
  'vietnam': 'vn', 'viet nam': 'vn',
  'philippines': 'ph',
  'australia': 'us', 'new zealand': 'us',
  'singapore': 'us', 'israel': 'us',
  'turkey': 'us', 'türkiye': 'us',
  'worldwide': 'us',
  'anywhere': 'us',
  'global': 'us',
  'remote': 'us',
  'europe': 'de',
  'european union': 'de',
  'eu': 'de',
  'latin america': 'br',
  'latam': 'br',
  'asia': 'jp',
};

/** Valid country codes in our DB */
const VALID_COUNTRY_CODES = new Set([
  'us', 'ca', 'gb', 'ch', 'de', 'fr', 'es', 'it', 'nl', 'be',
  'at', 'pt', 'ie', 'se', 'dk', 'no', 'fi', 'pl', 'cz', 'ro',
  'in', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'vn', 'ph',
]);

/**
 * Safely convert a date value (ISO string, Unix epoch seconds, or number) to ISO string.
 */
function toISODate(value: string | number | null | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'number' || /^\d{9,10}$/.test(String(value))) {
    return new Date(Number(value) * 1000).toISOString();
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Try to extract a 2-letter country code from a free-form location string.
 * Falls back to defaultCode if nothing matches.
 */
function parseCountryFromLocation(location: string | null | undefined, defaultCode = 'us'): string {
  if (!location) return defaultCode;

  const loc = location.trim();

  // Already a 2-letter code at the end, e.g. "Berlin, DE"
  // Only accept if it's a valid country code (not a US state like NY, TX, CA)
  const trailingCode = loc.match(/\b([A-Za-z]{2})$/);
  if (trailingCode) {
    const code = trailingCode[1].toLowerCase();
    if (VALID_COUNTRY_CODES.has(code)) {
      return code;
    }
  }

  // Check each known country name (longest match first by iterating)
  const lower = loc.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (lower.includes(name)) {
      return code;
    }
  }

  return defaultCode;
}

/**
 * Parse a salary string like "$50,000 - $80,000" or "60k-90k" into { min, max, currency }.
 */
function parseSalaryString(salary: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  if (!salary) return { min: null, max: null, currency: null };

  let currency: string | null = 'USD';
  if (salary.includes('€')) currency = 'EUR';
  else if (salary.includes('£')) currency = 'GBP';
  else if (salary.includes('$')) currency = 'USD';
  else currency = null;

  // Extract numbers from the string
  const numbers = salary.match(/[\d,]+\.?\d*/g);
  if (!numbers || numbers.length === 0) return { min: null, max: null, currency };

  const parsed = numbers.map((n) => {
    let val = parseFloat(n.replace(/,/g, ''));
    // If the string contains "k" or "K" near the number, multiply by 1000
    if (salary.toLowerCase().includes('k') && val < 1000) {
      val *= 1000;
    }
    return val;
  });

  if (parsed.length === 1) {
    return { min: parsed[0], max: parsed[0], currency };
  }

  return {
    min: Math.min(parsed[0], parsed[1]),
    max: Math.max(parsed[0], parsed[1]),
    currency,
  };
}

/** Small delay helper for rate-limit politeness */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Common fetch headers */
const COMMON_HEADERS: Record<string, string> = {
  'User-Agent': 'HireMatch-JobSync/1.0 (https://hirematch.app)',
  Accept: 'application/json',
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
  posted_at: string;
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
    country: (job.job_country || '').toLowerCase().slice(0, 2),
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
    posted_at: job.job_posted_at_datetime_utc || new Date().toISOString(),
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
    num_pages: '3',
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
    country: country.toLowerCase(),
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
    posted_at: job.created || new Date().toISOString(),
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

  const allJobs: NormalizedJob[] = [];
  const ADZUNA_PAGES = [1, 2, 3];

  for (const page of ADZUNA_PAGES) {
    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: apiKey,
        results_per_page: '100',
        what: query,
      });

      const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/${page}?${params}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`Adzuna API error ${res.status} for "${query}" in ${country} page ${page}`);
        break; // Stop paginating on error
      }

      const json = await res.json();
      const results: AdzunaJob[] = json?.results ?? [];
      if (results.length === 0) break; // No more results

      allJobs.push(...results.map((job) => normalizeAdzunaJob(job, country)));

      // Small delay between pages to respect rate limits
      if (page < ADZUNA_PAGES[ADZUNA_PAGES.length - 1]) await delay(300);
    } catch (err) {
      console.warn(`Adzuna fetch failed for "${query}" in ${country} page ${page}:`, err);
      break;
    }
  }

  return allJobs;
}

// ---------------------------------------------------------------------------
// Remotive API (FREE, no key needed)
// ---------------------------------------------------------------------------

const REMOTIVE_CATEGORIES = [
  'software-dev',
  'data',
  'design',
  'product',
  'devops',
  'marketing',
];

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  category: string;
  tags: string[];
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  job_type: string;
}

function normalizeRemotiveJobType(raw: string | undefined): string {
  if (!raw) return 'full-time';
  const lower = raw.toLowerCase();
  if (lower === 'full_time' || lower === 'full-time') return 'full-time';
  if (lower === 'part_time' || lower === 'part-time') return 'part-time';
  if (lower === 'contract') return 'contract';
  if (lower === 'freelance') return 'contract';
  if (lower === 'internship') return 'internship';
  return 'full-time';
}

function normalizeRemotiveJob(job: RemotiveJob): NormalizedJob {
  const salary = parseSalaryString(job.salary);
  const country = parseCountryFromLocation(job.candidate_required_location, 'us');

  return {
    title: job.title,
    description: '', // Remotive API doesn't return full descriptions in listing
    country,
    city: null,
    job_type: normalizeRemotiveJobType(job.job_type),
    work_mode: 'remote',
    salary_min: salary.min,
    salary_max: salary.max,
    salary_currency: salary.currency,
    skills_required: job.tags ?? [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `remotive_${job.id}`,
    external_url: job.url || null,
    company_name: job.company_name || null,
    company_logo: job.company_logo || null,
    source: 'remotive',
    posted_at: job.publication_date || new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchRemotive(): Promise<NormalizedJob[]> {
  const results = await Promise.allSettled(
    REMOTIVE_CATEGORIES.map(async (category) => {
      const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=500`;
      const res = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        console.warn(`Remotive API error ${res.status} for category "${category}"`);
        return [] as NormalizedJob[];
      }

      const json = await res.json();
      const jobs: RemotiveJob[] = json?.jobs ?? [];
      console.log(`Remotive category "${category}": ${jobs.length} jobs`);
      return jobs.map(normalizeRemotiveJob);
    })
  );

  const allJobs = results
    .filter((r): r is PromiseFulfilledResult<NormalizedJob[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  return allJobs;
}

// ---------------------------------------------------------------------------
// Arbeitnow API (FREE, no key needed)
// ---------------------------------------------------------------------------

interface ArbeitnowJob {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  job_types: string[];
  location: string;
  remote: boolean;
  company_name: string;
  url: string;
  created_at: string | number;
}

function normalizeArbeitnowJob(job: ArbeitnowJob): NormalizedJob {
  const country = parseCountryFromLocation(job.location, 'de');
  const city = job.location?.split(',')[0]?.trim() || null;

  // Map job_types
  let jobType = 'full-time';
  if (job.job_types && job.job_types.length > 0) {
    const first = job.job_types[0].toLowerCase();
    if (first.includes('part')) jobType = 'part-time';
    else if (first.includes('contract') || first.includes('freelance')) jobType = 'contract';
    else if (first.includes('intern')) jobType = 'internship';
  }

  return {
    title: job.title,
    description: job.description?.slice(0, 10000) || '',
    country,
    city,
    job_type: jobType,
    work_mode: job.remote ? 'remote' : 'onsite',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    skills_required: job.tags ?? [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `arbeitnow_${job.slug}`,
    external_url: job.url || null,
    company_name: job.company_name || null,
    company_logo: null,
    source: 'arbeitnow',
    posted_at: toISODate(job.created_at),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchArbeitnow(): Promise<NormalizedJob[]> {
  const ARBEITNOW_PAGES = [1, 2, 3, 4, 5];

  const results = await Promise.allSettled(
    ARBEITNOW_PAGES.map(async (page) => {
      const url = `https://www.arbeitnow.com/api/job-board-api?page=${page}`;
      const res = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`Arbeitnow API error ${res.status} for page ${page}`);
        return [] as NormalizedJob[];
      }

      const json = await res.json();
      const jobs: ArbeitnowJob[] = json?.data ?? [];
      console.log(`Arbeitnow page ${page}: ${jobs.length} jobs`);
      return jobs.map(normalizeArbeitnowJob);
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NormalizedJob[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}

// ---------------------------------------------------------------------------
// RemoteOK JSON (FREE, no key needed)
// ---------------------------------------------------------------------------

interface RemoteOKJob {
  id: string;
  epoch: number;
  company: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  salary_min: number;
  salary_max: number;
  url: string;
  logo: string;
  date: string;
}

function normalizeRemoteOKJob(job: RemoteOKJob): NormalizedJob {
  const country = parseCountryFromLocation(job.location, 'us');

  return {
    title: job.position,
    description: job.description?.slice(0, 10000) || '',
    country,
    city: null,
    job_type: 'full-time',
    work_mode: 'remote',
    salary_min: job.salary_min || null,
    salary_max: job.salary_max || null,
    salary_currency: job.salary_min || job.salary_max ? 'USD' : null,
    skills_required: job.tags ?? [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `remoteok_${job.id}`,
    external_url: job.url || null,
    company_name: job.company || null,
    company_logo: job.logo || null,
    source: 'remoteok',
    posted_at: toISODate(job.epoch || job.date),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchRemoteOK(): Promise<NormalizedJob[]> {
  try {
    const url = 'https://remoteok.com/api';
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`RemoteOK API error ${res.status}`);
      return [];
    }

    const json = await res.json();

    // First element is metadata — skip it. Rest are jobs.
    if (!Array.isArray(json) || json.length < 2) return [];

    const jobs: RemoteOKJob[] = json.slice(1);
    return jobs
      .filter((job) => job.id && job.position) // skip malformed entries
      .map(normalizeRemoteOKJob);
  } catch (err) {
    console.warn('RemoteOK fetch failed:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// WeWorkRemotely RSS (FREE, no key needed)
// ---------------------------------------------------------------------------

function simpleHash(str: string): string {
  return str.replace(/[^a-z0-9]/gi, '').slice(-20);
}

interface WWRParsedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category: string;
}

function parseWWRRss(xml: string): WWRParsedItem[] {
  const items: WWRParsedItem[] = [];

  // Match each <item>...</item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      // Handle CDATA: <tag><![CDATA[content]]></tag>
      const cdataRegex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
      const cdataMatch = block.match(cdataRegex);
      if (cdataMatch) return cdataMatch[1].trim();

      const simpleRegex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
      const simpleMatch = block.match(simpleRegex);
      return simpleMatch ? simpleMatch[1].trim() : '';
    };

    items.push({
      title: getTag('title'),
      link: getTag('link'),
      description: getTag('description').slice(0, 10000),
      pubDate: getTag('pubDate'),
      category: getTag('category'),
    });
  }

  return items;
}

function normalizeWWRItem(item: WWRParsedItem): NormalizedJob {
  // Title format is often "Company Name: Job Title" — split on ": "
  let companyName: string | null = null;
  let jobTitle = item.title;

  const colonIndex = item.title.indexOf(': ');
  if (colonIndex > 0) {
    companyName = item.title.slice(0, colonIndex).trim();
    jobTitle = item.title.slice(colonIndex + 2).trim();
  }

  return {
    title: jobTitle,
    description: item.description || '',
    country: 'us',
    city: null,
    job_type: 'full-time',
    work_mode: 'remote',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    skills_required: item.category ? [item.category] : [],
    is_active: true,
    visa_sponsorship: false,
    external_id: `wwr_${simpleHash(item.link)}`,
    external_url: item.link || null,
    company_name: companyName,
    company_logo: null,
    source: 'weworkremotely',
    posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchWeWorkRemotely(): Promise<NormalizedJob[]> {
  try {
    const url = 'https://weworkremotely.com/remote-jobs.rss';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HireMatch-JobSync/1.0 (https://hirematch.app)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`WeWorkRemotely RSS error ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseWWRRss(xml);

    return items
      .filter((item) => item.title && item.link)
      .map(normalizeWWRItem);
  } catch (err) {
    console.warn('WeWorkRemotely fetch failed:', err);
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
): Promise<{ upserted: number; errors: string[] }> {
  if (jobs.length === 0) return { upserted: 0, errors: [] };

  let upserted = 0;
  const errors: string[] = [];

  // Validate and sanitize before upserting
  const validJobs = jobs
    .filter((j) => {
      if (!VALID_COUNTRY_CODES.has(j.country)) {
        console.warn(`Skipping job with invalid country "${j.country}": ${j.title}`);
        return false;
      }
      return true;
    })
    .map((j) => ({
      ...j,
      // DB columns are integer, ensure no decimals
      salary_min: j.salary_min != null ? Math.round(j.salary_min) : null,
      salary_max: j.salary_max != null ? Math.round(j.salary_max) : null,
    }));

  for (let i = 0; i < validJobs.length; i += UPSERT_BATCH_SIZE) {
    const batch = validJobs.slice(i, i + UPSERT_BATCH_SIZE);

    const { error, data } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'external_id', ignoreDuplicates: false })
      .select('id');

    if (error) {
      const msg = `Upsert batch error (offset ${i}, ${batch.length} jobs): ${error.message}`;
      console.error(msg);
      errors.push(msg);
    } else {
      upserted += data?.length ?? batch.length;
    }
  }

  return { upserted, errors };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

interface SourceStats {
  fetched: number;
  upserted: number;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasJSearch = !!process.env.RAPIDAPI_KEY;
  const hasAdzuna = !!process.env.ADZUNA_APP_ID && !!process.env.ADZUNA_API_KEY;

  // Free sources always run — no keys needed
  const hasFreeSourcesAvailable = true;

  if (!hasJSearch && !hasAdzuna && !hasFreeSourcesAvailable) {
    console.warn('Job sync cron: No API keys configured — skipping');
    return NextResponse.json({
      ok: true,
      warning: 'No external API keys configured',
      jsearch: { fetched: 0, upserted: 0 },
      adzuna: { fetched: 0, upserted: 0 },
      remotive: { fetched: 0, upserted: 0 },
      arbeitnow: { fetched: 0, upserted: 0 },
      remoteok: { fetched: 0, upserted: 0 },
      weworkremotely: { fetched: 0, upserted: 0 },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const supabase = await createServiceClient();

    const stats: Record<string, SourceStats> = {
      jsearch: { fetched: 0, upserted: 0 },
      adzuna: { fetched: 0, upserted: 0 },
      remotive: { fetched: 0, upserted: 0 },
      arbeitnow: { fetched: 0, upserted: 0 },
      remoteok: { fetched: 0, upserted: 0 },
      weworkremotely: { fetched: 0, upserted: 0 },
    };

    const allJSearchJobs: NormalizedJob[] = [];
    const allAdzunaJobs: NormalizedJob[] = [];

    // -----------------------------------------------------------------------
    // 1. Fetch paid sources (JSearch + Adzuna) — query/country combos
    //    Process in batches to avoid hitting rate limits
    // -----------------------------------------------------------------------
    const PAID_CONCURRENCY = 4; // max concurrent requests per batch

    for (const { query, countries } of SEARCH_QUERIES) {
      // Process countries in batches of PAID_CONCURRENCY
      for (let i = 0; i < countries.length; i += PAID_CONCURRENCY) {
        const batch = countries.slice(i, i + PAID_CONCURRENCY);
        const countryPromises = batch.map(async (country) => {
          if (hasJSearch) {
            const jobs = await fetchJSearch(query, country);
            if (jobs.length > 0) {
              allJSearchJobs.push(...jobs);
            }
          }

          if (hasAdzuna) {
            const jobs = await fetchAdzuna(query, country);
            if (jobs.length > 0) {
              allAdzunaJobs.push(...jobs);
            }
          }
        });

        await Promise.all(countryPromises);
        // Small delay between batches for rate-limit politeness
        await delay(200);
      }
    }

    console.log(`Paid sources: JSearch ${allJSearchJobs.length} jobs, Adzuna ${allAdzunaJobs.length} jobs`);

    stats.jsearch.fetched = allJSearchJobs.length;
    stats.adzuna.fetched = allAdzunaJobs.length;

    // -----------------------------------------------------------------------
    // 2. Fetch FREE sources in parallel
    // -----------------------------------------------------------------------
    const [remotiveJobs, arbeitnowJobs, remoteokJobs, wwrJobs] = await Promise.all([
      fetchRemotive().catch((err) => {
        console.warn('Remotive source failed entirely:', err);
        return [] as NormalizedJob[];
      }),
      fetchArbeitnow().catch((err) => {
        console.warn('Arbeitnow source failed entirely:', err);
        return [] as NormalizedJob[];
      }),
      fetchRemoteOK().catch((err) => {
        console.warn('RemoteOK source failed entirely:', err);
        return [] as NormalizedJob[];
      }),
      fetchWeWorkRemotely().catch((err) => {
        console.warn('WeWorkRemotely source failed entirely:', err);
        return [] as NormalizedJob[];
      }),
    ]);

    stats.remotive.fetched = remotiveJobs.length;
    stats.arbeitnow.fetched = arbeitnowJobs.length;
    stats.remoteok.fetched = remoteokJobs.length;
    stats.weworkremotely.fetched = wwrJobs.length;

    // -----------------------------------------------------------------------
    // 3. Deduplicate by external_id before upserting
    // -----------------------------------------------------------------------
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
    const uniqueRemotive = dedup(remotiveJobs);
    const uniqueArbeitnow = dedup(arbeitnowJobs);
    const uniqueRemoteOK = dedup(remoteokJobs);
    const uniqueWWR = dedup(wwrJobs);

    // -----------------------------------------------------------------------
    // 4. Upsert all sources
    // -----------------------------------------------------------------------
    const allErrors: string[] = [];

    const upsertAndTrack = async (source: string, jobs: NormalizedJob[]) => {
      const result = await upsertJobs(supabase, jobs);
      stats[source].upserted = result.upserted;
      if (result.errors.length > 0) allErrors.push(...result.errors);
    };

    await upsertAndTrack('jsearch', uniqueJSearch);
    await upsertAndTrack('adzuna', uniqueAdzuna);
    await upsertAndTrack('remotive', uniqueRemotive);
    await upsertAndTrack('arbeitnow', uniqueArbeitnow);
    await upsertAndTrack('remoteok', uniqueRemoteOK);
    await upsertAndTrack('weworkremotely', uniqueWWR);

    // -----------------------------------------------------------------------
    // 5. Log summary
    // -----------------------------------------------------------------------
    const summaryParts = Object.entries(stats)
      .map(([source, s]) => `${source}: ${s.fetched} fetched / ${s.upserted} upserted`)
      .join(', ');
    console.log(`Job sync complete — ${summaryParts}`);

    const totalFetched = Object.values(stats).reduce((sum, s) => sum + s.fetched, 0);
    const totalUpserted = Object.values(stats).reduce((sum, s) => sum + s.upserted, 0);

    return NextResponse.json({
      ok: true,
      total: { fetched: totalFetched, upserted: totalUpserted },
      ...(allErrors.length > 0 ? { errors: allErrors } : {}),
      jsearch: stats.jsearch,
      adzuna: stats.adzuna,
      remotive: stats.remotive,
      arbeitnow: stats.arbeitnow,
      remoteok: stats.remoteok,
      weworkremotely: stats.weworkremotely,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Job sync cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
