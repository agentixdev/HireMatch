/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mocks — declared before imports
// ---------------------------------------------------------------------------

// Chainable supabase mock builder
function createChainMock(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {};
  const terminalMethods = ['single', 'maybeSingle'];
  const chainingMethods = ['select', 'eq', 'gte', 'like', 'lt', 'insert', 'delete', 'update'];

  for (const method of terminalMethods) {
    chain[method] = jest.fn().mockResolvedValue(resolvedValue);
  }
  for (const method of chainingMethods) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  return chain;
}

// Per-table mock chains
let orgChain: any;
let apiUsageChain: any;
let jobsChain: any;
let subscriptionEventsChain: any;
let deliveriesChain: any;
let eventsChain: any;

const mockFrom = jest.fn().mockImplementation((table: string) => {
  switch (table) {
    case 'organizations': return orgChain;
    case 'api_usage': return apiUsageChain;
    case 'jobs': return jobsChain;
    case 'subscription_events': return subscriptionEventsChain;
    case 'webhook_deliveries': return deliveriesChain;
    case 'webhook_events': return eventsChain;
    default: return createChainMock();
  }
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// Mock Stripe
const mockMeterEventsCreate = jest.fn().mockResolvedValue({});
const mockSubscriptionsRetrieve = jest.fn().mockResolvedValue({
  current_period_start: Math.floor(Date.now() / 1000) - 86400,
});

jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(() => ({
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
    billing: { meterEvents: { create: mockMeterEventsCreate } },
  })),
  TIER_CONFIG: {
    free: { name: 'Free', price: 0, stripePriceId: '', jobLimit: 3, viewLimit: 10, features: [] },
    pro: { name: 'Pro', price: 99, stripePriceId: 'price_pro', jobLimit: Infinity, viewLimit: Infinity, features: [] },
    enterprise: { name: 'Enterprise', price: 499, stripePriceId: 'price_ent', jobLimit: Infinity, viewLimit: Infinity, features: [] },
    agency: { name: 'Agency', price: 999, stripePriceId: 'price_ag', jobLimit: Infinity, viewLimit: Infinity, features: [] },
  },
}));

// Mock supabase-server for webhook-cleanup
jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { syncUsageToStripe, checkUsageLimits } from '@/lib/usage-sync';
import { cleanupOldDeliveries } from '@/lib/webhook-cleanup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetAllMocks() {
  jest.clearAllMocks();

  orgChain = createChainMock();
  apiUsageChain = createChainMock();
  jobsChain = createChainMock();
  subscriptionEventsChain = createChainMock();
  deliveriesChain = createChainMock();
  eventsChain = createChainMock();
}

function setupOrg(overrides: Record<string, any> = {}) {
  const org = {
    id: 'org-1',
    stripe_customer_id: 'cus_test123',
    stripe_subscription_id: 'sub_test123',
    billing_tier: 'free',
    ...overrides,
  };
  orgChain = createChainMock({ data: org, error: null });
}

function setupApiUsageCounts(apiCalls: number, candidateViews: number) {
  // The api_usage chain is called multiple times with different filters.
  // Each call to .select() starts a new query. We need to track call order.
  let callCount = 0;
  const originalSelect = jest.fn().mockImplementation(() => {
    callCount++;
    const chain = createChainMock();
    if (callCount === 1) {
      // First call: total API calls — terminal method returns count
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockResolvedValue({ count: apiCalls, error: null });
    } else {
      // Second call: candidate views — has .like().eq().gte() chain
      chain.eq = jest.fn().mockReturnValue(chain);
      chain.like = jest.fn().mockReturnValue(chain);
      chain.gte = jest.fn().mockResolvedValue({ count: candidateViews, error: null });
    }
    return chain;
  });

  apiUsageChain = { select: originalSelect };
}

