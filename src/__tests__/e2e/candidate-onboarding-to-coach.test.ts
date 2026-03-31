/**
 * @jest-environment node
 *
 * E2E Flow: Candidate Onboarding → Quiz → AI Coach
 *
 * Tests the full candidate-side journey: CV parsing, AI coach actions
 * (resume improvement, job finding, career actions, social content),
 * applying enhancements to profile, and matched jobs.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServerFrom = jest.fn();
const mockServiceFrom = jest.fn();
const mockGenerateContent = jest.fn();
const mockParseCVWithAI = jest.fn();
const mockParseCVFromPDF = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      json: async () => body,
      headers: new Map(Object.entries(init?.headers || {})),
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

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  createRateLimiter: jest.fn().mockReturnValue(() => ({ success: true, remaining: 10, reset: Date.now() + 60000 })),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

jest.mock('@/lib/gemini', () => ({
  parseCVWithAI: (...args: unknown[]) => mockParseCVWithAI(...args),
  parseCVFromPDF: (...args: unknown[]) => mockParseCVFromPDF(...args),
}));

jest.mock('@/lib/photo-extraction', () => ({
  extractPhotoFromPDF: jest.fn().mockReturnValue(null),
  extractPhotoFromDOCX: jest.fn().mockReturnValue(null),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/cv.pdf' } }),
      }),
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
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
import { POST as parseCvPOST } from '@/app/api/parse-cv/route';
import { POST as aiCoachPOST } from '@/app/api/candidate/ai-coach/route';
import { POST as applyEnhancementPOST } from '@/app/api/candidate/apply-enhancement/route';
import { GET as matchedJobsGET } from '@/app/api/candidate/matched-jobs/route';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_USER = { id: 'user-123', email: 'alice@example.com' };

const MOCK_CANDIDATE = {
  id: 'cand-1',
  user_id: 'user-123',
  full_name: 'Alice Johnson',
  headline: 'Frontend Developer',
  bio: 'Experienced React developer building modern web applications.',
  skills: ['React', 'TypeScript', 'CSS', 'Node.js'],
  experience_years: 6,
  education: [{ institution: 'MIT', degree: 'BS', field: 'Computer Science' }],
  work_history: [
    { company: 'TechCorp', title: 'Senior Developer', description: 'Built frontend apps' },
    { company: 'StartupInc', title: 'Developer', description: 'Worked on web projects' },
  ],
  certifications: ['AWS Certified Developer'],
  languages: ['English', 'Spanish'],
  country: 'us',
  city: 'New York',
  remote_preference: 'remote',
  visa_status: 'citizen',
  match_tags: ['react', 'typescript', 'css', 'node.js'],
  is_public: true,
  photo_url: 'https://example.com/photo.jpg',
  cv_url: 'https://example.com/cv.pdf',
};

const MOCK_PARSED_CV = {
  full_name: 'Alice Johnson',
  headline: 'Senior Frontend Engineer',
  skills: ['React', 'TypeScript', 'GraphQL', 'Tailwind CSS'],
  experience_years: 6,
  education: [{ institution: 'MIT', degree: 'BS', field: 'Computer Science' }],
  work_history: [
    { company: 'TechCorp', title: 'Senior Developer', description: 'Led frontend team of 5' },
  ],
  certifications: ['AWS Certified Developer'],
  languages: ['English', 'Spanish'],
  bio: 'Experienced frontend engineer with 6 years building scalable React applications.',
};

const MOCK_JOBS = [
  {
    id: 'job-1',
    title: 'Senior React Developer',
    description: 'Build modern web apps with React and TypeScript',
    industry: 'Technology',
    skills_required: ['React', 'TypeScript', 'GraphQL'],
    match_tags: ['react', 'typescript', 'frontend'],
    city: 'San Francisco',
    country: 'us',
    work_mode: 'remote',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    job_type: 'full_time',
    experience_min: 4,
    experience_max: 10,
    is_active: true,
    recruiter: { company_name: 'TechStartup', company_logo_url: null },
  },
  {
    id: 'job-2',
    title: 'Full-Stack Engineer',
    description: 'Work on both frontend and backend',
    industry: 'Finance',
    skills_required: ['React', 'Node.js', 'PostgreSQL'],
    match_tags: ['react', 'node', 'fullstack'],
    city: 'New York',
    country: 'us',
    work_mode: 'hybrid',
    salary_min: 100000,
    salary_max: 160000,
    salary_currency: 'USD',
    job_type: 'full_time',
    experience_min: 3,
    experience_max: 8,
    is_active: true,
    recruiter: { company_name: 'FinCo', company_logo_url: null },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonRequest(body: Record<string, unknown>): Request {
  return { json: async () => body } as unknown as Request;
}

function buildChain(resolvedData: unknown, resolvedError: unknown = null) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'overlaps', 'order', 'limit', 'single', 'update', 'insert'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.then = jest.fn().mockImplementation((onFulfilled: (val: unknown) => unknown) =>
    Promise.resolve({ data: resolvedData, error: resolvedError }).then(onFulfilled)
  ) as unknown as jest.Mock;
  return chain;
}

function setupCandidateQuery(candidate: Record<string, unknown> | null = MOCK_CANDIDATE) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: candidate, error: candidate ? null : { code: 'PGRST116' } }),
      }),
    }),
  };
}

function setupUpdateChain(error: unknown = null) {
  return {
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error }),
    }),
  };
}

function resetAllMocks() {
  jest.clearAllMocks();

  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });

  // Default mockServerFrom: handles candidates table
  mockServerFrom.mockImplementation((table: string) => {
    if (table === 'candidates') {
      return {
        ...setupCandidateQuery(),
        ...setupUpdateChain(),
      };
    }
    if (table === 'jobs') {
      return buildChain(MOCK_JOBS);
    }
    return buildChain([]);
  });

  // Default mockServiceFrom: handles jobs table
  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'jobs') {
      return buildChain(MOCK_JOBS);
    }
    return buildChain([]);
  });

  // Default Gemini mock
  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => JSON.stringify({ improved_headline: 'Test headline' }),
    },
  });

  // Default CV parsing mocks
  mockParseCVFromPDF.mockResolvedValue(MOCK_PARSED_CV);
  mockParseCVWithAI.mockResolvedValue(MOCK_PARSED_CV);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Candidate Journey', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // =========================================================================
  // Step 1: CV Parsing
  // =========================================================================
  describe('Step 1: CV Parsing', () => {
    it('parses PDF CV and returns extracted profile data', async () => {
      const mockFile = new File(['test pdf content'], 'resume.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('cv', mockFile);
      const request = new Request('http://localhost/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      const res = await parseCvPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.parsed).toBeDefined();
      expect(json.parsed.full_name).toBe('Alice Johnson');
      expect(json.parsed.skills).toContain('React');
      expect(json.cv_url).toBe('https://storage.example.com/cv.pdf');
      expect(mockParseCVFromPDF).toHaveBeenCalled();
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const mockFile = new File(['test'], 'resume.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('cv', mockFile);
      const request = new Request('http://localhost/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      const res = await parseCvPOST(request);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 for missing file', async () => {
      const formData = new FormData();
      const request = new Request('http://localhost/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      const res = await parseCvPOST(request);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('No file uploaded');
    });

    it('handles AI parsing failure gracefully', async () => {
      mockParseCVFromPDF.mockRejectedValue(new Error('Gemini API timeout'));

      const mockFile = new File(['test pdf content'], 'resume.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('cv', mockFile);
      const request = new Request('http://localhost/api/parse-cv', {
        method: 'POST',
        body: formData,
      });

      const res = await parseCvPOST(request);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Gemini API timeout');
    });
  });

  // =========================================================================
  // Step 2: AI Coach — Resume Enhancement
  // =========================================================================
  describe('Step 2: AI Coach - Resume Enhancement', () => {
    it('generates improved headline, bio, and skills', async () => {
      const aiResponse = {
        improved_headline: 'Senior Frontend Engineer | React & TypeScript Expert | 6+ Years',
        improved_bio: 'High-performance frontend engineer with 6 years of experience delivering scalable React applications.',
        improved_skills: ['React', 'TypeScript', 'GraphQL', 'Tailwind CSS', 'Next.js'],
        added_skills: ['Performance Optimization', 'A/B Testing'],
        headline_score_before: 45,
        headline_score_after: 88,
        bio_score_before: 50,
        bio_score_after: 85,
        overall_score_before: 52,
        overall_score_after: 87,
        key_improvements: ['Added quantified achievements', 'Stronger action verbs', 'Industry keywords'],
        work_history_improvements: [],
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'improve-resume' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.improved_headline).toBeDefined();
      expect(json.data.improved_bio).toBeDefined();
      expect(json.data.improved_skills).toBeDefined();
      expect(json.data.headline_score_after).toBeGreaterThan(json.data.headline_score_before);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = makeJsonRequest({ action: 'improve-resume' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 404 when no candidate profile exists', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
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

      const request = makeJsonRequest({ action: 'improve-resume' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('No candidate profile found');
    });

    it('tailors resume when job description is provided', async () => {
      const aiResponse = {
        improved_headline: 'React Developer | Cloud-Native Applications | AWS',
        improved_bio: 'Tailored bio for cloud role.',
        improved_skills: ['React', 'AWS', 'Docker'],
        added_skills: ['Kubernetes'],
        headline_score_before: 45,
        headline_score_after: 92,
        bio_score_before: 50,
        bio_score_after: 90,
        overall_score_before: 52,
        overall_score_after: 91,
        key_improvements: ['Aligned with cloud-native job requirements'],
        work_history_improvements: [],
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({
        action: 'improve-resume',
        jobDescription: 'We need a React developer with AWS experience for cloud-native apps.',
      });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.improved_headline).toContain('AWS');
      // Verify the prompt included the job description
      const promptArg = mockGenerateContent.mock.calls[0][0];
      expect(promptArg).toContain('TARGET JOB DESCRIPTION');
      expect(promptArg).toContain('cloud-native');
    });
  });

  // =========================================================================
  // Step 3: AI Coach — Job Finding
  // =========================================================================
  describe('Step 3: AI Coach - Job Finding', () => {
    it('finds matching jobs from database', async () => {
      // Setup: jobs table returns mock jobs via server supabase
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return setupCandidateQuery();
        }
        if (table === 'jobs') {
          return buildChain(MOCK_JOBS);
        }
        return buildChain([]);
      });

      const aiResponse = {
        matches: [
          {
            job_index: 0,
            match_score: 92,
            match_reasons: ['Strong React skills', 'Remote preference matches', 'Experience level aligns'],
            gaps: ['No GraphQL experience listed'],
            tip: 'Highlight any GraphQL projects in your resume',
          },
          {
            job_index: 1,
            match_score: 78,
            match_reasons: ['React and Node.js match', 'Located in New York'],
            gaps: ['No PostgreSQL experience'],
            tip: 'Consider getting a PostgreSQL certification',
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'find-jobs' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.matches).toHaveLength(2);
      expect(json.data.matches[0].job).toBeDefined();
      expect(json.data.matches[0].job.title).toBe('Senior React Developer');
      expect(json.data.matches[0].match_score).toBe(92);
    });

    it('returns empty matches when no active jobs', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return setupCandidateQuery();
        }
        if (table === 'jobs') {
          return buildChain([]);
        }
        return buildChain([]);
      });

      const request = makeJsonRequest({ action: 'find-jobs' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.matches).toEqual([]);
      expect(json.data.message).toBe('No active jobs available right now.');
    });

    it('enriches matches with full job data', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return setupCandidateQuery();
        }
        if (table === 'jobs') {
          return buildChain(MOCK_JOBS);
        }
        return buildChain([]);
      });

      const aiResponse = {
        matches: [
          {
            job_index: 0,
            match_score: 85,
            match_reasons: ['Skills match'],
            gaps: [],
            tip: 'Apply soon',
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'find-jobs' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      const match = json.data.matches[0];
      expect(match.job.id).toBe('job-1');
      expect(match.job.salary_min).toBe(120000);
      expect(match.job.recruiter.company_name).toBe('TechStartup');
    });
  });

  // =========================================================================
  // Step 4: AI Coach — Career Actions
  // =========================================================================
  describe('Step 4: AI Coach - Career Actions', () => {
    it('returns profile grade and action plan', async () => {
      const aiResponse = {
        profile_grade: 'B',
        profile_score: 72,
        critical_actions: [
          {
            action: 'Add quantified achievements to work history',
            impact: 'high',
            effort: 'medium',
            reason: 'Recruiters want to see measurable results',
            action_type: 'go_to_resume',
            action_payload: { label: 'Open Resume Enhancer' },
          },
          {
            action: 'Set visa status',
            impact: 'high',
            effort: 'easy',
            reason: 'Recruiters filter by visa status',
            action_type: 'update_field',
            action_payload: { field: 'visa_status', value: 'citizen', label: 'Set Visa Status' },
          },
        ],
        skill_gaps: ['GraphQL', 'Testing (Jest/Cypress)', 'CI/CD'],
        certification_suggestions: ['AWS Solutions Architect', 'Google Cloud Professional'],
        career_trajectory: 'Heading towards a Staff Engineer role within 2-3 years.',
        market_demand: 'high — React developers are in strong demand across all markets.',
        salary_insight: '$130,000-$180,000 based on skills and experience level.',
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'recommend-actions' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.profile_grade).toBe('B');
      expect(json.data.profile_score).toBe(72);
      expect(json.data.critical_actions).toHaveLength(2);
      expect(json.data.critical_actions[0].action_type).toBe('go_to_resume');
      expect(json.data.critical_actions[1].action_payload.field).toBe('visa_status');
    });

    it('includes skill gaps and certifications', async () => {
      const aiResponse = {
        profile_grade: 'C',
        profile_score: 55,
        critical_actions: [],
        skill_gaps: ['Kubernetes', 'Terraform', 'System Design'],
        certification_suggestions: ['CKA - Certified Kubernetes Administrator', 'HashiCorp Terraform Associate'],
        career_trajectory: 'Moving towards a DevOps-oriented full-stack role.',
        market_demand: 'medium — needs more infrastructure skills to stand out.',
        salary_insight: '$100,000-$140,000 for current skill level.',
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'recommend-actions' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.skill_gaps).toContain('Kubernetes');
      expect(json.data.certification_suggestions).toHaveLength(2);
      expect(json.data.career_trajectory).toBeDefined();
      expect(json.data.market_demand).toBeDefined();
      expect(json.data.salary_insight).toBeDefined();
    });
  });

  // =========================================================================
  // Step 5: AI Coach — Social Content
  // =========================================================================
  describe('Step 5: AI Coach - Social Content', () => {
    it('generates LinkedIn posts', async () => {
      const aiResponse = {
        posts: [
          {
            type: 'availability-announcement',
            content: 'Exciting news! After 6 years of building React applications, I am open to new opportunities. #OpenToWork #React #Frontend',
            hook: 'Exciting news!',
            estimated_engagement: 'high',
            best_time_to_post: 'Tuesday 9am EST',
          },
          {
            type: 'thought-leadership',
            content: 'Here are 3 lessons I learned from leading a frontend team at TechCorp...',
            hook: '3 lessons from leading a frontend team',
            estimated_engagement: 'medium',
            best_time_to_post: 'Wednesday 11am EST',
          },
        ],
        profile_optimization: {
          headline_suggestion: 'Senior Frontend Engineer | React & TypeScript | Building Scalable Web Apps',
          about_section: 'I build high-performance web applications...',
          banner_idea: 'Clean code screenshot with React branding',
        },
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'social-content', platform: 'linkedin' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.posts).toHaveLength(2);
      expect(json.data.posts[0].type).toBe('availability-announcement');
      expect(json.data.posts[0].content).toContain('#OpenToWork');
      expect(json.data.profile_optimization).toBeDefined();
      expect(json.data.profile_optimization.headline_suggestion).toBeDefined();
    });

    it('generates Twitter posts', async () => {
      const aiResponse = {
        posts: [
          {
            type: 'skill-showcase',
            content: 'Just shipped a React app that handles 10k concurrent users. Here is what I learned about performance... #ReactJS #WebDev',
            hook: 'Just shipped a React app',
            estimated_engagement: 'medium',
            best_time_to_post: 'Thursday 2pm EST',
          },
        ],
        profile_optimization: {
          headline_suggestion: 'Frontend Dev | React | TypeScript',
          about_section: 'Building web apps that scale.',
          banner_idea: 'Tech-themed header image',
        },
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'social-content', platform: 'twitter' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data.posts).toHaveLength(1);
      expect(json.data.posts[0].type).toBe('skill-showcase');
      // Verify the prompt references twitter
      const promptArg = mockGenerateContent.mock.calls[0][0];
      expect(promptArg).toContain('twitter');
    });

    it('includes profile optimization tips', async () => {
      const aiResponse = {
        posts: [],
        profile_optimization: {
          headline_suggestion: 'Optimized LinkedIn headline for visibility',
          about_section: 'A compelling about section that tells your career story.',
          banner_idea: 'Professional banner showing your tech stack',
        },
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const request = makeJsonRequest({ action: 'social-content' });
      const res = await aiCoachPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.profile_optimization).toBeDefined();
      expect(json.data.profile_optimization.headline_suggestion).toBeDefined();
      expect(json.data.profile_optimization.about_section).toBeDefined();
      expect(json.data.profile_optimization.banner_idea).toBeDefined();
    });
  });

  // =========================================================================
  // Step 6: Apply Enhancement to Profile
  // =========================================================================
  describe('Step 6: Apply Enhancement to Profile', () => {
    beforeEach(() => {
      // Apply-enhancement uses serverFrom for both reads and writes
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { skills: ['React', 'TypeScript'], work_history: MOCK_CANDIDATE.work_history, certifications: ['AWS Certified Developer'], languages: ['English'] },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return buildChain([]);
      });
    });

    it('applies headline update to candidate profile', async () => {
      const request = makeJsonRequest({
        field: 'headline',
        value: 'Senior Frontend Engineer | React Expert',
      });

      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.updated).toContain('headline');
    });

    it('applies bio update to candidate profile', async () => {
      const request = makeJsonRequest({
        field: 'bio',
        value: 'High-performance frontend engineer with 6 years of experience.',
      });

      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.updated).toContain('bio');
    });

    it('merges new skills with existing skills (no duplicates)', async () => {
      let capturedUpdate: Record<string, unknown> = {};
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { skills: ['React', 'TypeScript'] },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedUpdate = data;
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return buildChain([]);
      });

      const request = makeJsonRequest({
        field: 'skills',
        value: ['React', 'GraphQL', 'Next.js'],  // React already exists
      });

      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      // Verify skills are merged without duplicates
      const mergedSkills = capturedUpdate.skills as string[];
      expect(mergedSkills).toContain('React');
      expect(mergedSkills).toContain('TypeScript');
      expect(mergedSkills).toContain('GraphQL');
      expect(mergedSkills).toContain('Next.js');
      // No duplicate React
      expect(mergedSkills.filter((s: string) => s === 'React')).toHaveLength(1);
    });

    it('applies all resume improvements at once', async () => {
      let capturedUpdate: Record<string, unknown> = {};
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    skills: ['React', 'TypeScript'],
                    work_history: [{ company: 'TechCorp', title: 'Dev', description: 'Old description' }],
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockImplementation((data: Record<string, unknown>) => {
              capturedUpdate = data;
              return {
                eq: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return buildChain([]);
      });

      const request = makeJsonRequest({
        field: 'all_resume',
        value: {
          headline: 'Elite Frontend Engineer',
          bio: 'Award-winning developer.',
          skills: ['React', 'GraphQL'],
          added_skills: ['Performance Optimization'],
          work_history: [
            { company: 'TechCorp', improved_description: 'Led team of 5, increased performance by 40%' },
          ],
        },
      });

      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(capturedUpdate.headline).toBe('Elite Frontend Engineer');
      expect(capturedUpdate.bio).toBe('Award-winning developer.');
      const skills = capturedUpdate.skills as string[];
      expect(skills).toContain('React');
      expect(skills).toContain('GraphQL');
      expect(skills).toContain('Performance Optimization');
      expect(skills).toContain('TypeScript'); // existing skill preserved
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = makeJsonRequest({ field: 'headline', value: 'New headline' });
      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 for unknown field', async () => {
      const request = makeJsonRequest({ field: 'nonexistent_field', value: 'test' });
      const res = await applyEnhancementPOST(request);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('Unknown field');
    });
  });

  // =========================================================================
  // Step 7: Matched Jobs
  // =========================================================================
  describe('Step 7: Matched Jobs', () => {
    it('returns AI-scored job matches for candidate', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return setupCandidateQuery();
        }
        return buildChain([]);
      });

      mockServiceFrom.mockImplementation((table: string) => {
        if (table === 'jobs') {
          return buildChain(MOCK_JOBS);
        }
        return buildChain([]);
      });

      const aiResponse = {
        matches: [
          {
            job_index: 0,
            score: 90,
            skills_match: 85,
            experience_match: 92,
            culture_match: 80,
            why: 'Strong React and TypeScript skills align perfectly with the role',
            tip: 'Emphasize your team leadership experience',
          },
          {
            job_index: 1,
            score: 75,
            skills_match: 70,
            experience_match: 80,
            culture_match: 65,
            why: 'Good full-stack potential with React and Node.js',
            tip: 'Add PostgreSQL to your skill set',
          },
        ],
      };

      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(aiResponse) },
      });

      const res = await matchedJobsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.matches).toHaveLength(2);
      expect(json.matches[0].score).toBe(90);
      expect(json.matches[0].job.title).toBe('Senior React Developer');
      expect(json.matches[1].job.title).toBe('Full-Stack Engineer');
      // Sorted by score descending
      expect(json.matches[0].score).toBeGreaterThanOrEqual(json.matches[1].score);
    });

    it('returns 401 for unauthenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const res = await matchedJobsGET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns message when no jobs available', async () => {
      mockServerFrom.mockImplementation((table: string) => {
        if (table === 'candidates') {
          return setupCandidateQuery();
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
  });
});
