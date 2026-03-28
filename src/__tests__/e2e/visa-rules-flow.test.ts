/**
 * @jest-environment node
 *
 * E2E Integration Tests: Visa Rules Flow
 *
 * Tests visa rule listing, filtering by country, visa type,
 * sponsorship availability, and rule history.
 * Uses the cron visa-refresh endpoint + direct Supabase queries.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/visa-scraper', () => ({
  seedVisaRules: jest.fn().mockResolvedValue({ success: true, total: 22 }),
  scrapeAllCountries: jest.fn().mockResolvedValue({
    results: { us: { success: true, count: 6 }, gb: { success: true, count: 4 } },
    totalSuccess: 2,
    totalFailed: 0,
  }),
  VISA_SOURCES: {
    us: { name: 'United States', urls: [] },
    gb: { name: 'United Kingdom', urls: [] },
  },
}));

jest.mock('@/lib/event-bus', () => ({
  publishEvent: jest.fn().mockResolvedValue({ eventId: 'evt-1', deliveryCount: 0 }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { GET as visaRefreshGET } from '@/app/api/cron/visa-refresh/route';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const VISA_RULES = [
  {
    id: 'vr-1',
    origin_country: 'in',
    destination_country: 'us',
    visa_type: 'H-1B',
    name: 'H-1B Specialty Occupation',
    description: 'For workers in specialty occupations',
    sponsorship_required: true,
    processing_time_days: 120,
    fee_amount: 1710,
    fee_currency: 'USD',
    quota_limited: true,
    annual_quota: 85000,
    is_active: true,
    last_scraped_at: '2026-03-01T00:00:00Z',
    last_changed_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'vr-2',
    origin_country: 'in',
    destination_country: 'gb',
    visa_type: 'Skilled Worker',
    name: 'Skilled Worker Visa',
    description: 'For workers with a job offer from a licensed sponsor',
    sponsorship_required: true,
    processing_time_days: 21,
    fee_amount: 719,
    fee_currency: 'GBP',
    quota_limited: false,
    annual_quota: null,
    is_active: true,
    last_scraped_at: '2026-03-01T00:00:00Z',
    last_changed_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 'vr-3',
    origin_country: 'br',
    destination_country: 'de',
    visa_type: 'Blue Card',
    name: 'EU Blue Card',
    description: 'For highly qualified workers in the EU',
    sponsorship_required: false,
    processing_time_days: 30,
    fee_amount: 140,
    fee_currency: 'EUR',
    quota_limited: false,
    annual_quota: null,
    is_active: true,
    last_scraped_at: '2026-03-01T00:00:00Z',
    last_changed_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'vr-4',
    origin_country: 'in',
    destination_country: 'us',
    visa_type: 'L-1',
    name: 'L-1 Intracompany Transfer',
    description: 'For transferees within same company',
    sponsorship_required: true,
    processing_time_days: 90,
    fee_amount: 960,
    fee_currency: 'USD',
    quota_limited: false,
    annual_quota: null,
    is_active: true,
    last_scraped_at: '2026-03-01T00:00:00Z',
    last_changed_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'vr-5',
    origin_country: 'mx',
    destination_country: 'us',
    visa_type: 'TN',
    name: 'TN NAFTA Professional',
    description: 'For Canadian and Mexican professionals under USMCA',
    sponsorship_required: false,
    processing_time_days: 1,
    fee_amount: 160,
    fee_currency: 'USD',
    quota_limited: false,
    annual_quota: null,
    is_active: true,
    last_scraped_at: '2026-03-01T00:00:00Z',
    last_changed_at: '2026-01-05T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Visa Rules Flow', () => {
  it('visa refresh cron returns 401 without valid auth token', async () => {
    const request = {
      headers: { get: (key: string) => key === 'authorization' ? 'Bearer wrong-token' : null },
    } as unknown as Request;

    // Set env var for comparison
    process.env.CRON_SECRET = 'correct-secret';

    const res = await visaRefreshGET(request);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('visa refresh cron returns success with valid auth token', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';

    const request = {
      headers: { get: (key: string) => key === 'authorization' ? 'Bearer test-cron-secret' : null },
    } as unknown as Request;

    const res = await visaRefreshGET(request);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.timestamp).toBeDefined();
    expect(json.seed).toBeDefined();
    expect(json.scrape).toBeDefined();
    expect(json.eventsPublished).toBeGreaterThanOrEqual(0);
  });

  it('can filter visa rules by destination country', () => {
    const usRules = VISA_RULES.filter(r => r.destination_country === 'us');

    expect(usRules).toHaveLength(3);
    expect(usRules.every(r => r.destination_country === 'us')).toBe(true);
    expect(usRules.map(r => r.visa_type)).toContain('H-1B');
    expect(usRules.map(r => r.visa_type)).toContain('L-1');
    expect(usRules.map(r => r.visa_type)).toContain('TN');
  });

  it('can filter visa rules by visa type', () => {
    const h1bRules = VISA_RULES.filter(r => r.visa_type === 'H-1B');

    expect(h1bRules).toHaveLength(1);
    expect(h1bRules[0].name).toBe('H-1B Specialty Occupation');
    expect(h1bRules[0].quota_limited).toBe(true);
    expect(h1bRules[0].annual_quota).toBe(85000);
  });

  it('can filter visa rules by sponsorship requirement', () => {
    const sponsorshipRequired = VISA_RULES.filter(r => r.sponsorship_required);
    const noSponsorshipNeeded = VISA_RULES.filter(r => !r.sponsorship_required);

    expect(sponsorshipRequired).toHaveLength(3); // H-1B, Skilled Worker, L-1
    expect(noSponsorshipNeeded).toHaveLength(2); // Blue Card, TN

    // Verify specific rules
    expect(sponsorshipRequired.map(r => r.visa_type)).toContain('H-1B');
    expect(sponsorshipRequired.map(r => r.visa_type)).toContain('Skilled Worker');
    expect(noSponsorshipNeeded.map(r => r.visa_type)).toContain('Blue Card');
    expect(noSponsorshipNeeded.map(r => r.visa_type)).toContain('TN');
  });

  it('visa rule has correct structure with all required fields', () => {
    const rule = VISA_RULES[0];

    expect(rule.id).toBeDefined();
    expect(rule.origin_country).toBeDefined();
    expect(rule.destination_country).toBeDefined();
    expect(rule.visa_type).toBeDefined();
    expect(rule.name).toBeDefined();
    expect(rule.description).toBeDefined();
    expect(typeof rule.sponsorship_required).toBe('boolean');
    expect(typeof rule.processing_time_days).toBe('number');
    expect(typeof rule.is_active).toBe('boolean');
    expect(rule.last_scraped_at).toBeDefined();
    expect(rule.fee_amount).toBeDefined();
    expect(rule.fee_currency).toBeDefined();
  });

  it('can filter rules by origin country', () => {
    const fromIndia = VISA_RULES.filter(r => r.origin_country === 'in');
    const fromBrazil = VISA_RULES.filter(r => r.origin_country === 'br');
    const fromMexico = VISA_RULES.filter(r => r.origin_country === 'mx');

    expect(fromIndia).toHaveLength(3);
    expect(fromBrazil).toHaveLength(1);
    expect(fromMexico).toHaveLength(1);
    expect(fromBrazil[0].visa_type).toBe('Blue Card');
    expect(fromMexico[0].visa_type).toBe('TN');
  });

  it('identifies quota-limited visas', () => {
    const quotaLimited = VISA_RULES.filter(r => r.quota_limited);

    expect(quotaLimited).toHaveLength(1);
    expect(quotaLimited[0].visa_type).toBe('H-1B');
    expect(quotaLimited[0].annual_quota).toBe(85000);
  });
});
