/**
 * @jest-environment node
 *
 * E2E Integration Tests: Matching Pipeline
 *
 * Tests single and bulk candidate-job matching with score breakdowns,
 * skill overlap, visa eligibility, and cross-country matching.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServerFrom = jest.fn();
const mockServiceFrom = jest.fn();
const mockGenerateContent = jest.fn();

/**
 * Build a fully-chainable Supabase query mock.
 * Every method returns the chain itself; `await chain` resolves via `.then()`.
 */
function buildQueryChain(resolvedData: unknown[]) {
  const chain: any = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'overlaps', 'order', 'limit', 'single'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
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

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const RECRUITER = {
  id: 'rec-1',
  company_name: 'TechGlobal',
  industry: 'Technology',
  culture_tags: ['innovative', 'collaborative'],
  match_tags: ['react', 'typescript', 'senior', 'startup', 'agile'],
  values_dna: { innovation: 90, teamwork: 80 },
  work_style: { remote_first: true },
};

function makeCandidates() {
  return [
    {
      id: 'c-perfect',
      full_name: 'Perfect Match',
      headline: 'Senior React Developer',
      photo_url: null,
      skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
      experience_years: 8,
      country: 'us',
      city: 'San Francisco',
      match_tags: ['react', 'typescript', 'senior', 'startup'],
      bio: 'Expert in React ecosystems with startup experience.',
      remote_preference: 'remote',
      visa_status: 'citizen',
      languages: ['English'],
      education: [{ institution: 'Stanford', degree: 'MS', field: 'CS' }],
      available_now: true,
    },
    {
      id: 'c-no-overlap',
      full_name: 'No Overlap',
      headline: 'Marketing Manager',
      photo_url: null,
      skills: ['SEO', 'Content Marketing', 'Social Media'],
      experience_years: 6,
      country: 'us',
      city: 'Chicago',
      match_tags: ['marketing', 'content', 'seo'],
      bio: 'Marketing professional with no tech skills.',
      remote_preference: 'onsite',
      visa_status: 'citizen',
      languages: ['English'],
      education: [],
      available_now: true,
    },
    {
      id: 'c-visa-needed',
      full_name: 'Visa Candidate',
      headline: 'Full Stack Developer',
      photo_url: null,
      skills: ['React', 'Python', 'Docker'],
      experience_years: 4,
      country: 'in',
      city: 'Bangalore',
      match_tags: ['react', 'python', 'fullstack'],
      bio: 'Full stack dev needing visa sponsorship.',
      remote_preference: 'any',
      visa_status: 'needs_sponsorship',
      languages: ['English', 'Hindi'],
      education: [],
      available_now: true,
    },
    {
      id: 'c-germany',
      full_name: 'Berlin Dev',
      headline: 'Backend Engineer',
      photo_url: null,
      skills: ['Java', 'Kotlin', 'Spring Boot'],
      experience_years: 7,
      country: 'de',
      city: 'Berlin',
      match_tags: ['java', 'backend', 'senior'],
      bio: 'Java backend specialist in Berlin.',
      remote_preference: 'hybrid',
      visa_status: 'citizen',
      languages: ['English', 'German'],
      education: [],
      available_now: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request;
}

function setupDefaultMocks(candidates = makeCandidates()) {
  jest.clearAllMocks();

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

  mockServerFrom.mockImplementation((table: string) => {
    if (table === 'recruiters') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: RECRUITER, error: null }),
          }),
        }),
      };
    }
    return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
  });

  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'candidates') {
      return buildQueryChain(candidates);
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

function setupAIScores(scores: Array<{
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
}>) {
  mockGenerateContent.mockResolvedValue({
    response: { text: () => JSON.stringify({ scores }) },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Matching Pipeline', () => {
  it('single candidate-job match returns score, breakdown, and explanation', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 92, skills_score: 98, experience_score: 85, culture_score: 90, values_score: 88, location_score: 75, explanation: 'Excellent React skills and strong culture fit.', highlights: ['Expert React developer', '8 years experience'], concerns: [] },
      { index: 1, overall_score: 15, skills_score: 0, experience_score: 50, culture_score: 10, values_score: 20, location_score: 80, explanation: 'No technical skill overlap.', highlights: [], concerns: ['No relevant technical skills'] },
      { index: 2, overall_score: 68, skills_score: 70, experience_score: 55, culture_score: 65, values_score: 60, location_score: 40, explanation: 'Decent tech fit but needs visa sponsorship.', highlights: ['React experience'], concerns: ['Needs visa sponsorship'] },
      { index: 3, overall_score: 45, skills_score: 20, experience_score: 70, culture_score: 50, values_score: 55, location_score: 30, explanation: 'Java backend - different stack.', highlights: ['Senior experience'], concerns: ['Different tech stack'] },
    ]);

    const res = await matchmakerPOST(makeRequest({
      job_title: 'Senior React Developer',
      must_have_skills: ['React', 'TypeScript'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.total_scanned).toBe(4);

    const topMatch = json.matches[0];
    expect(topMatch.score).toBe(92);
    expect(topMatch.breakdown.skills_score).toBe(98);
    expect(topMatch.breakdown.experience_score).toBe(85);
    expect(topMatch.breakdown.culture_score).toBe(90);
    expect(topMatch.explanation).toContain('React');
    expect(topMatch.highlights).toHaveLength(2);
    expect(topMatch.concerns).toEqual([]);
  });

  it('matches are sorted by score descending', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 92, skills_score: 95, experience_score: 85, culture_score: 90, values_score: 88, location_score: 75, explanation: 'Top', highlights: [], concerns: [] },
      { index: 1, overall_score: 15, skills_score: 0, experience_score: 50, culture_score: 10, values_score: 20, location_score: 80, explanation: 'Low', highlights: [], concerns: [] },
      { index: 2, overall_score: 68, skills_score: 70, experience_score: 55, culture_score: 65, values_score: 60, location_score: 40, explanation: 'Mid', highlights: [], concerns: [] },
      { index: 3, overall_score: 45, skills_score: 20, experience_score: 70, culture_score: 50, values_score: 55, location_score: 30, explanation: 'Low-Mid', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({ job_title: 'Dev', must_have_skills: ['React'] }));
    const json = await res.json();

    const scores = json.matches.map((m: any) => m.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it('match with perfect skill overlap yields high skills_score', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 96, skills_score: 100, experience_score: 90, culture_score: 95, values_score: 90, location_score: 85, explanation: 'Perfect', highlights: ['All skills match'], concerns: [] },
      { index: 1, overall_score: 10, skills_score: 0, experience_score: 50, culture_score: 10, values_score: 10, location_score: 50, explanation: 'No overlap', highlights: [], concerns: [] },
      { index: 2, overall_score: 50, skills_score: 50, experience_score: 40, culture_score: 50, values_score: 50, location_score: 30, explanation: 'Partial', highlights: [], concerns: [] },
      { index: 3, overall_score: 30, skills_score: 10, experience_score: 70, culture_score: 40, values_score: 40, location_score: 30, explanation: 'Different', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({
      job_title: 'React Developer',
      must_have_skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    }));
    const json = await res.json();

    const perfect = json.matches.find((m: any) => m.candidate_id === 'c-perfect');
    expect(perfect).toBeDefined();
    expect(perfect.breakdown.skills_score).toBe(100);
  });

  it('match with no skill overlap yields low score', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 30, skills_score: 10, experience_score: 70, culture_score: 40, values_score: 30, location_score: 50, explanation: 'Low match', highlights: [], concerns: [] },
      { index: 1, overall_score: 5, skills_score: 0, experience_score: 40, culture_score: 5, values_score: 5, location_score: 50, explanation: 'Zero skills', highlights: [], concerns: ['Wrong domain'] },
      { index: 2, overall_score: 20, skills_score: 15, experience_score: 30, culture_score: 20, values_score: 20, location_score: 10, explanation: 'Poor fit', highlights: [], concerns: [] },
      { index: 3, overall_score: 25, skills_score: 5, experience_score: 60, culture_score: 30, values_score: 25, location_score: 20, explanation: 'Wrong stack', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({
      job_title: 'Marketing Manager',
      must_have_skills: ['SEO', 'Content Marketing'],
    }));
    const json = await res.json();

    // The marketing candidate (c-no-overlap) should appear, and developers should score low
    const devCandidate = json.matches.find((m: any) => m.candidate_id === 'c-perfect');
    expect(devCandidate).toBeDefined();
    expect(devCandidate.score).toBeLessThanOrEqual(30);
  });

  it('candidate needing visa sponsorship is flagged in concerns', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 85, skills_score: 90, experience_score: 80, culture_score: 85, values_score: 80, location_score: 70, explanation: 'Great', highlights: [], concerns: [] },
      { index: 1, overall_score: 15, skills_score: 0, experience_score: 50, culture_score: 10, values_score: 20, location_score: 80, explanation: 'Low', highlights: [], concerns: [] },
      { index: 2, overall_score: 72, skills_score: 75, experience_score: 60, culture_score: 70, values_score: 65, location_score: 45, explanation: 'Good tech but needs H-1B visa', highlights: ['React skills'], concerns: ['Requires visa sponsorship'] },
      { index: 3, overall_score: 40, skills_score: 20, experience_score: 65, culture_score: 45, values_score: 40, location_score: 25, explanation: 'Different stack', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({
      job_title: 'React Developer',
      must_have_skills: ['React'],
      work_preferences: { visa_sponsor: false },
    }));
    const json = await res.json();

    const visaCandidate = json.matches.find((m: any) => m.candidate_id === 'c-visa-needed');
    expect(visaCandidate).toBeDefined();
    expect(visaCandidate.concerns.some((c: string) => c.toLowerCase().includes('visa'))).toBe(true);
  });

  it('matches across different countries return varying location_scores', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 88, skills_score: 90, experience_score: 85, culture_score: 85, values_score: 80, location_score: 90, explanation: 'Same country', highlights: [], concerns: [] },
      { index: 1, overall_score: 20, skills_score: 5, experience_score: 50, culture_score: 10, values_score: 15, location_score: 80, explanation: 'Low', highlights: [], concerns: [] },
      { index: 2, overall_score: 65, skills_score: 70, experience_score: 55, culture_score: 60, values_score: 55, location_score: 30, explanation: 'Different country', highlights: [], concerns: [] },
      { index: 3, overall_score: 50, skills_score: 25, experience_score: 70, culture_score: 50, values_score: 45, location_score: 20, explanation: 'Remote from Germany', highlights: [], concerns: ['Different timezone'] },
    ]);

    const res = await matchmakerPOST(makeRequest({
      job_title: 'Developer',
      must_have_skills: ['React'],
      country_filter: 'all',
    }));
    const json = await res.json();

    const usCandidate = json.matches.find((m: any) => m.candidate_id === 'c-perfect');
    const deCandidate = json.matches.find((m: any) => m.candidate_id === 'c-germany');
    expect(usCandidate).toBeDefined();
    expect(deCandidate).toBeDefined();
    expect(usCandidate.breakdown.location_score).toBeGreaterThan(deCandidate.breakdown.location_score);
  });

  it('scores are clamped between 0 and 100', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 150, skills_score: 100, experience_score: 100, culture_score: 100, values_score: 100, location_score: 100, explanation: 'Over 100', highlights: [], concerns: [] },
      { index: 1, overall_score: -10, skills_score: 0, experience_score: 0, culture_score: 0, values_score: 0, location_score: 0, explanation: 'Under 0', highlights: [], concerns: [] },
      { index: 2, overall_score: 50, skills_score: 50, experience_score: 50, culture_score: 50, values_score: 50, location_score: 50, explanation: 'Normal', highlights: [], concerns: [] },
      { index: 3, overall_score: 40, skills_score: 40, experience_score: 40, culture_score: 40, values_score: 40, location_score: 40, explanation: 'Normal', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({ job_title: 'Dev', must_have_skills: ['React'] }));
    const json = await res.json();

    for (const match of json.matches) {
      expect(match.score).toBeGreaterThanOrEqual(0);
      expect(match.score).toBeLessThanOrEqual(100);
    }
  });

  it('saves match results and returns result_id', async () => {
    setupDefaultMocks();
    setupAIScores([
      { index: 0, overall_score: 85, skills_score: 90, experience_score: 80, culture_score: 85, values_score: 80, location_score: 70, explanation: 'Good', highlights: [], concerns: [] },
      { index: 1, overall_score: 20, skills_score: 5, experience_score: 45, culture_score: 10, values_score: 15, location_score: 70, explanation: 'Low', highlights: [], concerns: [] },
      { index: 2, overall_score: 65, skills_score: 70, experience_score: 55, culture_score: 60, values_score: 55, location_score: 35, explanation: 'Mid', highlights: [], concerns: [] },
      { index: 3, overall_score: 45, skills_score: 20, experience_score: 65, culture_score: 45, values_score: 40, location_score: 25, explanation: 'OK', highlights: [], concerns: [] },
    ]);

    const res = await matchmakerPOST(makeRequest({ job_title: 'Dev', must_have_skills: ['React'] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.result_id).toBe('result-1');
    expect(json.total_scanned).toBe(4);
    expect(json.matches.length).toBeLessThanOrEqual(25);
  });

  it('fallback scoring when Gemini fails calculates skill overlap', async () => {
    const singleCandidate = [{
      id: 'c-test',
      full_name: 'Test User',
      headline: 'Dev',
      photo_url: null,
      skills: ['React', 'TypeScript', 'Python'],
      experience_years: 5,
      country: 'us',
      city: 'NYC',
      match_tags: ['react', 'typescript'],
      bio: 'Test',
      remote_preference: 'remote',
      visa_status: 'citizen',
      languages: ['English'],
      education: [],
      available_now: true,
    }];

    setupDefaultMocks(singleCandidate);
    mockGenerateContent.mockRejectedValue(new Error('AI down'));

    const res = await matchmakerPOST(makeRequest({
      job_title: 'React Developer',
      must_have_skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    const match = json.matches[0];
    // 2 out of 4 must-have skills match => skills_score = (2/4)*100 = 50
    expect(match.breakdown.skills_score).toBe(50);
    expect(match.explanation).toContain('fallback');
  });
});
