/**
 * @jest-environment node
 *
 * E2E Integration Tests: Webhook Lifecycle
 *
 * Tests webhook CRUD, event delivery via the event bus, delivery logging,
 * retry behavior, and the webhook cleanup process.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({ data: { id: 'evt-001' }, error: null }),
  }),
});

const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});

const mockSelect = jest.fn().mockReturnValue({
  eq: jest.fn().mockImplementation(() => ({
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
});

const mockDeleteChain = {
  lt: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [], error: null }),
  }),
};

const mockFrom = jest.fn().mockImplementation((table: string) => ({
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
  delete: jest.fn().mockReturnValue(mockDeleteChain),
}));

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

// Mock global fetch for webhook delivery
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { publishEvent, EVENT_BUS_TYPES } from '@/lib/event-bus';
import { cleanupOldDeliveries } from '@/lib/webhook-cleanup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  jest.clearAllMocks();

  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { id: 'evt-001' }, error: null }),
    }),
  });

  mockSelect.mockReturnValue({
    eq: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  });

  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  mockFetch.mockResolvedValue({
    status: 200,
    ok: true,
    text: jest.fn().mockResolvedValue('OK'),
  });
}

function setupWebhookConfigs(configs: Array<{ id: string; url: string; secret: string; events: string[] }>) {
  mockSelect.mockReturnValue({
    eq: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: configs, error: null }),
    })),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Webhook Lifecycle', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('creates a webhook event record when publishEvent is called', async () => {
    const result = await publishEvent('org-1', 'candidate.indexed', { candidateId: 'c1' });

    expect(mockFrom).toHaveBeenCalledWith('webhook_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-1',
        event_type: 'candidate.indexed',
        payload: { candidateId: 'c1' },
      })
    );
    expect(result.eventId).toBe('evt-001');
  });

  it('returns deliveryCount 0 when no webhooks are subscribed', async () => {
    const result = await publishEvent('org-1', 'job.indexed', { jobId: 'j1' });

    expect(result.deliveryCount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('delivers event to subscribed webhook endpoints', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://hooks.example.com/test', secret: 'secret123', events: ['candidate.indexed', 'candidate.created'] },
    ]);

    const result = await publishEvent('org-1', 'candidate.indexed', { candidateId: 'c1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.example.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'User-Agent': 'HireMatch-Webhook/1.0',
        }),
      })
    );
    expect(result.deliveryCount).toBe(1);
  });

  it('delivers to multiple subscribed endpoints concurrently', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://hooks1.example.com', secret: 'sec1', events: ['match.completed', 'match.found'] },
      { id: 'wh-2', url: 'https://hooks2.example.com', secret: 'sec2', events: ['match.completed', 'match.found'] },
    ]);

    const result = await publishEvent('org-1', 'match.completed', { matchId: 'm1', score: 85 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.deliveryCount).toBe(2);
  });

  it('records delivery as failed when endpoint returns 500', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://failing.example.com/hook', secret: 'sec', events: ['scrape.failed'] },
    ]);

    // All delivery attempts return 500
    mockFetch.mockResolvedValue({
      status: 500,
      ok: false,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    });

    const result = await publishEvent('org-1', 'scrape.failed', { reason: 'timeout' });

    expect(result.deliveryCount).toBe(0);
    expect(result.eventId).toBeDefined();

    // Verify delivery record was updated to failed
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
      })
    );
  });

  it('handles network errors without throwing', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://unreachable.test/hook', secret: 'sec', events: ['billing.limit_reached', 'usage.limit_exceeded'] },
    ]);

    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await publishEvent('org-1', 'billing.limit_reached', { resource: 'jobs' });

    expect(result.eventId).toBeDefined();
    expect(result.deliveryCount).toBe(0);
    // Should not throw
  });

  it('includes HMAC signature and delivery ID in request headers', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://hooks.example.com', secret: 'test-secret-key', events: ['application.created', 'application.submitted'] },
    ]);

    await publishEvent('org-1', 'application.created', { appId: 'a1' });

    const fetchCall = mockFetch.mock.calls[0];
    const headers = fetchCall[1].headers;

    expect(headers['x-recruitment-signature']).toBeDefined();
    expect(headers['x-recruitment-signature']).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
    expect(headers['x-recruitment-timestamp']).toBeDefined();
    expect(headers['X-Delivery-Id']).toBeDefined();
  });

  it('uses correlation ID from options when provided', async () => {
    await publishEvent('org-1', 'job.expired', { jobId: 'j1' }, { correlationId: 'custom-corr-id' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.correlation_id).toBe('custom-corr-id');
  });

  it('generates a correlation ID automatically when not provided', async () => {
    await publishEvent('org-1', 'job.expired', { jobId: 'j1' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.correlation_id).toBeDefined();
    expect(typeof insertCall.correlation_id).toBe('string');
    expect(insertCall.correlation_id.length).toBeGreaterThan(0);
  });

  it('sets triggeredBy from options or defaults to "system"', async () => {
    await publishEvent('org-1', 'visa_rule.created', { ruleId: 'r1' }, { triggeredBy: 'admin-api' });
    expect(mockInsert.mock.calls[0][0].triggered_by).toBe('admin-api');

    jest.clearAllMocks();
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'evt-002' }, error: null }),
      }),
    });
    mockSelect.mockReturnValue({
      eq: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    });

    await publishEvent('org-1', 'visa_rule.updated', { ruleId: 'r1' });
    expect(mockInsert.mock.calls[0][0].triggered_by).toBe('system');
  });

  // -- Cleanup tests --

  it('cleanupOldDeliveries deletes old delivery and event records', async () => {
    const deliveriesDelete = jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'd1' }, { id: 'd2' }], error: null }),
      }),
    });
    const eventsDelete = jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'webhook_deliveries') return { delete: deliveriesDelete };
      if (table === 'webhook_events') return { delete: eventsDelete };
      return { insert: mockInsert, update: mockUpdate, select: mockSelect, delete: jest.fn().mockReturnValue(mockDeleteChain) };
    });

    const result = await cleanupOldDeliveries(30);

    expect(result.deletedDeliveries).toBe(2);
    expect(result.deletedEvents).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith('webhook_deliveries');
    expect(mockFrom).toHaveBeenCalledWith('webhook_events');
  });

  it('cleanupOldDeliveries returns zero when no old records exist', async () => {
    mockFrom.mockImplementation((table: string) => ({
      delete: jest.fn().mockReturnValue({
        lt: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    }));

    const result = await cleanupOldDeliveries(7);

    expect(result.deletedDeliveries).toBe(0);
    expect(result.deletedEvents).toBe(0);
  });
});
