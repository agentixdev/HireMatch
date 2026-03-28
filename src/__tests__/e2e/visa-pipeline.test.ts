/**
 * @jest-environment node
 *
 * E2E Integration Tests: Visa Data Pipeline
 *
 * Tests the full visa data pipeline:
 * - GET /api/visa/rules — returns visa rules
 * - GET /api/visa/rules?country=us — filters by country
 * - GET /api/visa/rules/:country — country-specific endpoint
 * - POST /api/visa/ingest — accepts scraped data from VPS
 * - POST /api/visa/seed — seeds initial data
 * - GET /api/cron/visa-refresh — runs full pipeline
 * - Auth checks on protected endpoints
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockUpsert = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();

const mockServiceFrom = jest.fn().mockImplementation(() => ({
  select: (...args: unknown[]) => mockSelect(...args),
  upsert: (...args: unknown[]) => mockUpsert(...args),
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
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

const mockSeedVisaRules = jest.fn();
const mockScrapeAllCountries = jest.fn();

jest.mock('@/lib/visa-scraper', () => ({
  seedVisaRules: (...args: unknown[]) => mockSeedVisaRules(...args),
  scrapeAllCountries: (...args: unknown[]) => mockScrapeAllCountries(...args),
  VISA_SOURCES: {
    us: {
      name: 'United States',
      urls: ['https://www.uscis.gov/working-in-the-united-states'],
    },
    ca: {
      name: 'Canada',
      urls: ['https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html'],
    },
    gb: {
      name: 'United Kingdom',
      urls: ['https://www.gov.uk/browse/visas-immigration/work-visas'],
    },
  },
}));

const mockPublishEvent = jest.fn().mockResolvedValue({ eventId: 'evt-1', deliveryCount: 0 });
jest.mock('@/lib/event-bus', () => ({
  publishEvent: (...args: unknown[]) => mockPublishEvent(...args),
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
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------
import { GET as getVisaRules } from '@/app/api/visa/rules/route';
import { GET as getVisaRulesCountry } from '@/app/api/visa/rules/[country]/route';
import { POST as postVisaIngest } from '@/app/api/visa/ingest/route';
import { POST as postVisaSeed } from '@/app/api/visa/seed/route';
import { GET as getVisaRefresh } from '@/app/api/cron/visa-refresh/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_RULES = [
  {
    id: '1',
    country_code: 'us',
    visa_type: 'H-1B',
    title: 'H-1B Specialty Occupation Visa',
    description: 'For professionals in specialty occupations.',
    requirements: { sponsorship_required: true, quota_limited: true },
    processing_time: '3-6 months',
    cost: '$1,710',
    validity: '3 years',
    source_url: 'https://www.uscis.gov/working-in-the-united-states',
  },
  {
    id: '2',
    country_code: 'us',
    visa_type: 'L-1A',
    title: 'L-1A Intra-Company Transfer',
    description: 'For managers transferring within a company.',
    requirements: { sponsorship_required: true, quota_limited: false },
    processing_time: '4-7 months',
    cost: '$1,710',
    validity: '1-3 years',
    source_url: 'https://www.uscis.gov/working-in-the-united-states',
  },
  {
    id: '3',
    country_code: 'ca',
    visa_type: 'Express Entry',
    title: 'Express Entry (Federal Skilled Worker)',
    description: 'Points-based immigration system.',
    requirements: { sponsorship_required: false, quota_limited: false },
    processing_time: '6 months',
    cost: 'CAD $1,365',
    validity: 'Permanent residency',
    source_url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
  },
];

function makeRequest(url: string, options?: { method?: string; headers?: Record<string, string>; body?: unknown }): Request {
  return {
    url,
    method: options?.method ?? 'GET',
    headers: {
      get: (name: string) => options?.headers?.[name.toLowerCase()] ?? null,
    },
    json: async () => options?.body,
  } as unknown as Request;
}

function resetMocks() {
  jest.clearAllMocks();

  // Default: select returns all sample rules with chainable order()
  mockOrder.mockReturnValue({ data: SAMPLE_RULES, error: null });
  mockEq.mockReturnValue({ order: mockOrder, data: SAMPLE_RULES, error: null });
  mockSelect.mockReturnValue({
    order: mockOrder,
    eq: mockEq,
  });
  // Chain: select -> order -> order
  mockOrder.mockImplementation(() => ({
    order: mockOrder,
    data: SAMPLE_RULES,
    error: null,
  }));

  mockUpsert.mockResolvedValue({ error: null });

  mockSeedVisaRules.mockResolvedValue({ success: true, total: 22 });
  mockScrapeAllCountries.mockResolvedValue({
    results: {
      us: { success: true, count: 6 },
      ca: { success: true, count: 4 },
      gb: { success: false, count: 0, error: 'timeout' },
    },
    totalSuccess: 2,
    totalFailed: 1,
  });

  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => JSON.stringify([
        {
          visa_type: 'H-1B',
          title: 'H-1B Specialty Occupation Visa',
          description: 'For professionals in specialty occupations.',
          requirements: { sponsorship_required: true },
          processing_time: '3-6 months',
          cost: '$1,710',
          validity: '3 years',
        },
      ]),
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Visa Data Pipeline', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.VPS_SCRAPER_SECRET = 'test-vps-secret';
    resetMocks();
  });

  // ── GET /api/visa/rules ─────────────────────────────────────────────

  describe('GET /api/visa/rules', () => {
    it('returns all visa rules', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/rules');
      const res = await getVisaRules(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.rules).toEqual(SAMPLE_RULES);
      expect(json.count).toBe(3);
    });

    it('filters by country query param', async () => {
      const usRules = SAMPLE_RULES.filter(r => r.country_code === 'us');
      mockOrder.mockImplementation(() => ({
        order: jest.fn().mockReturnValue({ data: usRules, error: null }),
        data: usRules,
        error: null,
      }));

      const req = makeRequest('http://localhost:3000/api/visa/rules?country=us');
      const res = await getVisaRules(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(mockEq).toHaveBeenCalledWith('country_code', 'us');
    });

    it('filters by sponsorship=true', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/rules?sponsorship=true');
      const res = await getVisaRules(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      // Only rules with sponsorship_required: true should be returned
      for (const rule of json.rules) {
        expect(rule.requirements.sponsorship_required).toBe(true);
      }
    });

    it('filters by sponsorship=false', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/rules?sponsorship=false');
      const res = await getVisaRules(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      for (const rule of json.rules) {
        expect(rule.requirements.sponsorship_required).toBe(false);
      }
    });

    it('returns 500 on database error', async () => {
      mockSelect.mockReturnValue({
        order: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({ data: null, error: { message: 'DB error' } }),
        }),
        eq: mockEq,
      });

      const req = makeRequest('http://localhost:3000/api/visa/rules');
      const res = await getVisaRules(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Failed to fetch visa rules');
    });
  });

  // ── GET /api/visa/rules/:country ────────────────────────────────────

  describe('GET /api/visa/rules/:country', () => {
    it('returns visa rules for a valid country', async () => {
      const usRules = SAMPLE_RULES.filter(r => r.country_code === 'us');
      mockEq.mockReturnValue({
        order: jest.fn().mockReturnValue({ data: usRules, error: null }),
      });

      const req = makeRequest('http://localhost:3000/api/visa/rules/us');
      const res = await getVisaRulesCountry(req, { params: Promise.resolve({ country: 'us' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.country.code).toBe('us');
      expect(json.country.name).toBe('United States');
      expect(json.rules).toEqual(usRules);
    });

    it('returns 404 for unknown country code', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/rules/xx');
      const res = await getVisaRulesCountry(req, { params: Promise.resolve({ country: 'xx' }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Unknown country code');
    });

    it('handles uppercase country codes', async () => {
      const usRules = SAMPLE_RULES.filter(r => r.country_code === 'us');
      mockEq.mockReturnValue({
        order: jest.fn().mockReturnValue({ data: usRules, error: null }),
      });

      const req = makeRequest('http://localhost:3000/api/visa/rules/US');
      const res = await getVisaRulesCountry(req, { params: Promise.resolve({ country: 'US' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.country.code).toBe('us');
    });
  });

  // ── POST /api/visa/ingest ───────────────────────────────────────────

  describe('POST /api/visa/ingest', () => {
    it('returns 401 without auth', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/ingest', {
        method: 'POST',
        body: { country_code: 'us', html: '<html>test</html>' },
      });
      const res = await postVisaIngest(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 with wrong token', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/ingest', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-token' },
        body: { country_code: 'us', html: '<html>test</html>' },
      });
      const res = await postVisaIngest(req);

      expect(res.status).toBe(401);
    });

    it('returns 400 when country_code or html is missing', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/ingest', {
        method: 'POST',
        headers: { authorization: 'Bearer test-vps-secret' },
        body: { country_code: 'us' },
      });
      const res = await postVisaIngest(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('required');
    });

    it('returns 404 for unknown country', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/ingest', {
        method: 'POST',
        headers: { authorization: 'Bearer test-vps-secret' },
        body: { country_code: 'xx', html: '<html>test</html>' },
      });
      const res = await postVisaIngest(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toContain('Unknown country code');
    });

    it('accepts valid scraped data and returns parsed results', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/ingest', {
        method: 'POST',
        headers: { authorization: 'Bearer test-vps-secret' },
        body: {
          country_code: 'us',
          url: 'https://www.uscis.gov/test',
          html: '<html><body><h1>H-1B Visa Info</h1><p>Details here.</p></body></html>',
        },
      });
      const res = await postVisaIngest(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.country_code).toBe('us');
      expect(json.rules_parsed).toBe(1);
      expect(json.rules_upserted).toBe(1);

      // Verify Gemini was called
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify upsert was called
      expect(mockServiceFrom).toHaveBeenCalledWith('visa_rules');
      expect(mockUpsert).toHaveBeenCalled();

      // Verify event was published
      expect(mockPublishEvent).toHaveBeenCalledWith(
        'system',
        'visa_rule.updated',
        expect.objectContaining({
          country_code: 'us',
          country_name: 'United States',
          source: 'vps_scraper',
        })
      );
    });
  });

  // ── POST /api/visa/seed ─────────────────────────────────────────────

  describe('POST /api/visa/seed', () => {
    it('returns 401 without auth', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/seed', {
        method: 'POST',
      });
      const res = await postVisaSeed(req);

      expect(res.status).toBe(401);
    });

    it('seeds visa data with valid auth', async () => {
      const req = makeRequest('http://localhost:3000/api/visa/seed', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      });
      const res = await postVisaSeed(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.total).toBe(22);
      expect(json.success).toBe(true);
      expect(mockSeedVisaRules).toHaveBeenCalledTimes(1);
    });

    it('returns error details when seeding fails', async () => {
      mockSeedVisaRules.mockResolvedValue({ success: false, total: 5, error: 'Partial failure' });

      const req = makeRequest('http://localhost:3000/api/visa/seed', {
        method: 'POST',
        headers: { authorization: 'Bearer test-cron-secret' },
      });
      const res = await postVisaSeed(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Partial failure');
    });
  });

  // ── GET /api/cron/visa-refresh ──────────────────────────────────────

  describe('GET /api/cron/visa-refresh', () => {
    it('returns 401 without auth', async () => {
      const req = makeRequest('http://localhost:3000/api/cron/visa-refresh');
      const res = await getVisaRefresh(req);

      expect(res.status).toBe(401);
    });

    it('runs full pipeline with valid auth', async () => {
      const req = makeRequest('http://localhost:3000/api/cron/visa-refresh', {
        headers: { authorization: 'Bearer test-cron-secret' },
      });
      const res = await getVisaRefresh(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);

      // Seed was called
      expect(json.seed.success).toBe(true);
      expect(json.seed.total).toBe(22);

      // Scrape results
      expect(json.scrape.totalSuccess).toBe(2);
      expect(json.scrape.totalFailed).toBe(1);

      // Events published for successful countries with count > 0
      expect(json.eventsPublished).toBe(2);

      // Verify functions were called
      expect(mockSeedVisaRules).toHaveBeenCalledTimes(1);
      expect(mockScrapeAllCountries).toHaveBeenCalledTimes(1);
    });

    it('publishes events only for countries with changes', async () => {
      const req = makeRequest('http://localhost:3000/api/cron/visa-refresh', {
        headers: { authorization: 'Bearer test-cron-secret' },
      });
      await getVisaRefresh(req);

      // us (success, count 6) and ca (success, count 4) get events
      // gb (failed) does not
      expect(mockPublishEvent).toHaveBeenCalledTimes(2);
      expect(mockPublishEvent).toHaveBeenCalledWith(
        'system',
        'visa_rule.updated',
        expect.objectContaining({ country_code: 'us', rules_updated: 6 })
      );
      expect(mockPublishEvent).toHaveBeenCalledWith(
        'system',
        'visa_rule.updated',
        expect.objectContaining({ country_code: 'ca', rules_updated: 4 })
      );
    });

    it('returns 500 on unexpected error', async () => {
      mockSeedVisaRules.mockRejectedValue(new Error('Unexpected crash'));

      const req = makeRequest('http://localhost:3000/api/cron/visa-refresh', {
        headers: { authorization: 'Bearer test-cron-secret' },
      });
      const res = await getVisaRefresh(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Internal error');
    });
  });
});
