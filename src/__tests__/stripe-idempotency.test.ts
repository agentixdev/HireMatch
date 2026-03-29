/**
 * @jest-environment node
 *
 * Tests: Stripe Webhook Idempotency & Event Age Validation
 *
 * Tests the idempotency and staleness checks in POST /api/billing/webhook:
 * - Duplicate event IDs are rejected (returns { duplicate: true })
 * - Old events (>5 min) are rejected with 400
 * - Cleanup of processed events map
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
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
      price_pro_123: 'pro',
      price_ent_123: 'enterprise',
      price_agency_123: 'agency',
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

let eventCounter = 0;

function makeStripeEvent(
  type: string,
  dataObject: Record<string, unknown>,
  overrides?: { id?: string; created?: number }
) {
  eventCounter += 1;
  return {
    id: overrides?.id ?? `evt_idem_${eventCounter}_${Date.now()}`,
    type,
    created: overrides?.created ?? Math.floor(Date.now() / 1000),
    data: { object: dataObject },
  };
}

function setupServiceFromMock() {
  mockServiceFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: () =>
          mockServiceSelectSingle(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: (...args: unknown[]) => mockServiceUpdateEq(...args),
    }),
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Stripe Webhook Idempotency', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

    mockServiceUpdateEq.mockResolvedValue({ error: null });
    mockServiceSelectSingle.mockResolvedValue({ data: null, error: null });
    setupServiceFromMock();

    mockStripeSubscriptionsRetrieve.mockResolvedValue({
      id: 'sub_123',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      items: { data: [{ current_period_end: null, price: { id: 'price_pro_123' } }] },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // =========================================================================
  // Duplicate event IDs are rejected
  // =========================================================================

  describe('Duplicate event rejection', () => {
    it('processes the first event normally and returns received: true', async () => {
      const eventId = `evt_unique_first_${Date.now()}`;
      const event = makeStripeEvent(
        'payment_intent.succeeded',
        { id: 'pi_123' },
        { id: eventId }
      );

      mockStripeConstructEvent.mockReturnValue(event);

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
      expect(json.duplicate).toBeUndefined();
    });

    it('rejects duplicate event ID with duplicate: true', async () => {
      const eventId = `evt_dup_${Date.now()}`;

      // First call — should succeed
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('payment_intent.succeeded', { id: 'pi_1' }, { id: eventId })
      );

      const req1 = makeWebhookRequest('{}', 'sig_1');
      const res1 = await POST(req1);
      const json1 = await res1.json();
      expect(res1.status).toBe(200);
      expect(json1.received).toBe(true);
      expect(json1.duplicate).toBeUndefined();

      // Second call with same event ID — should be rejected as duplicate
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('payment_intent.succeeded', { id: 'pi_1' }, { id: eventId })
      );

      const req2 = makeWebhookRequest('{}', 'sig_2');
      const res2 = await POST(req2);
      const json2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(json2.received).toBe(true);
      expect(json2.duplicate).toBe(true);
    });

    it('does not process handler logic for duplicate events', async () => {
      const eventId = `evt_no_process_${Date.now()}`;

      // First call — checkout.session.completed
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'checkout.session.completed',
          {
            metadata: { recruiter_id: 'rec-idem', tier: 'pro' },
            subscription: 'sub_idem',
            customer: 'cus_idem',
          },
          { id: eventId }
        )
      );

      const req1 = makeWebhookRequest('{}', 'sig_1');
      await POST(req1);

      // Reset mocks to track second call
      jest.clearAllMocks();
      setupServiceFromMock();
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

      // Second call — same event ID
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'checkout.session.completed',
          {
            metadata: { recruiter_id: 'rec-idem', tier: 'pro' },
            subscription: 'sub_idem',
            customer: 'cus_idem',
          },
          { id: eventId }
        )
      );

      const req2 = makeWebhookRequest('{}', 'sig_2');
      const res2 = await POST(req2);
      const json2 = await res2.json();

      expect(json2.duplicate).toBe(true);

      // Service client should not have been called for business logic
      // (createServiceClient may or may not be called, but no DB writes)
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();
    });

    it('allows different event IDs to be processed independently', async () => {
      const event1 = makeStripeEvent(
        'payment_intent.succeeded',
        { id: 'pi_a' },
        { id: `evt_diff_a_${Date.now()}` }
      );
      const event2 = makeStripeEvent(
        'payment_intent.succeeded',
        { id: 'pi_b' },
        { id: `evt_diff_b_${Date.now()}` }
      );

      mockStripeConstructEvent.mockReturnValue(event1);
      const req1 = makeWebhookRequest('{}', 'sig_1');
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);
      expect((await res1.json()).duplicate).toBeUndefined();

      mockStripeConstructEvent.mockReturnValue(event2);
      const req2 = makeWebhookRequest('{}', 'sig_2');
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
      expect((await res2.json()).duplicate).toBeUndefined();
    });
  });

  // =========================================================================
  // Old events (>5 min) are rejected
  // =========================================================================

  describe('Stale event rejection', () => {
    it('rejects events older than 5 minutes with 400', async () => {
      const sixMinutesAgo = Math.floor(Date.now() / 1000) - 6 * 60;

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'payment_intent.succeeded',
          { id: 'pi_old' },
          { id: `evt_old_${Date.now()}`, created: sixMinutesAgo }
        )
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Event too old');
    });

    it('rejects events exactly at the 5-minute boundary', async () => {
      // Event created exactly 5 minutes and 1 second ago
      const fiveMinOneSecAgo = Math.floor(Date.now() / 1000) - 5 * 60 - 1;

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'payment_intent.succeeded',
          { id: 'pi_boundary' },
          { id: `evt_boundary_${Date.now()}`, created: fiveMinOneSecAgo }
        )
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Event too old');
    });

    it('accepts events within the 5-minute window', async () => {
      const twoMinutesAgo = Math.floor(Date.now() / 1000) - 2 * 60;

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'payment_intent.succeeded',
          { id: 'pi_recent' },
          { id: `evt_recent_${Date.now()}`, created: twoMinutesAgo }
        )
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.received).toBe(true);
    });

    it('accepts events created just now', async () => {
      const now = Math.floor(Date.now() / 1000);

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'payment_intent.succeeded',
          { id: 'pi_now' },
          { id: `evt_now_${Date.now()}`, created: now }
        )
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it('rejects very old events (hours ago)', async () => {
      const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;

      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent(
          'checkout.session.completed',
          { metadata: { recruiter_id: 'rec-old' }, subscription: 'sub_old', customer: 'cus_old' },
          { id: `evt_very_old_${Date.now()}`, created: twoHoursAgo }
        )
      );

      const req = makeWebhookRequest('{}', 'sig_valid');
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Event too old');

      // Should not have processed any business logic
      expect(mockStripeSubscriptionsRetrieve).not.toHaveBeenCalled();
      expect(mockServiceUpdateEq).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Combined: idempotency + staleness ordering
  // =========================================================================

  describe('Idempotency and staleness interaction', () => {
    it('idempotency check runs before age check (duplicate of a recent event)', async () => {
      const eventId = `evt_combo_${Date.now()}`;
      const now = Math.floor(Date.now() / 1000);

      // First call succeeds
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('payment_intent.succeeded', { id: 'pi_c' }, { id: eventId, created: now })
      );
      const req1 = makeWebhookRequest('{}', 'sig_1');
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      // Second call with same ID — should be caught by idempotency, not age check
      mockStripeConstructEvent.mockReturnValue(
        makeStripeEvent('payment_intent.succeeded', { id: 'pi_c' }, { id: eventId, created: now })
      );
      const req2 = makeWebhookRequest('{}', 'sig_2');
      const res2 = await POST(req2);
      const json2 = await res2.json();

      // Should return 200 with duplicate flag, not 400 for age
      expect(res2.status).toBe(200);
      expect(json2.duplicate).toBe(true);
    });
  });
});
