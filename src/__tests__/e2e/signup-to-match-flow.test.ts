/**
 * @jest-environment node
 *
 * E2E Flow: Signup → Onboard → Post Job → Apply → Match
 *
 * Tests the full recruitment pipeline from account creation through
 * AI-powered candidate matching.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServerFrom = jest.fn();
const mockServiceFrom = jest.fn();
const mockServiceRpc = jest.fn();
const mockServiceGetUserById = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
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
  createServerSupabase: jest.fn().mockImplementation(async () => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockServerFrom(...args),
  })),
  createServiceClient: jest.fn().mockImplementation(async () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args),
    rpc: (...args: unknown[]) => mockServiceRpc(...args),
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockServiceGetUserById(...args),
      },
    },
  })),
}));

// Signup route uses @supabase/supabase-js createClient directly.
// We must define the mock object inline since jest.mock is hoisted.
const mockAdminCreateUser = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    auth: {
      admin: {
        createUser: (...args: unknown[]) => mockAdminCreateUser(...args),
      },
    },
    from: (...args: unknown[]) => mockAdminFrom(...args),
  })),
}));

const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    }),
  })),
}));

const mockSendWelcomeEmail = jest.fn().mockResolvedValue(true);
const mockSendApplicationNotification = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
  sendApplicationNotification: (...args: unknown[]) => mockSendApplicationNotification(...args),
}));

const mockCreateNotification = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/notifications', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  createRateLimiter: jest.fn().mockReturnValue(() => ({ success: true, remaining: 10, reset: Date.now() + 60000 })),
}));

jest.mock('@/lib/webhooks', () => ({
  fireWebhooks: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('@/lib/parse-json', () => ({
  parseLLMJson: jest.fn().mockImplementation((text: string) => JSON.parse(text)),
}));

// ---------------------------------------------------------------------------
// Imports — after all mocks
// ---------------------------------------------------------------------------

import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as onboardingPOST } from '@/app/api/recruiter/onboarding/route';
import { POST as applicationsPOST } from '@/app/api/applications/route';
import { GET as matchedCandidatesGET } from '@/app/api/recruiter/matched-candidates/route';
import { GET as matchedJobsGET } from '@/app/api/candidate/matched-jobs/route';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const RECRUITER_USER = {
  id: 'user-rec-1',
  email: 'recruiter@testco.com',
};

const CANDIDATE_USER = {
  id: 'user-cand-1',
  email: 'alice@example.com',
};

const MOCK_RECRUITER = {
  id: 'rec-1',
  user_id: RECRUITER_USER.id,
  company_name: 'TestCo Inc',
  industry: 'Technology',
  company_size: '50-200',
  country: 'us',
  city: 'San Francisco',
  culture_tags: ['innovative', 'fast-paced', 'remote-first'],
  match_tags: ['react', 'frontend', 'typescript', 'startup'],
  values_dna: { innovation: 90, collaboration: 80 },
  work_style: { remote_first: true },
};

const MOCK_JOB = {
  id: 'job-1',
  recruiter_id: MOCK_RECRUITER.id,
  title: 'Senior React Developer',
  description: 'Looking for an experienced React developer to lead frontend architecture.',
  skills_required: ['React', 'TypeScript', 'Node.js'],
  match_tags: ['react', 'frontend', 'senior'],
  experience_min: 5,
  experience_max: 15,
  work_mode: 'remote',
  country: 'us',
  is_active: true,
  industry: 'Technology',
};

const MOCK_CANDIDATE = {
  id: 'cand-1',
  user_id: CANDIDATE_USER.id,
  full_name: 'Alice Johnson',
  headline: 'Senior React Developer',
  email: 'alice@example.com',
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
  certifications: [],
  available_now: true,
  is_public: true,
};

const MOCK_APPLICATION = {
  id: 'app-1',
  candidate_id: MOCK_CANDIDATE.id,
  job_id: MOCK_JOB.id,
  recruiter_id: MOCK_RECRUITER.id,
  status: 'applied',
  cover_letter: 'I am very interested in this role.',
  created_at: '2026-03-31T10:00:00Z',
  updated_at: '2026-03-31T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request;
}

function makeRequestWithUrl(url: string): Request {
  return {
    url,
    json: async () => ({}),
  } as unknown as Request;
}

/**
 * Build a chainable Supabase query mock that resolves to given data.
 */
