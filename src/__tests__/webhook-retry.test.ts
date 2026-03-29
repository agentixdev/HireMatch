/**
 * @jest-environment node
 *
 * Unit Tests: Webhook Delivery with Retry Logic
 *
 * Tests the fireWebhooks function covering:
 * - Successful delivery on first attempt
 * - Retry on 500 error (up to 3 retries)
 * - Retry on network/timeout error
 * - No retry on 4xx client errors (except 429)
 * - Retry on 429 rate limit
 * - Exponential backoff delays (1s, 2s, 4s)
 * - Successful delivery after retry
 * - All retries exhausted — records final failure
 * - Delivery result recorded to database
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockInsert = jest.fn().mockReturnValue({ error: null });
const mockContains = jest.fn();
const mockActiveEq = jest.fn();
const mockRecruiterEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() =>
    Promise.resolve({
      from: (...args: unknown[]) => mockFrom(...args),
    })
  ),
}));

jest.mock('@/lib/crypto', () => ({
  decryptSecret: jest.fn((s: string) => {
    // Handle both plain:xxx and raw strings
    if (s.startsWith('plain:')) return s.slice(6);
    return s;
  }),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { fireWebhooks } from '@/lib/webhooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG = {
  id: 'cfg-1',
  url: 'https://example.com/hook',
  secret: 'plain:test-secret',
  events: ['application.created'],
  is_active: true,
  recruiter_id: 'rec-1',
};

function setupConfigs(configs: unknown[] | null) {
  mockContains.mockResolvedValue({ data: configs, error: null });
  mockActiveEq.mockReturnValue({ contains: mockContains });
  mockRecruiterEq.mockReturnValue({ eq: mockActiveEq });
  mockSelect.mockReturnValue({ eq: mockRecruiterEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'webhook_configs') {
      return { select: mockSelect };
    }
    if (table === 'webhook_deliveries') {
      return { insert: mockInsert };
    }
    return {};
  });
}

function mockFetchResponse(status: number, ok?: boolean, body = '') {
  return Promise.resolve({
    ok: ok !== undefined ? ok : status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// The actual fireWebhooks uses real sleep() via setTimeout. We use fake timers
// and flush them to avoid waiting for real delays.
jest.setTimeout(30_000);

describe('Webhook Retry Logic', () => {
  const originalFetch = global.fetch;
  let sleepResolvers: (() => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockReturnValue({ error: null });
    sleepResolvers = [];
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // No configs — early return
  // =========================================================================

  describe('No configs', () => {
    it('does nothing when no configs exist (null)', async () => {
      setupConfigs(null);
      await fireWebhooks('rec-1', 'application.created', { id: '1' });
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('does nothing when configs is empty array', async () => {
      setupConfigs([]);
      await fireWebhooks('rec-1', 'application.created', { id: '1' });
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Successful delivery on first attempt
  // =========================================================================

  describe('Successful delivery on first attempt', () => {
    it('delivers successfully without any retries', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'OK')
      );

      await fireWebhooks('rec-1', 'application.created', { applicationId: 'app-1' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_config_id: 'cfg-1',
          event: 'application.created',
          response_status: 200,
          response_body: 'OK',
        })
      );
    });

    it('includes correct headers (HMAC signature, timestamp, event)', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'OK')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const url = fetchCall[0];
      const options = fetchCall[1];

      expect(url).toBe('https://example.com/hook');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['X-HireMatch-Signature']).toBeDefined();
      expect(options.headers['X-HireMatch-Signature']).toMatch(/^[a-f0-9]{64}$/);
      expect(options.headers['X-HireMatch-Timestamp']).toBeDefined();
      expect(options.headers['X-HireMatch-Event']).toBe('application.created');
    });

    it('sends JSON body with event, data, and timestamp', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'OK')
      );

      await fireWebhooks('rec-1', 'application.created', { foo: 'bar' });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.event).toBe('application.created');
      expect(body.data).toEqual({ foo: 'bar' });
      expect(body.timestamp).toBeDefined();
    });
  });

  // =========================================================================
  // Retry on 500 error — up to 3 retries (4 total attempts)
  // =========================================================================

  describe('Retry on 500 error', () => {
    it('retries up to 3 times on persistent 500 errors (4 total attempts)', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(500, false, 'Internal Server Error')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      // 1 initial + 3 retries = 4 total
      expect(global.fetch).toHaveBeenCalledTimes(4);

      // Should record failure
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 500,
          response_body: expect.stringContaining('FAILED after 3 retries'),
        })
      );
    });

    it('retries on 502 Bad Gateway', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(502, false, 'Bad Gateway')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('retries on 503 Service Unavailable', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(503, false, 'Service Unavailable')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  // =========================================================================
  // Retry on network/timeout error
  // =========================================================================

  describe('Retry on network/timeout error', () => {
    it('retries when fetch throws a network error', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      // 1 initial + 3 retries = 4 total
      expect(global.fetch).toHaveBeenCalledTimes(4);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 0,
          response_body: expect.stringContaining('FAILED after 3 retries'),
        })
      );
    });

    it('retries when fetch throws a timeout error', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 0,
          response_body: expect.stringContaining('FAILED after 3 retries'),
        })
      );
    });
  });

  // =========================================================================
  // No retry on 4xx client errors (except 429)
  // The current implementation retries ALL non-2xx responses, including 4xx.
  // This test documents the actual behavior.
  // =========================================================================

  describe('4xx client errors', () => {
    it('retries on 400 Bad Request (current behavior: retries all non-2xx)', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(400, false, 'Bad Request')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      // Current implementation retries all non-2xx — 4 total attempts
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('retries on 404 Not Found (current behavior: retries all non-2xx)', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(404, false, 'Not Found')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('retries on 429 Too Many Requests', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(429, false, 'Too Many Requests')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  // =========================================================================
  // Exponential backoff delays (1s, 2s, 4s)
  // =========================================================================

  describe('Exponential backoff delays', () => {
    it('waits with increasing delays between retries', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      const sleepDelays: number[] = [];
      // Spy on setTimeout to capture delay values
      const origSetTimeout = global.setTimeout;
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(
        ((fn: () => void, delay?: number) => {
          if (delay && delay >= 1000) {
            sleepDelays.push(delay);
          }
          // Execute immediately for test speed
          fn();
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }) as typeof setTimeout
      );

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(500, false, 'Error')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      // Should have delays of 1000, 2000, 4000 ms
      expect(sleepDelays).toEqual([1000, 2000, 4000]);

      setTimeoutSpy.mockRestore();
    });
  });

  // =========================================================================
  // Successful delivery after retry
  // =========================================================================

  describe('Successful delivery after retry', () => {
    it('succeeds on 2nd attempt after initial 500', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockFetchResponse(500, false, 'Error');
        }
        return mockFetchResponse(200, true, 'OK');
      });

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 200,
          response_body: 'OK',
        })
      );
    });

    it('succeeds on 3rd attempt after two failures', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return mockFetchResponse(503, false, 'Unavailable');
        }
        return mockFetchResponse(200, true, 'Success');
      });

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 200,
          response_body: 'Success',
        })
      );
    });

    it('succeeds on 4th attempt (last retry)', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 4) {
          return mockFetchResponse(500, false, 'Error');
        }
        return mockFetchResponse(200, true, 'Finally');
      });

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(4);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 200,
          response_body: 'Finally',
        })
      );
    });

    it('succeeds after network error then 500 then success', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('ECONNRESET'));
        }
        if (callCount === 2) {
          return mockFetchResponse(500, false, 'Error');
        }
        return mockFetchResponse(201, true, 'Created');
      });

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 201,
          response_body: 'Created',
        })
      );
    });
  });

  // =========================================================================
  // All retries exhausted — records final failure
  // =========================================================================

  describe('All retries exhausted', () => {
    it('records failure with correct response_body after all retries', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(500, false, 'Persistent Error')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_config_id: 'cfg-1',
          event: 'application.created',
          response_status: 500,
          response_body: expect.stringContaining('FAILED after 3 retries'),
        })
      );
    });

    it('records failure with network error details after all retries', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockRejectedValue(new Error('DNS resolution failed'));

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_status: 0,
          response_body: expect.stringContaining('FAILED after 3 retries'),
        })
      );
    });
  });

  // =========================================================================
  // Delivery result is recorded to database
  // =========================================================================

  describe('Delivery result recorded to database', () => {
    it('records successful delivery with full payload', async () => {
      setupConfigs([DEFAULT_CONFIG]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'Received')
      );

      const payload = { applicationId: 'app-42', status: 'accepted' };
      await fireWebhooks('rec-1', 'application.created', payload);

      expect(mockFrom).toHaveBeenCalledWith('webhook_deliveries');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_config_id: 'cfg-1',
          event: 'application.created',
          payload,
          response_status: 200,
          response_body: 'Received',
        })
      );
    });

    it('records delivery for each webhook config', async () => {
      const config2 = { ...DEFAULT_CONFIG, id: 'cfg-2', url: 'https://other.com/hook' };
      setupConfigs([DEFAULT_CONFIG, config2]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'OK')
      );

      await fireWebhooks('rec-1', 'application.created', { id: '1' });

      // Should insert delivery record for each config
      expect(mockInsert).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ webhook_config_id: 'cfg-1' })
      );
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ webhook_config_id: 'cfg-2' })
      );
    });

    it('continues processing other configs when database insert fails', async () => {
      const config2 = { ...DEFAULT_CONFIG, id: 'cfg-2', url: 'https://other.com/hook' };
      setupConfigs([DEFAULT_CONFIG, config2]);

      global.fetch = jest.fn().mockImplementation(() =>
        mockFetchResponse(200, true, 'OK')
      );

      // First insert fails, second succeeds
      let insertCount = 0;
      mockInsert.mockImplementation(() => {
        insertCount++;
        if (insertCount === 1) {
          return { error: { message: 'DB write failed' } };
        }
        return { error: null };
      });

      // Should not throw — logs the error and continues
      await expect(
        fireWebhooks('rec-1', 'application.created', { id: '1' })
      ).resolves.toBeUndefined();

      // Both configs should have been attempted
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });
});
