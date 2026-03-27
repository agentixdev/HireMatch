/**
 * @jest-environment node
 *
 * E2E Integration Tests: Tenant Onboarding Flow
 *
 * Tests the full recruiter onboarding lifecycle:
 * - Create/update recruiter via onboarding endpoint
 * - AI tag generation (Gemini) with fallback
 * - Auth checks
 * - Validation
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockUpdateEq = jest.fn();
const mockSelectEqSingle = jest.fn();
const mockInsertSelectSingle = jest.fn();

const mockServiceFrom = jest.fn().mockImplementation(() => ({
  update: jest.fn().mockReturnValue({ eq: (...args: unknown[]) => mockUpdateEq(...args) }),
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({ single: (...args: unknown[]) => mockSelectEqSingle(...args) }),
  }),
  insert: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({ single: (...args: unknown[]) => mockInsertSelectSingle(...args) }),
  }),
}));

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
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: (...args: unknown[]) => mockSelectEqSingle(...args),
        }),
      }),
    }),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/recruiter/onboarding/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
    headers: new Map(),
  } as unknown as Request;
}

function resetMocks() {
  jest.clearAllMocks();
  mockUpdateEq.mockResolvedValue({ error: null });
  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        match_tags: ['react', 'typescript', 'startup'],
        suggested_culture_tags: ['fast-paced', 'collaborative'],
        company_archetype: 'innovator',
        culture_temperature: 'hot-startup',
        culture_summary: 'A fast-moving tech company focused on innovation.',
      }),
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Tenant Onboarding Flow', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ company_name: 'TestCo' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when company_name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Company name is required');
  });

  it('completes onboarding with AI-generated tags and culture analysis', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({
      company_name: 'Acme Corp',
      industry: 'Technology',
      company_size: '51-200',
      country: 'us',
      bio: 'We build amazing software products.',
      culture_tags: ['innovative', 'fast-paced'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.match_tags).toEqual(['react', 'typescript', 'startup']);
    expect(json.suggested_culture_tags).toEqual(['fast-paced', 'collaborative']);
    expect(json.company_archetype).toBe('innovator');
    expect(json.culture_temperature).toBe('hot-startup');
    expect(json.culture_summary).toBeDefined();
  });

  it('saves onboarding data to recruiters table via service client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await POST(makeRequest({
      company_name: 'Acme Corp',
      industry: 'Technology',
      company_size: '11-50',
      country: 'de',
      city: 'Berlin',
      bio: 'German tech startup',
      culture_tags: ['diverse', 'creative'],
      values_dna: { innovation: 90, collaboration: 80 },
      work_style: { remote_first: true },
      hiring_needs: { engineers: 5 },
    }));

    expect(mockServiceFrom).toHaveBeenCalledWith('recruiters');
    expect(mockUpdateEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('falls back to basic tags when Gemini AI fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

    const res = await POST(makeRequest({
      company_name: 'Fallback Corp',
      industry: 'Finance',
      culture_tags: ['Professional', 'Structured'],
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Fallback tags should include lowercased industry and culture_tags
    expect(json.match_tags).toContain('finance');
    expect(json.match_tags).toContain('professional');
    expect(json.match_tags).toContain('structured');
  });

  it('returns 500 when database update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUpdateEq.mockResolvedValue({ error: { message: 'DB connection failed' } });

    const res = await POST(makeRequest({ company_name: 'FailCo' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to save onboarding data');
  });

  it('handles optional fields gracefully (only company_name provided)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ company_name: 'Minimal Co' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.match_tags).toBeDefined();
    expect(Array.isArray(json.match_tags)).toBe(true);
  });

  it('sends correct data to Gemini prompt including all company fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    await POST(makeRequest({
      company_name: 'PromptTest Inc',
      industry: 'Healthcare',
      company_size: '201-500',
      country: 'gb',
      bio: 'Leading healthcare AI company',
      culture_tags: ['empathetic', 'data-driven'],
      values_dna: { patient_first: 100 },
      work_style: { hybrid: true },
    }));

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateContent.mock.calls[0][0];
    expect(promptArg).toContain('PromptTest Inc');
    expect(promptArg).toContain('Healthcare');
    expect(promptArg).toContain('201-500');
  });

  it('handles Gemini returning markdown-wrapped JSON', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => '```json\n{"match_tags":["node","express"],"suggested_culture_tags":["agile"],"company_archetype":"builder","culture_temperature":"balanced","culture_summary":"A solid team."}\n```',
      },
    });

    const res = await POST(makeRequest({ company_name: 'JSONTest Co' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.match_tags).toEqual(['node', 'express']);
    expect(json.company_archetype).toBe('builder');
  });

  it('sets onboarding_completed_at timestamp on update', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    // Capture the update call
    let capturedUpdateData: Record<string, unknown> | null = null;
    mockServiceFrom.mockImplementation(() => ({
      update: jest.fn().mockImplementation((data: Record<string, unknown>) => {
        capturedUpdateData = data;
        return { eq: mockUpdateEq };
      }),
    }));

    await POST(makeRequest({ company_name: 'TimestampCo' }));

    expect(capturedUpdateData).toBeDefined();
    expect(capturedUpdateData!.onboarding_completed_at).toBeDefined();
    expect(capturedUpdateData!.updated_at).toBeDefined();
    // Should be ISO date strings
    expect(typeof capturedUpdateData!.onboarding_completed_at).toBe('string');
  });
});
