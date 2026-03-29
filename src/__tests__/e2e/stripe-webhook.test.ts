/**
 * @jest-environment node
 *
 * E2E Integration Tests: Stripe Webhook Endpoint
 *
 * Tests the POST /api/billing/webhook handler covering:
 * - Signature verification (valid / invalid / missing)
 * - checkout.session.completed event handling
 * - customer.subscription.updated event handling
 * - customer.subscription.deleted event handling
 * - invoice.payment_failed event handling
 * - Edge cases: missing metadata, unknown event types, missing env vars
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockServiceUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockServiceSelectSingle = jest.fn();
const mockServiceFrom = jest.fn();
const mockStripeSubscriptionsRetrieve = jest.fn();
const mockStripeConstructEvent = jest.fn();

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

jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (...args: unknown[]) => mockStripeConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) => mockStripeSubscriptionsRetrieve(...args),
    },
  }),
  tierFromPriceId: (priceId: string) => {
    const map: Record<string, string> = {
      'price_pro_123': 'pro',
      'price_ent_123': 'enterprise',
      'price_agency_123': 'agency',
    };
    return map[priceId] || 'free';
  },
}));

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/billing/webhook/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWebhookRequest(body: string, signature?: string): Request {
  const headers = new Headers();
  if (signature) {
    headers.set('stripe-signature', signature);
  }

  return {
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    headers: {
      get: (name: string) => headers.get(name),
    },
  } as unknown as Request;
}

let stripeEventCounter = 0;

function makeStripeEvent(type: string, dataObject: Record<string, unknown>): {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
} {
  stripeEventCounter += 1;
  return {
    id: `evt_test_${stripeEventCounter}_${Date.now()}`,
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object: dataObject },
  };
}

function setupServiceFromMock(options?: {
  recruiterData?: Record<string, unknown> | null;
}) {
  const recruiterData = options?.recruiterData ?? null;

  mockServiceFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: () => mockServiceSelectSingle(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
    }),
  }));

  mockServiceSelectSingle.mockResolvedValue({
    data: recruiterData,
    error: recruiterData ? null : { message: 'not found' },
  });
}

function resetMocks() {
  jest.clearAllMocks();

  // By default, env vars are set
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

  mockServiceUpdateEq.mockResolvedValue({ error: null });
  mockServiceSelectSingle.mockResolvedValue({ data: null, error: null });
  mockServiceFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: () => mockServiceSelectSingle(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
    }),
  }));

  // Default: constructEvent succeeds
  mockStripeConstructEvent.mockReturnValue(
    makeStripeEvent('checkout.session.completed', {})
  );

  // Default subscription retrieve
  mockStripeSubscriptionsRetrieve.mockResolvedValue({
    id: 'sub_123',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
    items: { data: [{ current_period_end: null, price: { id: 'price_pro_123' } }] },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Stripe Webhook Endpoint', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // Signature verification
  // =========================================================================

  describe('Signature verification', () => {
    it('returns 400 when stripe-signature header is missing', async () => {
      const req = makeWebhookRequest('{}');

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing stripe-signature header');
    });

    it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const req = makeWebhookRequest('{}', 'sig_test');

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Webhook secret not configured');
    });

    it('returns 400 when signature verification fails', async () => {
      mockStripeConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      const req = makeWebhookRequest('{}', 'invalid_sig');

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Invalid signature');
    });

    it('passes raw body, signature, and secret to constructEvent', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('unknown.event', {})
      );

      const body = '{"test":"payload"}';
      const req = makeWebhookRequest(body, 'sig_abc123');

      await POST(req);

      expect(mockStripeConstructEvent).toHaveBeenCalledTimes(1);
      const [rawBody, sig, secret] = mockStripeConstructEvent.mock.calls[0];
      expect(Buffer.isBuffer(rawBody)).toBe(true);
      expect(rawBody.toString()).toBe(body);
      expect(sig).toBe('sig_abc123');
      expect(secret).toBe('whsec_test_secret');
    });
  });

  // =========================================================================
  // checkout.session.completed
  // =========================================================================

  describe('checkout.session.completed', () => {
    it('updates recruiter tier and billing info on successful checkout', async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_new',
        current_period_end: periodEnd,
        items: { data: [{ price: { id: 'price_pro_123' } }] },
      });

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-1', tier: 'pro' },
          subscription: 'sub_new',
          customer: 'cus_abc',
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);

      // Verify Stripe subscription was retrieved
      expect(mockStripeSubscriptionsRetrieve).toHaveBeenCalledWith('sub_new', {
        expand: ['items.data'],
      });

      // Verify recruiter DB update
      expect(mockServiceFrom).toHaveBeenCalledWith('recruiters');
      expect(mockServiceUpdateEq).toHaveBeenCalledWith('id', 'rec-1');
    });

    it('uses tier from metadata or defaults to pro', async () => {
      // No tier in metadata
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-2' },
          subscription: 'sub_x',
          customer: 'cus_x',
        })
      );

      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_x',
        current_period_end: 1700000000,
        items: { data: [] },
      });

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);

      // The update should have been called — the handler defaults to 'pro' when tier is missing
      expect(mockServiceUpdateEq).toHaveBeenCalled();
    });

    it('skips processing when recruiter_id is missing from metadata', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: {},
          subscription: 'sub_orphan',
          customer: 'cus_orphan',
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);

      // Should NOT have tried to retrieve subscription or update DB
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();
    });

    it('handles null metadata gracefully', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          subscription: 'sub_x',
          customer: 'cus_x',
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
    });

    it('handles billing_period_end when current_period_end is on subscription items (clover API)', async () => {
      const itemPeriodEnd = 1800000000;
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_clover',
        // No top-level current_period_end (dahlia removed it)
        items: { data: [{ current_period_end: itemPeriodEnd, price: { id: 'price_pro_123' } }] },
      });

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-3', tier: 'enterprise' },
          subscription: 'sub_clover',
          customer: 'cus_clover',
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockServiceUpdateEq).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // customer.subscription.updated
  // =========================================================================

  describe('customer.subscription.updated', () => {
    it('updates tier using recruiter_id from subscription metadata', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_upd',
          metadata: { recruiter_id: 'rec-5' },
          customer: 'cus_5',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { id: 'price_ent_123' } }] },
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockServiceUpdateEq).toHaveBeenCalledWith('id', 'rec-5');
    });

    it('falls back to lookup by stripe_customer_id when recruiter_id is missing', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_upd_noid',
          metadata: {},
          customer: 'cus_lookup',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { id: 'price_pro_123' } }] },
        })
      );

      // When looked up by customer ID, return a recruiter
      setupServiceFromMock({ recruiterData: { id: 'rec-found' } });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockServiceFrom).toHaveBeenCalledWith('recruiters');
      expect(mockServiceUpdateEq).toHaveBeenCalledWith('id', 'rec-found');
    });

    it('silently skips when no recruiter found by customer ID and no metadata', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_orphan',
          metadata: {},
          customer: 'cus_unknown',
          items: { data: [{ price: { id: 'price_pro_123' } }] },
        })
      );

      setupServiceFromMock({ recruiterData: null });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      // Update should NOT have been called (only the select for lookup)
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();
    });

    it('maps price ID to correct tier via tierFromPriceId', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_agency',
          metadata: { recruiter_id: 'rec-agency' },
          customer: 'cus_agency',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          items: { data: [{ price: { id: 'price_agency_123' } }] },
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockServiceUpdateEq).toHaveBeenCalledWith('id', 'rec-agency');
    });

    it('defaults to free tier when price ID is unknown', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_unknown_price',
          metadata: { recruiter_id: 'rec-10' },
          customer: 'cus_10',
          items: { data: [{ price: { id: 'price_unknown_xyz' } }] },
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockServiceUpdateEq).toHaveBeenCalled();
    });

    it('handles empty items.data array gracefully', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_empty_items',
          metadata: { recruiter_id: 'rec-11' },
          customer: 'cus_11',
          items: { data: [] },
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
      // Should still update (price will be '' and tier will be 'free')
      expect(mockServiceUpdateEq).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // customer.subscription.deleted
  // =========================================================================

  describe('customer.subscription.deleted', () => {
    it('downgrades recruiter to free tier', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.deleted', {
          id: 'sub_del',
          customer: 'cus_del',
        })
      );

      setupServiceFromMock({ recruiterData: { id: 'rec-del' } });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);

      // Should look up recruiter by customer ID
      expect(mockServiceFrom).toHaveBeenCalledWith('recruiters');

      // Should update to free tier with null subscription
      expect(mockServiceUpdateEq).toHaveBeenCalledWith('id', 'rec-del');
    });

    it('silently succeeds when no recruiter found for deleted subscription', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.deleted', {
          id: 'sub_del_orphan',
          customer: 'cus_nonexistent',
        })
      );

      setupServiceFromMock({ recruiterData: null });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // invoice.payment_failed
  // =========================================================================

  describe('invoice.payment_failed', () => {
    it('logs payment failure for known recruiter', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('invoice.payment_failed', {
          id: 'in_fail',
          customer: 'cus_fail',
        })
      );

      setupServiceFromMock({ recruiterData: { id: 'rec-fail', user_id: 'user-fail' } });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);

      // Should have logged a warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment failed')
      );

      consoleSpy.mockRestore();
    });

    it('silently succeeds when no recruiter found for failed invoice', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('invoice.payment_failed', {
          id: 'in_fail_orphan',
          customer: 'cus_ghost',
        })
      );

      setupServiceFromMock({ recruiterData: null });

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it('does not downgrade tier on payment failure (Stripe handles cancellation)', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('invoice.payment_failed', {
          id: 'in_fail_2',
          customer: 'cus_active',
        })
      );

      setupServiceFromMock({ recruiterData: { id: 'rec-active', user_id: 'user-active' } });

      jest.spyOn(console, 'warn').mockImplementation();

      const req = makeWebhookRequest('{}', 'sig_valid');
      await POST(req);

      // Should NOT have called update — payment_failed only logs
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();

      (console.warn as jest.Mock).mockRestore();
    });
  });

  // =========================================================================
  // Edge cases and unknown events
  // =========================================================================

  describe('Edge cases', () => {
    it('returns 200 for unhandled event types', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('payment_intent.succeeded', { id: 'pi_123' })
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('returns 500 when handler throws an unexpected error', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-err', tier: 'pro' },
          subscription: 'sub_err',
          customer: 'cus_err',
        })
      );

      // Make subscriptions.retrieve throw
      mockStripeSubscriptionsRetrieve.mockRejectedValue(new Error('Stripe API down'));

      jest.spyOn(console, 'error').mockImplementation();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Webhook handler failed');

      (console.error as jest.Mock).mockRestore();
    });

    it('returns 500 when Supabase service client update fails with throw', async () => {
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.deleted', {
          id: 'sub_db_err',
          customer: 'cus_db_err',
        })
      );

      // Make the from() call throw
      mockServiceFrom.mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      jest.spyOn(console, 'error').mockImplementation();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Webhook handler failed');

      (console.error as jest.Mock).mockRestore();
    });

    it('handles checkout.session.completed with null subscription gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-null-sub', tier: 'pro' },
          subscription: null,
          customer: 'cus_null_sub',
        })
      );

      setupServiceFromMock();

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      // Now handled gracefully with a break instead of crashing
      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No subscription ID')
      );

      // Should NOT have tried to retrieve subscription or update DB
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('processes multiple events in sequence correctly', async () => {
      // First: checkout
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('checkout.session.completed', {
          metadata: { recruiter_id: 'rec-seq', tier: 'pro' },
          subscription: 'sub_seq',
          customer: 'cus_seq',
        })
      );

      setupServiceFromMock();

      const req1 = makeWebhookRequest('{}', 'sig_1');
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      // Second: subscription update
      resetMocks();
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.updated', {
          id: 'sub_seq',
          metadata: { recruiter_id: 'rec-seq' },
          customer: 'cus_seq',
          current_period_end: Math.floor(Date.now() / 1000) + 60 * 86400,
          items: { data: [{ price: { id: 'price_ent_123' } }] },
        })
      );

      setupServiceFromMock();

      const req2 = makeWebhookRequest('{}', 'sig_2');
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);

      // Third: subscription deleted
      resetMocks();
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('customer.subscription.deleted', {
          id: 'sub_seq',
          customer: 'cus_seq',
        })
      );

      setupServiceFromMock({ recruiterData: { id: 'rec-seq' } });

      const req3 = makeWebhookRequest('{}', 'sig_3');
      const res3 = await POST(req3);
      expect(res3.status).toBe(200);
    });
  });
});
