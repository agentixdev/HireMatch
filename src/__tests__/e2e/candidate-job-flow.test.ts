/**
 * @jest-environment node
 *
 * E2E Integration Tests: Candidate & Job Pipeline
 *
 * Tests candidate listing, filtering, search, and job operations
 * through the matchmaker and matches endpoints.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();

/**
 * Build a fully-chainable Supabase query mock.
 * Every method returns the chain itself; `await chain` resolves via `.then()`.
 */
function buildCandidateChain(resolvedData: unknown[]) {
  const chain: any = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'overlaps', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Make thenable so `await query` works
  chain.then = (onFulfilled: Function) =>
    Promise.resolve({ data: resolvedData, error: null }).then(onFulfilled as any);
  return chain;
}

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

const mockServerFrom = jest.fn();
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

const mockServiceFrom = jest.fn();

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { POST as matchmakerPOST } from '@/app/api/recruiter/matchmaker/route';
import { GET as matchesGET } from '@/app/api/recruiter/matches/route';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_CANDIDATES = [
  {
    id: 'c-1',
    full_name: 'Alice Johnson',
    headline: 'Senior React Developer',
    photo_url: null,
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    experience_years: 8,
    country: 'us',
    city: 'New York',
    match_tags: ['react', 'frontend', 'senior'],
    bio: 'Experienced frontend developer with focus on React ecosystems.',
    remote_preference: 'remote',
    visa_status: 'citizen',
    languages: ['English'],
    education: [{ institution: 'MIT', degree: 'BS', field: 'CS' }],
    available_now: true,
  },
  {
    id: 'c-2',
    full_name: 'Bob Muller',
    headline: 'DevOps Engineer',
    photo_url: null,
    skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
    experience_years: 5,
    country: 'de',
    city: 'Berlin',
    match_tags: ['devops', 'cloud', 'infrastructure'],
    bio: 'Cloud infrastructure specialist.',
    remote_preference: 'hybrid',
    visa_status: 'permanent_resident',
    languages: ['English', 'German'],
    education: [],
    available_now: false,
  },
  {
    id: 'c-3',
    full_name: 'Carla Diaz',
    headline: 'Junior Python Developer',
    photo_url: null,
    skills: ['Python', 'Django', 'SQL'],
    experience_years: 2,
    country: 'mx',
    city: 'Mexico City',
    match_tags: ['python', 'backend', 'junior'],
    bio: 'Eager Python developer looking for opportunities.',
    remote_preference: 'any',
    visa_status: 'needs_sponsorship',
    languages: ['English', 'Spanish'],
    education: [],
    available_now: true,
  },
];

const MOCK_RECRUITER = {
  id: 'rec-1',
  company_name: 'TestCo',
  industry: 'Technology',
  culture_tags: ['innovative', 'fast-paced'],
  match_tags: ['react', 'frontend', 'senior', 'startup'],
  values_dna: { innovation: 90 },
  work_style: { remote_first: true },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request;
}

function setupRecruiterMock(recruiterData: any = MOCK_RECRUITER) {
  mockServerFrom.mockImplementation((table: string) => {
    if (table === 'recruiters') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: recruiterData, error: null }),
          }),
        }),
      };
    }
    if (table === 'recruiter_match_results') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    }
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
}

function setupServiceMocks(candidates: any[] = MOCK_CANDIDATES) {
  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'candidates') {
      return buildCandidateChain(candidates);
    }
    if (table === 'recruiter_match_results') {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'result-1' }, error: null }),
          }),
        }),
      };
    }
    return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

