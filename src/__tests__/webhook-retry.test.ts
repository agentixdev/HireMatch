/**
 * Tests for webhook delivery with retry logic.
 *
 * Tests the fireWebhooks function from src/lib/webhooks.ts to verify
 * exponential backoff and retry behavior.
 */

// Mock supabase-server before imports
jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(),
}));

jest.mock('@/lib/crypto', () => ({
  decryptSecret: jest.fn((s: string) => s.replace('plain:', '')),
}));

import { fireWebhooks } from '@/lib/webhooks';
import { createServiceClient } from '@/lib/supabase-server';

const mockFrom = jest.fn();
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockContains = jest.fn();

function setupChain(data: unknown) {
  mockContains.mockReturnValue(Promise.resolve({ data, error: null }));
  mockEq.mockReturnValue({ contains: mockContains, eq: mockEq });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'webhook_deliveries') {
      return { insert: mockInsert };
    }
    return { select: mockSelect };
  });

  (createServiceClient as jest.Mock).mockResolvedValue({
    from: mockFrom,
  });
}

// Retry delays (1s + 2s + 4s) mean some tests need longer timeouts
jest.setTimeout(15000);

describe('fireWebhooks', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('does nothing when no configs exist', async () => {
    setupChain(null);
    await fireWebhooks('rec-1', 'application.created', { id: '1' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('does nothing when configs is empty', async () => {
    setupChain([]);
    await fireWebhooks('rec-1', 'application.created', { id: '1' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('delivers successfully on first attempt', async () => {
    setupChain([
      { id: 'cfg-1', url: 'https://example.com/hook', secret: 'plain:test-secret', events: ['application.created'] },
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    await fireWebhooks('rec-1', 'application.created', { applicationId: 'app-1' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_config_id: 'cfg-1',
        event: 'application.created',
        response_status: 200,
      })
    );
  });

  it('retries on failure and eventually succeeds', async () => {
    setupChain([
      { id: 'cfg-2', url: 'https://example.com/hook', secret: 'plain:secret', events: ['application.created'] },
    ]);

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server Error'),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });
    });

    await fireWebhooks('rec-1', 'application.created', { applicationId: 'app-2' });

    // Should have retried: first attempt + 2 retries = 3 total
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        response_status: 200,
      })
    );
  });

  it('logs failure after exhausting retries', async () => {
    setupChain([
      { id: 'cfg-3', url: 'https://example.com/hook', secret: 'plain:secret', events: ['application.created'] },
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    });

    await fireWebhooks('rec-1', 'application.created', { applicationId: 'app-3' });

    // First attempt + 3 retries = 4 total calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        response_status: 503,
        response_body: expect.stringContaining('FAILED after 3 retries'),
      })
    );
  });

  it('includes HMAC signature in request headers', async () => {
    setupChain([
      { id: 'cfg-4', url: 'https://example.com/hook', secret: 'plain:hmac-secret', events: ['application.created'] },
    ]);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    });

    await fireWebhooks('rec-1', 'application.created', { id: '1' });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchCall[1].headers;
    expect(headers['X-HireMatch-Signature']).toBeDefined();
    expect(headers['X-HireMatch-Timestamp']).toBeDefined();
    expect(headers['X-HireMatch-Event']).toBe('application.created');
  });
});