function setupJobCount(count: number) {
  const chain = createChainMock();
  chain.eq = jest.fn().mockReturnValue(chain);
  // The final .eq for is_active resolves
  let eqCallCount = 0;
  chain.eq = jest.fn().mockImplementation(() => {
    eqCallCount++;
    if (eqCallCount >= 2) {
      return Promise.resolve({ count, error: null });
    }
    return chain;
  });
  jobsChain = { select: jest.fn().mockReturnValue(chain) };
}

function setupUsageForLimitsCheck(candidateViews: number, activeJobs: number) {
  // api_usage chain for candidate views in checkUsageLimits
  const usageChain = createChainMock();
  usageChain.eq = jest.fn().mockReturnValue(usageChain);
  usageChain.like = jest.fn().mockReturnValue(usageChain);
  usageChain.gte = jest.fn().mockResolvedValue({ count: candidateViews, error: null });
  apiUsageChain = { select: jest.fn().mockReturnValue(usageChain) };

  // jobs chain for active jobs
  const jChain = createChainMock();
  let jEqCount = 0;
  jChain.eq = jest.fn().mockImplementation(() => {
    jEqCount++;
    if (jEqCount >= 2) {
      return Promise.resolve({ count: activeJobs, error: null });
    }
    return jChain;
  });
  jobsChain = { select: jest.fn().mockReturnValue(jChain) };
}

// ---------------------------------------------------------------------------
// Tests — syncUsageToStripe
// ---------------------------------------------------------------------------