function resetMocks() {
  jest.clearAllMocks();

  setupRecruiterMock();
  setupServiceMocks();

  // Default Gemini response
  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        scores: MOCK_CANDIDATES.map((c, i) => ({
          index: i,
          overall_score: 90 - i * 20,
          skills_score: 95 - i * 15,
          experience_score: 80 - i * 10,
          culture_score: 85 - i * 20,
          values_score: 70,
          location_score: 60,
          explanation: `Good match for ${c.full_name}`,
          highlights: c.skills.slice(0, 2),
          concerns: i === 2 ? ['Needs visa sponsorship'] : [],
        })),
      }),
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Candidate & Job Pipeline', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 401 when user is not authenticated for matchmaker', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await matchmakerPOST(makeRequest({ job_title: 'Engineer' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 403 when user is not a recruiter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    setupRecruiterMock(null);

    const res = await matchmakerPOST(makeRequest({ job_title: 'Engineer' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe('Not a recruiter');
  });

  it('returns 400 when job_title is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await matchmakerPOST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Job title is required');
  });

  it('lists candidates with filters and returns scored matches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await matchmakerPOST(makeRequest({
      job_title: 'Senior React Developer',
      job_description: 'We need a strong React developer',
      must_have_skills: ['React', 'TypeScript'],
      nice_to_have_skills: ['GraphQL'],
      experience_range: { min: 3, max: 15 },
      country_filter: 'all',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total_scanned).toBe(3);
    expect(json.matches).toHaveLength(3);
    // Matches should be sorted by score descending
    expect(json.matches[0].score).toBeGreaterThanOrEqual(json.matches[1].score);
    expect(json.matches[1].score).toBeGreaterThanOrEqual(json.matches[2].score);
  });

  it('returns match breakdown with all score dimensions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await matchmakerPOST(makeRequest({
      job_title: 'Frontend Engineer',
      must_have_skills: ['React'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    const firstMatch = json.matches[0];
    expect(firstMatch.breakdown).toBeDefined();
    expect(firstMatch.breakdown.skills_score).toBeDefined();
    expect(firstMatch.breakdown.experience_score).toBeDefined();
    expect(firstMatch.breakdown.culture_score).toBeDefined();
    expect(firstMatch.breakdown.values_score).toBeDefined();
    expect(firstMatch.breakdown.location_score).toBeDefined();
    expect(firstMatch.explanation).toBeDefined();
    expect(firstMatch.highlights).toBeDefined();
    expect(Array.isArray(firstMatch.highlights)).toBe(true);
  });

  it('filters candidates by country when country_filter is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const eqCalls: Array<[string, unknown]> = [];
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'candidates') {
        const chain: any = {};
        const methods = ['select', 'gte', 'lte', 'overlaps', 'order', 'limit', 'single'];
        for (const m of methods) {
          chain[m] = jest.fn().mockReturnValue(chain);
        }
        chain.eq = jest.fn().mockImplementation((field: string, value: unknown) => {
          eqCalls.push([field, value]);
          return chain;
        });
        chain.then = (onFulfilled: Function) =>
          Promise.resolve({ data: [MOCK_CANDIDATES[0]], error: null }).then(onFulfilled as any);
        return chain;
      }
      if (table === 'recruiter_match_results') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'r-1' }, error: null }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    await matchmakerPOST(makeRequest({
      job_title: 'React Dev',
      country_filter: 'us',
    }));

    const countryEq = eqCalls.find(([field]) => field === 'country');
    expect(countryEq).toBeDefined();
    expect(countryEq![1]).toBe('us');
  });

  it('returns empty matches when no candidates in pool', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    setupServiceMocks([]);

    const res = await matchmakerPOST(makeRequest({ job_title: 'Rare Skill' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total_scanned).toBe(0);
    expect(json.matches).toEqual([]);
  });

  it('uses fallback scoring when Gemini AI fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockGenerateContent.mockRejectedValue(new Error('AI timeout'));

    const res = await matchmakerPOST(makeRequest({
      job_title: 'React Developer',
      must_have_skills: ['React', 'TypeScript'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.matches.length).toBeGreaterThan(0);
    expect(json.matches[0].explanation).toContain('fallback');
  });

  // -- Matches GET tests --

  it('fetches saved match results for authenticated recruiter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const mockResults = [
      { id: 'mr-1', quiz_answers: {}, candidates: [], total_scanned: 10, created_at: '2026-03-01T00:00:00Z' },
      { id: 'mr-2', quiz_answers: {}, candidates: [], total_scanned: 5, created_at: '2026-03-02T00:00:00Z' },
    ];

    mockServerFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'recruiter_match_results') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockResults, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const res = await matchesGET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.results).toHaveLength(2);
    expect(json.results[0].id).toBe('mr-1');
  });

  it('returns 401 when fetching matches without auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await matchesGET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });
});
