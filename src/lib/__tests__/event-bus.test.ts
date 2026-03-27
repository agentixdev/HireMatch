/**
 * @jest-environment node
 */
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that use them
// ---------------------------------------------------------------------------

// Track all supabase calls
const mockInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({ data: { id: 'evt-001' }, error: null }),
  }),
});
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});
const mockDeleteChain = {
  lt: jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({ data: [{ id: 'd1' }, { id: 'd2' }], error: null }),
  }),
};
const mockSelect = jest.fn().mockReturnValue({
  eq: jest.fn().mockImplementation(function (this: any) {
    return {
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
  }),
});

const mockFrom = jest.fn().mockImplementation((table: string) => {
  return {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    delete: jest.fn().mockReturnValue(mockDeleteChain),
  };
});

const mockSupabaseClient = { from: mockFrom };

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------
import { publishEvent, EVENT_BUS_TYPES, type EventBusType } from '@/lib/event-bus';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset all mocks and set up default happy-path supabase responses */
function resetMocks() {
  jest.clearAllMocks();

  // Default: event insert succeeds
  mockInsert.mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: { id: 'evt-001' }, error: null }),
    }),
  });

  // Default: no webhook configs (no endpoints)
  mockSelect.mockReturnValue({
    eq: jest.fn().mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  });

  // Default: update succeeds
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  // Default: fetch returns 200
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

describe('Event Bus — publishEvent', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('creates an event record in webhook_events table', async () => {
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

  it('returns deliveryCount 0 when no webhook endpoints are subscribed', async () => {
    const result = await publishEvent('org-1', 'job.indexed', { jobId: 'j1' });

    expect(result.deliveryCount).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('delivers to subscribed endpoints and counts successful deliveries', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://example.com/webhook', secret: 'sec123', events: ['candidate.indexed', 'candidate.created'] },
    ]);

    const result = await publishEvent('org-1', 'candidate.indexed', { candidateId: 'c1' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
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

  it('generates a correlation ID when none is provided', async () => {
    await publishEvent('org-1', 'job.expired', { jobId: 'j1' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.correlation_id).toBeDefined();
    // Should be a UUID-like string
    expect(typeof insertCall.correlation_id).toBe('string');
    expect(insertCall.correlation_id.length).toBeGreaterThan(0);
  });

  it('uses the provided correlation ID when given', async () => {
    await publishEvent('org-1', 'job.expired', { jobId: 'j1' }, { correlationId: 'my-corr-id' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.correlation_id).toBe('my-corr-id');
  });

  it('records delivery failure but does not throw', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://example.com/webhook', secret: 'sec', events: ['scrape.failed'] },
    ]);

    mockFetch.mockResolvedValue({
      status: 500,
      ok: false,
      text: jest.fn().mockResolvedValue('Internal Server Error'),
    });

    const result = await publishEvent('org-1', 'scrape.failed', { reason: 'timeout' });

    // Should not throw and deliveryCount should be 0 (failed)
    expect(result.deliveryCount).toBe(0);
    expect(result.eventId).toBeDefined();
  });

  it('handles event insert failure gracefully and still returns an eventId', async () => {
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    });

    const result = await publishEvent('org-1', 'match.completed', { matchId: 'm1' });

    // Should still return a generated UUID as eventId
    expect(result.eventId).toBeDefined();
    expect(typeof result.eventId).toBe('string');
  });

  it('handles webhook config query failure and returns deliveryCount 0', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockImplementation(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'Config query failed' } }),
      })),
    });

    const result = await publishEvent('org-1', 'application.created', { appId: 'a1' });

    expect(result.deliveryCount).toBe(0);
  });

  it('sets triggeredBy from options or defaults to "system"', async () => {
    await publishEvent('org-1', 'visa_rule.created', { ruleId: 'r1' }, { triggeredBy: 'admin-user' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.triggered_by).toBe('admin-user');
  });

  it('defaults triggeredBy to "system" when not specified', async () => {
    await publishEvent('org-1', 'visa_rule.updated', { ruleId: 'r1' });

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.triggered_by).toBe('system');
  });

  it('handles fetch throwing a network error without propagating', async () => {
    setupWebhookConfigs([
      { id: 'wh-1', url: 'https://unreachable.example.com/hook', secret: 'sec', events: ['billing.limit_reached'] },
    ]);

    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await publishEvent('org-1', 'billing.limit_reached', { resource: 'jobs' });

    // Should not throw
    expect(result.eventId).toBeDefined();
    expect(result.deliveryCount).toBe(0);
  });
});

describe('EVENT_BUS_TYPES', () => {
  it('contains exactly 12 event types', () => {
    expect(EVENT_BUS_TYPES).toHaveLength(12);
  });

  it('includes all expected event type strings', () => {
    const expected = [
      'visa_rule.created',
      'visa_rule.updated',
      'visa_rule.superseded',
      'candidate.indexed',
      'job.indexed',
      'job.expired',
      'match.completed',
      'scrape.failed',
      'billing.limit_reached',
      'billing.limit_warning',
      'application.created',
      'application.status_changed',
    ];
    for (const type of expected) {
      expect(EVENT_BUS_TYPES).toContain(type);
    }
  });

  it('all event types are unique', () => {
    expect(new Set(EVENT_BUS_TYPES).size).toBe(EVENT_BUS_TYPES.length);
  });
});