describe('syncUsageToStripe', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('reads usage counts and reports to Stripe meter events', async () => {
    setupOrg();
    setupApiUsageCounts(50, 8);

    const result = await syncUsageToStripe('org-1');

    expect(result.apiCalls).toBe(50);
    expect(result.candidateViews).toBe(8);
    expect(result.reported).toBe(true);
    expect(mockMeterEventsCreate).toHaveBeenCalledTimes(2);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'api_calls',
        payload: expect.objectContaining({
          stripe_customer_id: 'cus_test123',
          value: '50',
        }),
      })
    );
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'candidate_views',
        payload: expect.objectContaining({
          value: '8',
        }),
      })
    );
  });

  it('returns reported=false when org has no stripe_customer_id', async () => {
    setupOrg({ stripe_customer_id: null });

    const result = await syncUsageToStripe('org-1');

    expect(result.reported).toBe(false);
    expect(result.apiCalls).toBe(0);
    expect(result.candidateViews).toBe(0);
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('returns reported=false when org query fails', async () => {
    orgChain = createChainMock({ data: null, error: { message: 'not found' } });

    const result = await syncUsageToStripe('org-missing');

    expect(result.reported).toBe(false);
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('does not call meterEvents.create when counts are zero', async () => {
    setupOrg();
    setupApiUsageCounts(0, 0);

    const result = await syncUsageToStripe('org-1');

    expect(result.apiCalls).toBe(0);
    expect(result.candidateViews).toBe(0);
    expect(result.reported).toBe(true);
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('returns reported=false when Stripe meter call throws', async () => {
    setupOrg();
    setupApiUsageCounts(10, 5);
    mockMeterEventsCreate.mockRejectedValueOnce(new Error('Stripe API error'));

    const result = await syncUsageToStripe('org-1');

    expect(result.reported).toBe(false);
    expect(result.apiCalls).toBe(10);
    expect(result.candidateViews).toBe(5);
  });

  it('falls back to month start when no subscription ID exists', async () => {
    setupOrg({ stripe_subscription_id: null });
    setupApiUsageCounts(3, 1);

    const result = await syncUsageToStripe('org-1');

    // Should not call subscriptions.retrieve
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(result.reported).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — checkUsageLimits
// ---------------------------------------------------------------------------

describe('checkUsageLimits', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('returns empty arrays when org is not found', async () => {
    orgChain = createChainMock({ data: null, error: { message: 'not found' } });

    const result = await checkUsageLimits('org-missing');

    expect(result.warnings).toEqual([]);
    expect(result.limitReached).toEqual([]);
  });

  it('detects candidate_views warning at 80% threshold (free tier: 8/10)', async () => {
    setupOrg({ billing_tier: 'free', stripe_subscription_id: null });
    setupUsageForLimitsCheck(8, 1);

    const result = await checkUsageLimits('org-1');

    expect(result.warnings).toContain('candidate_views');
    expect(result.limitReached).not.toContain('candidate_views');
  });

  it('detects candidate_views limit_reached at 100% (free tier: 10/10)', async () => {
    setupOrg({ billing_tier: 'free', stripe_subscription_id: null });
    setupUsageForLimitsCheck(10, 1);

    const result = await checkUsageLimits('org-1');

    expect(result.limitReached).toContain('candidate_views');
    expect(result.warnings).not.toContain('candidate_views');
  });

  it('detects jobs limit_reached at 100% (free tier: 3/3)', async () => {
    setupOrg({ billing_tier: 'free', stripe_subscription_id: null });
    setupUsageForLimitsCheck(1, 3);

    const result = await checkUsageLimits('org-1');

    expect(result.limitReached).toContain('jobs');
  });

  it('publishes billing.limit_warning event to subscription_events', async () => {
    setupOrg({ billing_tier: 'free', stripe_subscription_id: null });
    setupUsageForLimitsCheck(9, 1);

    await checkUsageLimits('org-1');

    expect(mockFrom).toHaveBeenCalledWith('subscription_events');
    expect(subscriptionEventsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        event_type: 'billing.limit_warning',
        metadata: expect.objectContaining({ resource: 'candidate_views', tier: 'free' }),
      })
    );
  });

  it('publishes billing.limit_reached event to subscription_events', async () => {
    setupOrg({ billing_tier: 'free', stripe_subscription_id: null });
    setupUsageForLimitsCheck(10, 3);

    await checkUsageLimits('org-1');

    // Both candidate_views and jobs should be limit_reached
    expect(subscriptionEventsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'billing.limit_reached',
        metadata: expect.objectContaining({ resource: 'candidate_views' }),
      })
    );
    expect(subscriptionEventsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'billing.limit_reached',
        metadata: expect.objectContaining({ resource: 'jobs' }),
      })
    );
  });

  it('returns no warnings for pro tier (Infinity limits)', async () => {
    setupOrg({ billing_tier: 'pro', stripe_subscription_id: null });
    setupUsageForLimitsCheck(999, 999);

    const result = await checkUsageLimits('org-1');

    expect(result.warnings).toEqual([]);
    expect(result.limitReached).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Tests — cleanupOldDeliveries
// ---------------------------------------------------------------------------

describe('cleanupOldDeliveries', () => {
  beforeEach(() => {
    resetAllMocks();

    // Set up deliveries chain for delete().lt().select()
    const delDeliverySelectResult = { data: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }], error: null };
    deliveriesChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(delDeliverySelectResult),
        }),
      }),
    };

    // Set up events chain for delete().lt().select()
    const delEventSelectResult = { data: [{ id: 'e1' }], error: null };
    eventsChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(delEventSelectResult),
        }),
      }),
    };
  });

  it('deletes old delivery and event records', async () => {
    const result = await cleanupOldDeliveries(30);

    expect(result.deletedDeliveries).toBe(3);
    expect(result.deletedEvents).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith('webhook_deliveries');
    expect(mockFrom).toHaveBeenCalledWith('webhook_events');
  });

  it('uses default retention of 30 days when no argument provided', async () => {
    const result = await cleanupOldDeliveries();

    expect(result.deletedDeliveries).toBe(3);
    expect(result.deletedEvents).toBe(1);
  });

  it('returns zero counts when delete returns empty arrays', async () => {
    deliveriesChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
    eventsChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const result = await cleanupOldDeliveries(7);

    expect(result.deletedDeliveries).toBe(0);
    expect(result.deletedEvents).toBe(0);
  });

  it('returns zero counts when delete errors occur', async () => {
    deliveriesChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    };
    eventsChain = {
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    };

    const result = await cleanupOldDeliveries(30);

    expect(result.deletedDeliveries).toBe(0);
    expect(result.deletedEvents).toBe(0);
  });
});
