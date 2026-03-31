/**
 * @jest-environment node
 *
 * Unit tests for POST /api/candidate/apply
 *
 * Covers:
 * - Unauthenticated returns 401
 * - Missing job_id or method returns 400
 * - No candidate profile returns 404
 * - Job not found returns 404
 * - Quick apply creates application row
 * - Quick apply updates existing application
 * - AI boost calls Gemini and returns cover letter
 * - Increments applications count
 * - Internal error returns 500
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockServiceFrom = jest.fn();
const mockServiceRpc = jest.fn();
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
    rpc: (...args: unknown[]) => mockServiceRpc(...args),
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
import { POST } from '@/app/api/candidate/apply/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

const FAKE_USER = { id: 'user-123' };
const FAKE_CANDIDATE = {
  id: 'cand-1',
  full_name: 'Test User',
  headline: 'Developer',
  skills: ['TypeScript', 'React'],
  experience_years: 5,
  bio: 'Great developer',
};
const FAKE_JOB = {
  id: 'job-1',
  title: 'Senior Dev',
  description: 'Build things',
  company_name: 'Acme',
  skills_required: ['TypeScript'],
  industry: 'Tech',
  recruiter_id: 'rec-1',
  external_url: 'https://example.com/apply',
};

// Chain builder helper for Supabase queries
function chainBuilder(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.single = jest.fn().mockResolvedValue(result);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.insert = jest.fn().mockReturnValue(chain);
  chain.update = jest.fn().mockReturnValue(chain);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/candidate/apply', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceRpc.mockResolvedValue({});
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ job_id: 'j1', method: 'quick' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when job_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const res = await POST(makeRequest({ method: 'quick' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when method is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const res = await POST(makeRequest({ job_id: 'j1' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when candidate profile not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: null }));

    const res = await POST(makeRequest({ job_id: 'j1', method: 'quick' }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('No candidate profile found');
  });

  it('returns 404 when job not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    // First call (candidates) returns candidate, second call (jobs) returns null
    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chainBuilder({ data: FAKE_CANDIDATE });
      return chainBuilder({ data: null }); // existing app check
    });
    mockServiceFrom.mockReturnValue(chainBuilder({ data: null }));

    const res = await POST(makeRequest({ job_id: 'nonexistent', method: 'quick' }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Job not found');
  });

  it('creates new application on quick apply', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const insertChain = chainBuilder({ data: { id: 'app-1' } });
    let supabaseCallCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      supabaseCallCount++;
      if (supabaseCallCount === 1) return chainBuilder({ data: FAKE_CANDIDATE }); // candidates
      if (supabaseCallCount === 2) return chainBuilder({ data: null }); // existing app check
      return insertChain; // insert
    });
    mockServiceFrom.mockReturnValue(chainBuilder({ data: FAKE_JOB }));

    const res = await POST(makeRequest({ job_id: 'job-1', method: 'quick' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.application_id).toBe('app-1');
  });

  it('updates existing application on quick apply', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const updateChain = chainBuilder({ data: null });
    let supabaseCallCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      supabaseCallCount++;
      if (supabaseCallCount === 1) return chainBuilder({ data: FAKE_CANDIDATE });
      if (supabaseCallCount === 2) return chainBuilder({ data: { id: 'existing-app' } }); // existing app
      return updateChain; // update
    });
    mockServiceFrom.mockReturnValue(chainBuilder({ data: FAKE_JOB }));

    const res = await POST(makeRequest({ job_id: 'job-1', method: 'quick' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.application_id).toBe('existing-app');
  });

  it('generates cover letter on ai_boost apply', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const insertChain = chainBuilder({ data: { id: 'app-2' } });
    let supabaseCallCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      supabaseCallCount++;
      if (supabaseCallCount === 1) return chainBuilder({ data: FAKE_CANDIDATE });
      if (supabaseCallCount === 2) return chainBuilder({ data: null }); // no existing app
      return insertChain;
    });
    mockServiceFrom.mockReturnValue(chainBuilder({ data: FAKE_JOB }));

    const aiResponse = {
      cover_letter: 'Dear Hiring Manager...',
      talking_points: ['Strong TypeScript', 'React expert'],
      skills_gap: ['Go'],
    };
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(aiResponse) },
    });

    const res = await POST(makeRequest({ job_id: 'job-1', method: 'ai_boost' }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.cover_letter).toBe('Dear Hiring Manager...');
    expect(data.talking_points).toEqual(['Strong TypeScript', 'React expert']);
    expect(data.skills_gap).toEqual(['Go']);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('calls increment_applications rpc', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const insertChain = chainBuilder({ data: { id: 'app-3' } });
    let supabaseCallCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      supabaseCallCount++;
      if (supabaseCallCount === 1) return chainBuilder({ data: FAKE_CANDIDATE });
      if (supabaseCallCount === 2) return chainBuilder({ data: null });
      return insertChain;
    });
    mockServiceFrom.mockReturnValue(chainBuilder({ data: FAKE_JOB }));
    mockServiceRpc.mockResolvedValue({});

    await POST(makeRequest({ job_id: 'job-1', method: 'quick' }));

    // rpc is fire-and-forget with .then(() => {}, () => {})
    expect(mockServiceRpc).toHaveBeenCalledWith('increment_applications', { job_id: 'job-1' });
  });

  it('returns 500 on internal error', async () => {
    mockGetUser.mockRejectedValue(new Error('Auth service down'));

    const res = await POST(makeRequest({ job_id: 'j1', method: 'quick' }));
    expect(res.status).toBe(500);
  });
});