function buildChain(resolvedData: unknown, resolvedError: unknown = null) {
  const chain: any = {};
  const methods = [
    'select', 'eq', 'gte', 'lte', 'overlaps', 'order', 'limit',
    'single', 'maybeSingle', 'insert', 'update', 'upsert', 'delete', 'neq',
    'in', 'contains', 'ilike',
  ];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  // Make thenable so `await query` works
  chain.then = (onFulfilled: Function) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).then(onFulfilled as any);
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Full Recruitment Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Step 1: Recruiter Signup
  // =========================================================================
  describe('Step 1: Recruiter Signup', () => {
    it('creates recruiter account with correct role', async () => {
      const newUserId = 'new-rec-user-1';

      mockAdminCreateUser.mockResolvedValue({
        data: {
          user: { id: newUserId, email: 'recruiter@testco.com' },
        },
        error: null,
      });

      mockAdminFrom.mockImplementation((table: string) => {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      const res = await signupPOST(makeRequest({
        email: 'recruiter@testco.com',
        password: 'SecurePass123!',
        fullName: 'TestCo Inc',
        role: 'recruiter',
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.userId).toBe(newUserId);
      expect(json.role).toBe('recruiter');

      // Verify createUser was called with correct data
      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'recruiter@testco.com',
          password: 'SecurePass123!',
          email_confirm: true,
          user_metadata: { role: 'recruiter', full_name: 'TestCo Inc' },
        }),
      );

      // Verify profile and recruiter records were inserted
      expect(mockAdminFrom).toHaveBeenCalledWith('profiles');
      expect(mockAdminFrom).toHaveBeenCalledWith('recruiters');

      // Verify welcome email was sent
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(
        'recruiter@testco.com',
        'TestCo Inc',
        'recruiter',
      );
    });

    it('returns 400 for missing email', async () => {
      const res = await signupPOST(makeRequest({
        password: 'SecurePass123!',
        role: 'recruiter',
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('required');
    });

    it('returns 400 for missing password', async () => {
      const res = await signupPOST(makeRequest({
        email: 'test@example.com',
        role: 'recruiter',
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('required');
    });

    it('returns 400 for short password', async () => {
      const res = await signupPOST(makeRequest({
        email: 'test@example.com',
        password: 'short',
        role: 'recruiter',
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('8 characters');
    });

    it('returns 409 for duplicate email', async () => {
      mockAdminCreateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'A user with this email address has already been registered' },
      });

      const res = await signupPOST(makeRequest({
        email: 'existing@example.com',
        password: 'SecurePass123!',
        role: 'recruiter',
      }));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('already exists');
    });
  });

  // =========================================================================
  // Step 2: Recruiter Onboarding
  // =========================================================================
  describe('Step 2: Recruiter Onboarding', () => {
    it('saves onboarding data with AI-generated tags', async () => {
      mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

      // AI returns smart tags
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            match_tags: ['react', 'frontend', 'typescript', 'startup', 'remote'],
            suggested_culture_tags: ['collaborative', 'learning-focused'],
            company_archetype: 'innovator',
            culture_temperature: 'hot-startup',
            culture_summary: 'A fast-paced startup culture focused on innovation.',
          }),
        },
      });

      // Service client update
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return buildChain(null);
      });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo Inc',
        company_website: 'https://testco.com',
        industry: 'Technology',
        company_size: '50-200',
        country: 'us',
        city: 'San Francisco',
        bio: 'We build innovative developer tools.',
        culture_tags: ['innovative', 'fast-paced'],
        values_dna: { innovation: 90 },
        work_style: { remote_first: true },
        hiring_needs: { roles: ['frontend', 'backend'] },
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.match_tags).toContain('react');
      expect(json.company_archetype).toBe('innovator');
      expect(json.culture_temperature).toBe('hot-startup');
      expect(json.culture_summary).toBeDefined();
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo',
      }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 for missing company name', async () => {
      mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

      const res = await onboardingPOST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Company name');
    });

    it('handles AI suggestion mode', async () => {
      mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            suggested_culture_tags: ['data-driven', 'mentorship', 'work-life-balance'],
            culture_temperature: 'balanced',
          }),
        },
      });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo Inc',
        industry: 'Technology',
        _mode: 'suggest',
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.suggested_culture_tags).toBeDefined();
      expect(json.culture_temperature).toBeDefined();
      // Suggest mode should NOT save to DB
      expect(mockServiceFrom).not.toHaveBeenCalledWith('recruiters');
    });

    it('uses fallback tags when AI fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });
      mockGenerateContent.mockRejectedValue(new Error('AI timeout'));

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'recruiters') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return buildChain(null);
      });

      const res = await onboardingPOST(makeRequest({
        company_name: 'TestCo Inc',
        industry: 'Technology',
        culture_tags: ['innovative'],
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      // Fallback tags should include lowercase industry and culture tags
      expect(json.match_tags).toEqual(expect.arrayContaining(['technology', 'innovative']));
    });
  });

  // =========================================================================
  // Step 3: Candidate Signup
  // =========================================================================
  describe('Step 3: Candidate Signup', () => {
    it('creates candidate account with correct role', async () => {
      const newUserId = 'new-cand-user-1';

      mockAdminCreateUser.mockResolvedValue({
        data: {
          user: { id: newUserId, email: 'alice@example.com' },
        },
        error: null,
      });

      mockAdminFrom.mockImplementation((table: string) => {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      });

      const res = await signupPOST(makeRequest({
        email: 'alice@example.com',
        password: 'CandidatePass123!',
        fullName: 'Alice Johnson',
        role: 'candidate',
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.userId).toBe(newUserId);
      expect(json.role).toBe('candidate');

      // Verify candidate record was inserted
      expect(mockAdminFrom).toHaveBeenCalledWith('candidates');

      // Verify welcome email was sent with candidate role
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Johnson',
        'candidate',
      );
    });

    it('returns 400 for invalid role', async () => {
      const res = await signupPOST(makeRequest({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'admin',
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Invalid role');
    });
  });

  // =========================================================================
  // Step 4: Candidate Applies to Job
  // =========================================================================
  describe('Step 4: Candidate Applies to Job', () => {
    function setupApplicationMocks(overrides?: {
      profile?: any;
      candidate?: any;
      job?: any;
      existingApp?: any;
      insertResult?: any;
      recruiter?: any;
      recruiterUser?: any;
    }) {
      const opts = {
        profile: { role: 'candidate' },
        candidate: { id: MOCK_CANDIDATE.id, full_name: MOCK_CANDIDATE.full_name },
        job: MOCK_JOB,
        existingApp: null,
        insertResult: MOCK_APPLICATION,
        recruiter: { user_id: RECRUITER_USER.id },
        recruiterUser: { email: RECRUITER_USER.email },
        ...overrides,
      };

      mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

      mockServiceRpc.mockResolvedValue({ error: null });

      mockServiceGetUserById.mockResolvedValue({
        data: { user: opts.recruiterUser },
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return buildChain(opts.profile);
        }
        if (table === 'candidates') {
          return buildChain(opts.candidate);
        }
        if (table === 'jobs') {
          return buildChain(opts.job);
        }
        if (table === 'applications') {
          const chain: any = {};
          const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'neq', 'in'];
          for (const m of methods) {
            chain[m] = jest.fn().mockReturnValue(chain);
          }
          // maybeSingle for duplicate check
          chain.maybeSingle = jest.fn().mockResolvedValue({ data: opts.existingApp, error: null });
          // insert for creating application
          chain.insert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: opts.insertResult, error: null }),
            }),
          });
          chain.then = (onFulfilled: Function) =>
            Promise.resolve({ data: opts.existingApp, error: null }).then(onFulfilled as any);
          return chain;
        }
        if (table === 'recruiters') {
          return buildChain(opts.recruiter);
        }
        return buildChain(null);
      });
    }

    it('creates application successfully', async () => {
      setupApplicationMocks();

      const res = await applicationsPOST(makeRequest({
        job_id: MOCK_JOB.id,
        cover_letter: 'I am very interested in this role.',
      }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.application).toBeDefined();
      expect(json.application.id).toBe(MOCK_APPLICATION.id);
    });

    it('returns 409 for duplicate application', async () => {
      setupApplicationMocks({
        existingApp: { id: 'existing-app-1' },
      });

      const res = await applicationsPOST(makeRequest({
        job_id: MOCK_JOB.id,
      }));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('already applied');
    });

    it('returns 404 for non-existent job', async () => {
      setupApplicationMocks({
        job: null,
      });

      // Override the jobs mock to return an error
      const origImpl = mockServiceFrom.getMockImplementation();
      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return buildChain(null, { message: 'not found' });
        }
        return origImpl!(table);
      });

      const res = await applicationsPOST(makeRequest({
        job_id: 'non-existent-job',
      }));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Job not found');
    });

    it('increments job applications_count', async () => {
      setupApplicationMocks();

      await applicationsPOST(makeRequest({
        job_id: MOCK_JOB.id,
      }));

      // Allow async side effects to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(mockServiceRpc).toHaveBeenCalledWith(
        'increment_applications_count',
        { job_id: MOCK_JOB.id },
      );
    });

    it('returns 400 for missing job_id', async () => {
      setupApplicationMocks();

      const res = await applicationsPOST(makeRequest({}));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('job_id is required');
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });

      const res = await applicationsPOST(makeRequest({ job_id: 'job-1' }));
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 for non-candidate user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return buildChain({ role: 'recruiter' });
        }
        return buildChain(null);
      });

      const res = await applicationsPOST(makeRequest({ job_id: 'job-1' }));
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toContain('Only candidates');
    });

    it('returns 400 for inactive job', async () => {
      setupApplicationMocks({
        job: { ...MOCK_JOB, is_active: false },
      });

      const res = await applicationsPOST(makeRequest({
        job_id: MOCK_JOB.id,
      }));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('no longer accepting');
    });
  });

  // =========================================================================
  // Step 5: AI Matching
  // =========================================================================
  describe('Step 5: AI Matching', () => {
    describe('Recruiter → Matched Candidates', () => {
      it('matches candidates to recruiter jobs with scores', async () => {
        mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

        // Server: recruiter profile
        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'recruiters') {
            return buildChain(MOCK_RECRUITER);
          }
          return buildChain([]);
        });

        // Service: jobs and candidates
        mockServiceFrom.mockImplementation((table: string) => {
          if (table === 'jobs') {
            const chain = buildChain([MOCK_JOB]);
            return chain;
          }
          if (table === 'candidates') {
            const chain = buildChain([MOCK_CANDIDATE]);
            return chain;
          }
          return buildChain([]);
        });

        mockGenerateContent.mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              matches: [{
                candidate_index: 0,
                score: 92,
                skills_match: 95,
                experience_match: 88,
                culture_match: 90,
                highlights: ['Strong React expertise', '8 years experience'],
                concerns: [],
                why: 'Excellent skill alignment with React and TypeScript requirements.',
              }],
            }),
          },
        });

        const res = await matchedCandidatesGET(
          makeRequestWithUrl('http://localhost:3000/api/recruiter/matched-candidates'),
        );
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.matches).toHaveLength(1);
        expect(json.matches[0].score).toBe(92);
        expect(json.matches[0].candidate.full_name).toBe('Alice Johnson');
        expect(json.matches[0].why).toBeDefined();
      });

      it('returns 401 for unauthenticated user', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const res = await matchedCandidatesGET(
          makeRequestWithUrl('http://localhost:3000/api/recruiter/matched-candidates'),
        );
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
      });

      it('returns 403 when user is not a recruiter', async () => {
        mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'recruiters') {
            return buildChain(null);
          }
          return buildChain([]);
        });

        const res = await matchedCandidatesGET(
          makeRequestWithUrl('http://localhost:3000/api/recruiter/matched-candidates'),
        );
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Not a recruiter');
      });

      it('returns empty matches when no candidates available', async () => {
        mockGetUser.mockResolvedValue({ data: { user: RECRUITER_USER } });

        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'recruiters') {
            return buildChain(MOCK_RECRUITER);
          }
          return buildChain([]);
        });

        mockServiceFrom.mockImplementation((table: string) => {
          if (table === 'jobs') {
            return buildChain([MOCK_JOB]);
          }
          if (table === 'candidates') {
            return buildChain([]);
          }
          return buildChain([]);
        });

        const res = await matchedCandidatesGET(
          makeRequestWithUrl('http://localhost:3000/api/recruiter/matched-candidates'),
        );
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.matches).toEqual([]);
      });
    });

    describe('Candidate → Matched Jobs', () => {
      it('matches jobs to candidate profile with reasons', async () => {
        mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

        // Server: candidate profile
        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'candidates') {
            return buildChain(MOCK_CANDIDATE);
          }
          return buildChain([]);
        });

        // Service: active jobs with recruiter
        const jobWithRecruiter = {
          ...MOCK_JOB,
          recruiter: { company_name: 'TestCo Inc', company_logo_url: null },
        };
        mockServiceFrom.mockImplementation((table: string) => {
          if (table === 'jobs') {
            return buildChain([jobWithRecruiter]);
          }
          return buildChain([]);
        });

        mockGenerateContent.mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              matches: [{
                job_index: 0,
                score: 95,
                skills_match: 98,
                experience_match: 90,
                culture_match: 88,
                why: 'Perfect skill alignment with React, TypeScript, and Node.js.',
                tip: 'Highlight your GraphQL experience for bonus points.',
              }],
            }),
          },
        });

        const res = await matchedJobsGET();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.matches).toHaveLength(1);
        expect(json.matches[0].score).toBe(95);
        expect(json.matches[0].job.title).toBe('Senior React Developer');
        expect(json.matches[0].why).toBeDefined();
        expect(json.matches[0].tip).toBeDefined();
      });

      it('returns 401 for unauthenticated user', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const res = await matchedJobsGET();
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
      });

      it('returns 404 when candidate profile not found', async () => {
        mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'candidates') {
            return buildChain(null);
          }
          return buildChain([]);
        });

        const res = await matchedJobsGET();
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.error).toBe('No profile');
      });

      it('returns empty matches when no jobs available', async () => {
        mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'candidates') {
            return buildChain(MOCK_CANDIDATE);
          }
          return buildChain([]);
        });

        mockServiceFrom.mockImplementation((table: string) => {
          if (table === 'jobs') {
            return buildChain([]);
          }
          return buildChain([]);
        });

        const res = await matchedJobsGET();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.matches).toEqual([]);
      });

      it('handles AI failure gracefully', async () => {
        mockGetUser.mockResolvedValue({ data: { user: CANDIDATE_USER } });

        mockServerFrom.mockImplementation((table: string) => {
          if (table === 'candidates') {
            return buildChain(MOCK_CANDIDATE);
          }
          return buildChain([]);
        });

        const jobWithRecruiter = {
          ...MOCK_JOB,
          recruiter: { company_name: 'TestCo Inc', company_logo_url: null },
        };
        mockServiceFrom.mockImplementation((table: string) => {
          if (table === 'jobs') {
            return buildChain([jobWithRecruiter]);
          }
          return buildChain([]);
        });

        mockGenerateContent.mockRejectedValue(new Error('AI service unavailable'));

        const res = await matchedJobsGET();
        const json = await res.json();

        // The route catches errors and returns 500
        expect(res.status).toBe(500);
        expect(json.error).toBeDefined();
      });
    });
  });
});
