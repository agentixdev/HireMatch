/**
 * @jest-environment node
 *
 * E2E Integration Tests: Billing Flow
 *
 * Tests the billing endpoints:
 * - POST /api/billing/create-checkout
 * - GET /api/billing/usage
 * - POST /api/billing/portal
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockRecruiterSingle = jest.fn();
const mockServiceUpdateEq = jest.fn();
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

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn(),
        }),
      }),
    }),
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

const mockStripeCustomersCreate = jest.fn();
const mockStripeCheckoutSessionsCreate = jest.fn();
const mockStripeBillingPortalSessionsCreate = jest.fn();

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    customers: {
      create: (...args: unknown[]) => mockStripeCustomersCreate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockStripeCheckoutSessionsCreate(...args),
      },
    },
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockStripeBillingPortalSessionsCreate(...args),
      },
    },
  }),
  TIER_CONFIG: {
    free: { name: 'Free', price: 0, stripePriceId: '', jobLimit: 3, viewLimit: 10, features: [] },
    pro: { name: 'Pro', price: 99, stripePriceId: 'price_pro_123', jobLimit: Infinity, viewLimit: Infinity, features: [] },
    enterprise: { name: 'Enterprise', price: 499, stripePriceId: 'price_ent_123', jobLimit: Infinity, viewLimit: Infinity, features: [] },
    agency: { name: 'Agency', price: 999, stripePriceId: 'price_agency_123', jobLimit: Infinity, viewLimit: Infinity, features: [] },
  },
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------
import { POST as createCheckout } from '@/app/api/billing/create-checkout/route';
import { GET as getUsage } from '@/app/api/billing/usage/route';
import { POST as createPortal } from '@/app/api/billing/portal/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
  return {
    json: async () => body,
    headers: new Map([['origin', 'https://hirematch.com']]),
  } as unknown as Request;
}

function resetMocks() {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } } });
  mockServiceUpdateEq.mockResolvedValue({ error: null });

  // Default service from chain
  mockServiceFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: (...args: unknown[]) => mockRecruiterSingle(...args),
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
    }),
  }));

  mockRecruiterSingle.mockResolvedValue({
    data: {
      id: 'rec-1',
      stripe_customer_id: null,
      company_name: 'Acme Corp',
      tier: 'free',
      monthly_views_used: 5,
      monthly_views_reset_at: new Date(Date.now() + 86400000).toISOString(),
      billing_period_end: null,
    },
  });

  mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_new_123' });
  mockStripeCheckoutSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' });
  mockStripeBillingPortalSessionsCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal_123' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Billing Flow', () => {
  beforeEach(() => {
    resetMocks();
  });

  // -- POST /api/billing/create-checkout --

  it('create-checkout returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await createCheckout(makeRequest({ tier: 'pro' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('create-checkout returns 400 for invalid tier', async () => {
    const res = await createCheckout(makeRequest({ tier: 'free' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid billing tier');
  });

  it('create-checkout creates Stripe customer and checkout session', async () => {
    const res = await createCheckout(makeRequest({ tier: 'pro' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://checkout.stripe.com/session_123');
    expect(mockStripeCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
  });

  it('create-checkout reuses existing Stripe customer', async () => {
    mockRecruiterSingle.mockResolvedValue({
      data: {
        id: 'rec-1',
        stripe_customer_id: 'cus_existing_456',
        company_name: 'Acme Corp',
        tier: 'free',
      },
    });

    const res = await createCheckout(makeRequest({ tier: 'enterprise' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://checkout.stripe.com/session_123');
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled();
    expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
  });

  // -- GET /api/billing/usage --

  it('usage returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await getUsage();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('usage returns current usage and tier info', async () => {
    const jobsSelectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 2 }),
      }),
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: (...args: unknown[]) => mockRecruiterSingle(...args),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: (...args: unknown[]) => jobsSelectMock(...args),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn() }) }) };
    });

    const res = await getUsage();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tier).toBe('free');
    expect(json.monthlyViewsUsed).toBe(5);
    expect(json.jobLimit).toBe(3);
    expect(json.viewLimit).toBe(10);
  });

  it('usage resets monthly views when past reset date', async () => {
    mockRecruiterSingle.mockResolvedValue({
      data: {
        id: 'rec-1',
        tier: 'pro',
        monthly_views_used: 42,
        monthly_views_reset_at: new Date(Date.now() - 86400000).toISOString(),
        billing_period_end: null,
      },
    });

    const jobsSelectMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0 }),
      }),
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: (...args: unknown[]) => mockRecruiterSingle(...args),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: (...args: unknown[]) => jobsSelectMock(...args),
        };
      }
      return { select: jest.fn() };
    });

    const res = await getUsage();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.monthlyViewsUsed).toBe(0);
    expect(mockServiceUpdateEq).toHaveBeenCalled();
  });

  // -- POST /api/billing/portal --

  it('portal returns 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await createPortal(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('portal returns 400 when no billing account', async () => {
    mockRecruiterSingle.mockResolvedValue({
      data: { id: 'rec-1', stripe_customer_id: null },
    });

    const res = await createPortal(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('No billing account');
  });

  it('portal creates Stripe portal session', async () => {
    mockRecruiterSingle.mockResolvedValue({
      data: { id: 'rec-1', stripe_customer_id: 'cus_existing_456' },
    });

    const res = await createPortal(makeRequest({}));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe('https://billing.stripe.com/portal_123');
    expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledTimes(1);
  });
});
