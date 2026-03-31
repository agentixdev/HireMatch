/**
 * @jest-environment node
 *
 * E2E Flow: Recruiter Onboarding → Dashboard → Analytics
 *
 * Tests the full recruiter journey from onboarding through talent matching,
 * application management, analytics, and notifications.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServerFrom = jest.fn();
const mockServiceFrom = jest.fn();

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

const mockServiceAuthAdminGetUserById = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
    auth: { admin: { getUserById: (...args: unknown[]) => mockServiceAuthAdminGetUserById(...args) } },
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

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 9, reset: Date.now() + 60000 }),
  createRateLimiter: jest.fn().mockReturnValue(() => ({
    success: true,
    remaining: 29,
    reset: Date.now() + 60000,
  })),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

jest.mock('@/lib/parse-json', () => ({
  parseLLMJson: jest.fn().mockImplementation((text: string) => JSON.parse(text)),
}));

const mockSendStatusUpdateEmail = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/email', () => ({
  sendStatusUpdateEmail: (...args: unknown[]) => mockSendStatusUpdateEmail(...args),
}));

const mockCreateNotification = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/webhooks', () => ({
  fireWebhooks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { POST as onboardingPOST } from '@/app/api/recruiter/onboarding/route';
import { POST as matchmakerPOST } from '@/app/api/recruiter/matchmaker/route';
import { GET as analyticsGET } from '@/app/api/recruiter/analytics/route';
import { PATCH as statusPATCH } from '@/app/api/applications/[id]/status/route';
import { GET as notificationsGET, POST as notificationsPOST } from '@/app/api/notifications/route';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_RECRUITER = {
  id: 'rec-1',
  user_id: 'user-1',
  company_name: 'TestCo',
  industry: 'Technology',
  culture_tags: ['innovative', 'fast-paced'],
  match_tags: ['react', 'frontend', 'senior', 'startup'],
  values_dna: { innovation: 90 },
  work_style: { remote_first: true },
};

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

const MOCK_APPLICATION = {
  id: 'app-1',
  candidate_id: 'c-1',
  job_id: 'job-1',
  recruiter_id: 'rec-1',
  status: 'applied',
  match_score: 85,
  status_history: [
    { status: 'applied', changed_at: '2026-01-15T00:00:00Z', changed_by: 'c-1' },
  ],
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const MOCK_APPLICATIONS = [
  {
    id: 'app-1',
    status: 'hired',
    match_score: 85,
    created_at: '2026-01-15T00:00:00Z',
    job_id: 'job-1',
    recruiter_id: 'rec-1',
    status_history: [
      { status: 'applied', changed_at: '2026-01-15T00:00:00Z' },
      { status: 'reviewed', changed_at: '2026-01-16T00:00:00Z' },
      { status: 'shortlisted', changed_at: '2026-01-18T00:00:00Z' },
      { status: 'hired', changed_at: '2026-01-25T00:00:00Z' },
    ],
  },
  {
    id: 'app-2',
    status: 'shortlisted',
    match_score: 72,
    created_at: '2026-02-01T00:00:00Z',
    job_id: 'job-1',
    recruiter_id: 'rec-1',
    status_history: [
      { status: 'applied', changed_at: '2026-02-01T00:00:00Z' },
      { status: 'reviewed', changed_at: '2026-02-02T00:00:00Z' },
      { status: 'shortlisted', changed_at: '2026-02-05T00:00:00Z' },
    ],
  },
  {
    id: 'app-3',
    status: 'applied',
    match_score: 60,
    created_at: '2026-02-10T00:00:00Z',
    job_id: 'job-2',
    recruiter_id: 'rec-1',
    status_history: [
      { status: 'applied', changed_at: '2026-02-10T00:00:00Z' },
    ],
  },
  {
    id: 'app-4',
    status: 'rejected',
    match_score: 40,
    created_at: '2026-02-15T00:00:00Z',
    job_id: 'job-2',
    recruiter_id: 'rec-1',
    status_history: [
      { status: 'applied', changed_at: '2026-02-15T00:00:00Z' },
      { status: 'reviewed', changed_at: '2026-02-16T00:00:00Z' },
      { status: 'rejected', changed_at: '2026-02-18T00:00:00Z' },
    ],
  },
];

const MOCK_JOBS = [
  {
    id: 'job-1',
    title: 'Senior React Developer',
    views_count: 200,
    applications_count: 15,
    is_active: true,
    created_at: '2026-01-10T00:00:00Z',
    recruiter_id: 'rec-1',
  },
  {
    id: 'job-2',
    title: 'DevOps Engineer',
    views_count: 100,
    applications_count: 8,
    is_active: false,
    created_at: '2026-01-20T00:00:00Z',
    recruiter_id: 'rec-1',
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    type: 'application_update',
    title: 'Application shortlisted',
    body: 'Your application has been shortlisted',
    is_read: false,
    link: '/dashboard/candidate/applications',
    metadata: {},
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    type: 'match_found',
    title: 'New match',
    body: 'You have a new job match',
    is_read: true,
    link: '/dashboard/candidate/matches',
    metadata: {},
    created_at: '2026-02-28T00:00:00Z',
  },
  {
    id: 'notif-3',
    user_id: 'user-1',
    type: 'system',
    title: 'Welcome',
    body: 'Welcome to HireMatch',
    is_read: false,
    link: null,
    metadata: {},
    created_at: '2026-02-27T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildChain(resolvedData: unknown, resolvedError: unknown = null) {
  const chain: any = {};
  const methods = [
    'select', 'eq', 'gte', 'lte', 'overlaps', 'order', 'limit',
    'single', 'range', 'in', 'update', 'insert',
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = (onFulfilled: Function) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).then(onFulfilled as any);
  return chain;
}

function makeRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request;
}

function makeGetRequest(url: string): Request {
  return { url } as unknown as Request;
}

function authenticateUser(userId = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
}

function unauthenticateUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Recruiter Journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Step 1: Recruiter Onboarding
  // =========================================================================

  describe('Step 1: Recruiter Onboarding', () => {
    beforeEach(() => {
      // Default: service client update succeeds
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return buildChain(null);
      });
    });

    it('saves company profile with AI-generated tags', async () => {
      authenticateUser();

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            match_tags: ['react', 'frontend', 'startup', 'technology'],
            suggested_culture_tags: ['agile', 'flat-hierarchy'],
            company_archetype: 'innovator',
            culture_temperature: 'hot-startup',
            culture_summary: 'A fast-paced tech company pushing boundaries.',
          }),
        },
      });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo',
        industry: 'Technology',
        company_size: '50-200',
        country: 'us',
        bio: 'Innovative tech startup',
        culture_tags: ['innovative', 'fast-paced'],
        values_dna: { innovation: 90 },
        work_style: { remote_first: true },
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.match_tags).toEqual(['react', 'frontend', 'startup', 'technology']);
      expect(json.suggested_culture_tags).toEqual(['agile', 'flat-hierarchy']);
      expect(json.company_archetype).toBe('innovator');
      expect(json.culture_temperature).toBe('hot-startup');
      expect(json.culture_summary).toBeDefined();
    });

    it('generates culture suggestions in suggest mode', async () => {
      authenticateUser();

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            suggested_culture_tags: ['collaborative', 'data-driven', 'mentorship'],
            culture_temperature: 'warm-creative',
          }),
        },
      });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo',
        industry: 'Technology',
        _mode: 'suggest',
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.suggested_culture_tags).toEqual(['collaborative', 'data-driven', 'mentorship']);
      expect(json.culture_temperature).toBe('warm-creative');
      // suggest mode should NOT call service update
      expect(mockServiceFrom).not.toHaveBeenCalledWith('recruiters');
    });

    it('returns 401 for unauthenticated user', async () => {
      unauthenticateUser();

      const res = await onboardingPOST(makeRequest({ company_name: 'TestCo' }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 without company name', async () => {
      authenticateUser();

      const res = await onboardingPOST(makeRequest({ industry: 'Technology' }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Company name is required');
    });

    it('uses fallback tags when AI fails', async () => {
      authenticateUser();
      mockGenerateContent.mockRejectedValue(new Error('AI timeout'));

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo',
        industry: 'Technology',
        culture_tags: ['innovative', 'collaborative'],
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      // Fallback tags should include industry + culture_tags lowercased
      expect(json.match_tags).toContain('technology');
      expect(json.match_tags).toContain('innovative');
      expect(json.match_tags).toContain('collaborative');
    });
  });

  // =========================================================================
  // Step 2: AI Talent Matching
  // =========================================================================

  describe('Step 2: AI Talent Matching', () => {
    function setupMatchmakerMocks(candidates: any[] = MOCK_CANDIDATES) {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: MOCK_RECRUITER, error: null }),
              }),
            }),
          };
        }
        return buildChain([]);
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return buildChain(candidates);
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
        return buildChain([]);
      });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            scores: candidates.map((c, i) => ({
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

    it('scores and ranks candidates for a job', async () => {
      authenticateUser();
      setupMatchmakerMocks();

      const res = await matchmakerPOST(makeRequest({
        job_title: 'Senior React Developer',
        job_description: 'We need a strong React developer',
        must_have_skills: ['React', 'TypeScript'],
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.total_scanned).toBe(3);
      expect(json.matches).toHaveLength(3);
      // Sorted by score descending
      expect(json.matches[0].score).toBeGreaterThanOrEqual(json.matches[1].score);
      expect(json.matches[1].score).toBeGreaterThanOrEqual(json.matches[2].score);
    });

    it('returns match breakdown with all dimensions', async () => {
      authenticateUser();
      setupMatchmakerMocks();

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

    it('handles country filter', async () => {
      authenticateUser();
      setupMatchmakerMocks([MOCK_CANDIDATES[0]]);

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
        return buildChain([]);
      });

      await matchmakerPOST(makeRequest({
        job_title: 'React Dev',
        country_filter: 'us',
      }));

      const countryEq = eqCalls.find(([field]) => field === 'country');
      expect(countryEq).toBeDefined();
      expect(countryEq![1]).toBe('us');
    });

    it('returns 403 for non-recruiter user', async () => {
      authenticateUser();
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return buildChain([]);
      });

      const res = await matchmakerPOST(makeRequest({ job_title: 'Engineer' }));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('Not a recruiter');
    });
  });

  // =========================================================================
  // Step 3: Application Status Updates
  // =========================================================================

  describe('Step 3: Application Status Updates', () => {
    function setupStatusMocks(
      application: any = MOCK_APPLICATION,
      recruiterData: any = { id: 'rec-1' },
    ) {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: recruiterData, error: null }),
              }),
            }),
          };
        }
        if (table === 'applications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: application, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...application, status: 'shortlisted' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'candidates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'candidate-user-1', full_name: 'Alice Johnson' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { title: 'Senior React Developer' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return buildChain(null);
      });

      mockServiceAuthAdminGetUserById.mockResolvedValue({
        data: { user: { email: 'alice@example.com' } },
      });
    }

    it('updates application status to shortlisted', async () => {
      authenticateUser();
      setupStatusMocks();

      const res = await statusPATCH(
        makeRequest({ status: 'shortlisted' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.application).toBeDefined();
    });

    it('updates application status to interview_scheduled', async () => {
      authenticateUser();
      setupStatusMocks();

      const res = await statusPATCH(
        makeRequest({ status: 'interview_scheduled', note: 'Interview on Monday' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it('updates application status to hired', async () => {
      authenticateUser();
      setupStatusMocks({
        ...MOCK_APPLICATION,
        status: 'offer_accepted',
        status_history: [
          ...MOCK_APPLICATION.status_history,
          { status: 'offer_accepted', changed_at: '2026-01-20T00:00:00Z', changed_by: 'user-1' },
        ],
      });

      const res = await statusPATCH(
        makeRequest({ status: 'hired' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it('records status change in status_history', async () => {
      authenticateUser();

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...MOCK_APPLICATION, status: 'reviewed' },
              error: null,
            }),
          }),
        }),
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'applications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: MOCK_APPLICATION, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        if (table === 'candidates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { user_id: 'candidate-user-1', full_name: 'Alice Johnson' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { title: 'Senior React Developer' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return buildChain(null);
      });

      mockServiceAuthAdminGetUserById.mockResolvedValue({
        data: { user: { email: 'alice@example.com' } },
      });

      await statusPATCH(
        makeRequest({ status: 'reviewed' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );

      const updateCallArgs = updateMock.mock.calls[0][0];
      expect(updateCallArgs.status).toBe('reviewed');
      expect(updateCallArgs.status_history).toHaveLength(2);
      expect(updateCallArgs.status_history[1].status).toBe('reviewed');
      expect(updateCallArgs.status_history[1].changed_by).toBe('user-1');
      expect(updateCallArgs.status_history[1].changed_at).toBeDefined();
    });

    it('sends notification to candidate on status change', async () => {
      authenticateUser();
      setupStatusMocks();

      await statusPATCH(
        makeRequest({ status: 'shortlisted' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );

      // Give async operations a tick to run
      await new Promise((r) => setTimeout(r, 50));

      // sendStatusUpdateEmail is called asynchronously
      expect(mockSendStatusUpdateEmail).toHaveBeenCalled();
    });

    it('returns 401 for unauthenticated user', async () => {
      unauthenticateUser();

      const res = await statusPATCH(
        makeRequest({ status: 'shortlisted' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 for wrong recruiter', async () => {
      authenticateUser('user-2');
      setupStatusMocks(
        { ...MOCK_APPLICATION, recruiter_id: 'rec-other' },
        { id: 'rec-2' },
      );

      const res = await statusPATCH(
        makeRequest({ status: 'shortlisted' }),
        { params: Promise.resolve({ id: 'app-1' }) },
      );
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('Forbidden');
    });
  });

  // =========================================================================
  // Step 4: Analytics
  // =========================================================================

  describe('Step 4: Analytics', () => {
    function setupAnalyticsMocks(
      applications: any[] = MOCK_APPLICATIONS,
      jobs: any[] = MOCK_JOBS,
    ) {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'applications') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: applications, error: null }),
            }),
          };
        }
        if (table === 'jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: jobs, error: null }),
              }),
            }),
          };
        }
        return buildChain([]);
      });
    }

    it('returns hiring funnel with correct counts', async () => {
      authenticateUser();
      setupAnalyticsMocks();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.funnel).toBeDefined();
      expect(json.funnel.applied).toBe(1);
      expect(json.funnel.shortlisted).toBe(1);
      expect(json.funnel.hired).toBe(1);
      expect(json.funnel.rejected).toBe(1);
    });

    it('calculates time-to-hire metrics from status_history', async () => {
      authenticateUser();
      setupAnalyticsMocks();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.time_metrics).toBeDefined();
      // app-1: applied Jan 15 -> hired Jan 25 = 10 days
      expect(json.time_metrics.avg_time_to_hire_days).toBe(10);
      // app-1: applied Jan 15 -> reviewed Jan 16 = 1 day
      // app-2: applied Feb 1 -> reviewed Feb 2 = 1 day
      // app-4: applied Feb 15 -> reviewed Feb 16 = 1 day
      expect(json.time_metrics.avg_time_to_first_review_days).toBe(1);
      // app-1: applied Jan 15 -> shortlisted Jan 18 = 3 days
      // app-2: applied Feb 1 -> shortlisted Feb 5 = 4 days
      expect(json.time_metrics.avg_time_to_shortlist_days).toBe(3.5);
    });

    it('returns job performance stats', async () => {
      authenticateUser();
      setupAnalyticsMocks();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.job_performance).toHaveLength(2);

      const job1Perf = json.job_performance.find((j: any) => j.id === 'job-1');
      expect(job1Perf).toBeDefined();
      expect(job1Perf.title).toBe('Senior React Developer');
      expect(job1Perf.views).toBe(200);
      expect(job1Perf.applications).toBe(15);
      // conversion_rate = (15/200) * 100 = 7.5
      expect(job1Perf.conversion_rate).toBe(7.5);
      expect(job1Perf.hired).toBe(1);
      expect(job1Perf.is_active).toBe(true);
    });

    it('returns weekly trends for last 12 weeks', async () => {
      authenticateUser();
      setupAnalyticsMocks();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.trends).toBeDefined();
      expect(json.trends.weekly_applications).toHaveLength(12);
      expect(json.trends.weekly_hires).toHaveLength(12);
      // Each entry has week label and count
      expect(json.trends.weekly_applications[0]).toHaveProperty('week');
      expect(json.trends.weekly_applications[0]).toHaveProperty('count');
    });

    it('returns overview with hire rate', async () => {
      authenticateUser();
      setupAnalyticsMocks();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.overview).toBeDefined();
      expect(json.overview.total_applications).toBe(4);
      expect(json.overview.total_hires).toBe(1);
      // hire_rate = (1/4) * 100 = 25
      expect(json.overview.hire_rate).toBe(25);
      expect(json.overview.active_jobs).toBe(1);
      // avg_match_score = (85+72+60+40)/4 = 64.25 -> rounded to 64
      expect(json.overview.avg_match_score).toBe(64);
    });

    it('returns 401 for unauthenticated user', async () => {
      unauthenticateUser();

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns empty data for new recruiter', async () => {
      authenticateUser();
      setupAnalyticsMocks([], []);

      const res = await analyticsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.funnel.applied).toBe(0);
      expect(json.funnel.hired).toBe(0);
      expect(json.overview.total_applications).toBe(0);
      expect(json.overview.total_hires).toBe(0);
      expect(json.overview.hire_rate).toBe(0);
      expect(json.job_performance).toHaveLength(0);
      expect(json.time_metrics.avg_time_to_hire_days).toBe(0);
    });
  });

  // =========================================================================
  // Step 5: Notifications
  // =========================================================================

  describe('Step 5: Notifications', () => {
    function setupNotificationMocks(
      notifications: any[] = MOCK_NOTIFICATIONS,
      unreadCount: number = 2,
    ) {
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            select: jest.fn().mockImplementation((fields: string, opts?: any) => {
              if (opts?.count === 'exact') {
                // This is the unread count query
                const chain: any = {};
                chain.eq = jest.fn().mockReturnValue(chain);
                chain.then = (onFulfilled: Function) =>
                  Promise.resolve({ count: unreadCount, error: null }).then(onFulfilled as any);
                return chain;
              }
              // Regular fetch query
              const chain: any = {};
              const methods = ['eq', 'order', 'range', 'in'];
              for (const m of methods) {
                chain[m] = jest.fn().mockReturnValue(chain);
              }
              chain.then = (onFulfilled: Function) =>
                Promise.resolve({ data: notifications, error: null }).then(onFulfilled as any);
              return chain;
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: null }),
                in: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return buildChain(null);
      });
    }

    it('fetches user notifications paginated', async () => {
      authenticateUser();
      setupNotificationMocks();

      const res = await notificationsGET(
        makeGetRequest('http://localhost/api/notifications?limit=20&offset=0'),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.notifications).toHaveLength(3);
      expect(json.unread_count).toBe(2);
    });

    it('filters unread-only notifications', async () => {
      authenticateUser();
      const unreadOnly = MOCK_NOTIFICATIONS.filter((n) => !n.is_read);
      setupNotificationMocks(unreadOnly, 2);

      const res = await notificationsGET(
        makeGetRequest('http://localhost/api/notifications?unread_only=true'),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.notifications).toHaveLength(2);
      expect(json.notifications.every((n: any) => !n.is_read)).toBe(true);
    });

    it('marks specific notifications as read', async () => {
      authenticateUser();
      setupNotificationMocks();

      const res = await notificationsPOST(
        makeRequest({ ids: ['notif-1', 'notif-3'] }),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it('marks all notifications as read', async () => {
      authenticateUser();
      setupNotificationMocks();

      const res = await notificationsPOST(
        makeRequest({ all: true }),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });

    it('returns 401 for unauthenticated user', async () => {
      unauthenticateUser();

      const res = await notificationsGET(
        makeGetRequest('http://localhost/api/notifications'),
      );
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });
  });
});
