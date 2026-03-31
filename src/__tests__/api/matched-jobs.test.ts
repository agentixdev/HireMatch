/**
 * @jest-environment node
 *
 * Unit tests for GET /api/candidate/matched-jobs
 *
 * Covers:
 * - Unauthenticated returns 401
 * - No candidate profile returns 404
 * - No jobs returns empty matches
 * - Successful matching with Gemini scoring
 * - Match persistence (upsert to matches table)
 * - Internal error returns 500
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockServiceFrom = jest.fn();
const mockServiceUpsert = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: () => {},
  }),
}));

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    }),
  })),
}));

jest.mock('@/lib/parse-json', () => ({
  parseLLMJson: (text: string) => JSON.parse(text),
}));

// ---------------------------------------------------------------------------
// Import AFTER mocks
// ---------------------------------------------------------------------------
import { GET } from '@/app/api/candidate/matched-jobs/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_USER = { id: 'user-456' };
const FAKE_CANDIDATE = {
  id: 'cand-2',
  full_name: 'Jane Dev',
  headline: 'Full Stack Developer',
  skills: ['React', 'Node.js', 'TypeScript'],
  experience_years: 5,
  match_tags: ['remote', 'startup'],
  bio: 'Passionate developer',
  country: 'us',
  remote_preference: 'remote',
  visa_status: 'citizen',
};

const FAKE_JOBS = [
  {
    id: 'job-1',
    title: 'Senior React Dev',
    description: 'Build UI',
    industry: 'Tech',
    skills_required: ['React', 'TypeScript'],
    match_tags: ['remote', 'startup'],
    city: 'SF',
    country: 'us',
    work_mode: 'remote',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    job_type: 'full-time',
    experience_min: 3,
    experience_max: 8,
    recruiter: { company_name: 'Acme Corp', company_logo_url: null },
  },
  {
    id: 'job-2',
    title: 'Backend Engineer',
    description: 'Build APIs',
    industry: 'Fintech',
    skills_required: ['Node.js', 'PostgreSQL'],
    match_tags: ['fintech'],
    city: 'NYC',
    country: 'us',
    work_mode: 'hybrid',
    salary_min: 100000,
    salary_max: 160000,
    salary_currency: 'USD',
    job_type: 'full-time',
    experience_min: 2,
    experience_max: 6,
    recruiter: { company_name: 'FinCo', company_logo_url: null },
  },
];

function chainBuilder(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.single = jest.fn().mockResolvedValue(result);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockResolvedValue(result);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/candidate/matched-jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 404 when no candidate profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: null }));

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns empty matches when no jobs exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: FAKE_CANDIDATE }));

    const jobsChain = chainBuilder({ data: [] });
    mockServiceFrom.mockReturnValue(jobsChain);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.matches).toEqual([]);
  });

  it('returns scored matches from Gemini', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: FAKE_CANDIDATE }));

    // Jobs query chain
    const jobsChain = chainBuilder({ data: FAKE_JOBS });
    // Matches upsert chain (fire-and-forget)
    const upsertChain = {
      upsert: jest.fn().mockReturnValue({
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      }),
    };

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'jobs') return jobsChain;
      if (table === 'matches') return upsertChain;
      return {};
    });

    const geminiResponse = {
      matches: [
        { job_index: 0, score: 92, skills_match: 95, experience_match: 88, culture_match: 90, why: 'Great React fit', tip: 'Mention TypeScript' },
        { job_index: 1, score: 78, skills_match: 70, experience_match: 85, culture_match: 80, why: 'Node.js overlap', tip: 'Show API work' },
      ],
    };
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(geminiResponse) },
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.matches).toHaveLength(2);
    expect(data.matches[0].score).toBe(92);
    expect(data.matches[0].job.id).toBe('job-1');
    expect(data.matches[0].job.title).toBe('Senior React Dev');
    expect(data.matches[1].score).toBe(78);
    expect(data.matches[1].job.id).toBe('job-2');
  });

  it('persists matches to DB via upsert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: FAKE_CANDIDATE }));

    const jobsChain = chainBuilder({ data: FAKE_JOBS });
    const mockUpsert = jest.fn().mockReturnValue({
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'jobs') return jobsChain;
      if (table === 'matches') return { upsert: mockUpsert };
      return {};
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          matches: [
            { job_index: 0, score: 90, skills_match: 95, experience_match: 85, culture_match: 88, why: 'Good', tip: 'Tip' },
          ],
        }),
      },
    });

    await GET();

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [rows, options] = mockUpsert.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].candidate_id).toBe('cand-2');
    expect(rows[0].job_id).toBe('job-1');
    expect(rows[0].score).toBe(90);
    expect(rows[0].breakdown).toEqual({ skills_match: 95, experience_match: 85, culture_match: 88 });
    expect(options).toEqual({ onConflict: 'candidate_id,job_id' });
  });

  it('filters out invalid job_index values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: FAKE_CANDIDATE }));

    const jobsChain = chainBuilder({ data: FAKE_JOBS });
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'jobs') return jobsChain;
      if (table === 'matches') return {
        upsert: jest.fn().mockReturnValue({
          then: (resolve: (v: unknown) => void) => resolve({ error: null }),
        }),
      };
      return {};
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          matches: [
            { job_index: 0, score: 92, skills_match: 90, experience_match: 90, culture_match: 90, why: 'Good', tip: 'Tip' },
            { job_index: 999, score: 50, skills_match: 50, experience_match: 50, culture_match: 50, why: 'Bad', tip: 'N/A' }, // invalid
            { job_index: -1, score: 40, skills_match: 40, experience_match: 40, culture_match: 40, why: 'Bad', tip: 'N/A' }, // invalid
          ],
        }),
      },
    });

    const res = await GET();
    const data = await res.json();
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].job.id).toBe('job-1');
  });

  it('returns 500 on internal error', async () => {
    mockGetUser.mockRejectedValue(new Error('Boom'));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
