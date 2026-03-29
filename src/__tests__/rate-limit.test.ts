/**
 * @jest-environment node
 *
 * Unit Tests: Rate Limiter
 *
 * Tests the in-memory sliding-window rate limiter covering:
 * - Requests within the limit succeed
 * - Remaining count decreases with each call
 * - Requests exceeding the limit are rejected
 * - Window expiration allows new requests
 * - Independent keys don't interfere
 * - Edge case: exactly at the limit
 * - Concurrent calls to same key
 */

describe('Rate Limiter', () => {
  let rateLimit: typeof import('@/lib/rate-limit').rateLimit;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset module state so the in-memory Map is fresh for each test
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rateLimit = require('@/lib/rate-limit').rateLimit;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // Basic success — requests within the limit
  // =========================================================================

  describe('Requests within the limit', () => {
    it('returns success for a single request within the limit', () => {
      const result = rateLimit('user-1', 5, 60_000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('returns success for multiple requests within the limit', () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(rateLimit('user-2', 5, 60_000));
      }

      expect(results.every((r) => r.success)).toBe(true);
      expect(results[0].remaining).toBe(4);
      expect(results[1].remaining).toBe(3);
      expect(results[2].remaining).toBe(2);
    });

    it('handles zero maxRequests — always blocks', () => {
      const result = rateLimit('test-zero', 0, 60_000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // =========================================================================
  // Remaining count decreases with each call
  // =========================================================================

  describe('Remaining count', () => {
    it('decreases remaining with each call', () => {
      const maxRequests = 5;
      for (let i = 0; i < maxRequests; i++) {
        const result = rateLimit('counter-key', maxRequests, 60_000);
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(maxRequests - i - 1);
      }
    });

    it('returns remaining 0 when limit is exceeded', () => {
      for (let i = 0; i < 3; i++) {
        rateLimit('exceed-key', 3, 60_000);
      }
      const result = rateLimit('exceed-key', 3, 60_000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // =========================================================================
  // Limit exceeded
  // =========================================================================

  describe('Limit exceeded', () => {
    it('returns failure when limit is exceeded', () => {
      const maxRequests = 3;
      for (let i = 0; i < maxRequests; i++) {
        rateLimit('blocked-key', maxRequests, 60_000);
      }

      const result = rateLimit('blocked-key', maxRequests, 60_000);
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('continues to return failure for subsequent requests after limit exceeded', () => {
      const maxRequests = 2;
      rateLimit('persist-block', maxRequests, 60_000);
      rateLimit('persist-block', maxRequests, 60_000);

      for (let i = 0; i < 5; i++) {
        const result = rateLimit('persist-block', maxRequests, 60_000);
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
      }
    });
  });

  // =========================================================================
  // Window expiration — requests succeed again after window passes
  // =========================================================================

  describe('Window expiration', () => {
    it('allows requests again after the window expires', () => {
      const windowMs = 10_000;
      const maxRequests = 2;

      rateLimit('window-key', maxRequests, windowMs);
      rateLimit('window-key', maxRequests, windowMs);

      const blocked = rateLimit('window-key', maxRequests, windowMs);
      expect(blocked.success).toBe(false);

      // Advance time past the window
      jest.advanceTimersByTime(windowMs + 1);

      const result = rateLimit('window-key', maxRequests, windowMs);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(maxRequests - 1);
    });

    it('partially expires old timestamps within the sliding window', () => {
      const windowMs = 10_000;
      const maxRequests = 3;

      // Make 2 requests at t=0
      rateLimit('sliding-key', maxRequests, windowMs);
      rateLimit('sliding-key', maxRequests, windowMs);

      // Advance 6 seconds (t=6s)
      jest.advanceTimersByTime(6_000);

      // Make 1 request at t=6s — now at 3/3 (all within window)
      const third = rateLimit('sliding-key', maxRequests, windowMs);
      expect(third.success).toBe(true);
      expect(third.remaining).toBe(0);

      // Blocked at t=6s
      const blocked = rateLimit('sliding-key', maxRequests, windowMs);
      expect(blocked.success).toBe(false);

      // Advance 5 more seconds to t=11s — the two t=0 timestamps expire (outside 10s window)
      jest.advanceTimersByTime(5_000);

      // Only the t=6s timestamp remains within window [1s..11s]
      const result = rateLimit('sliding-key', maxRequests, windowMs);
      expect(result.success).toBe(true);
      // 1 existing (t=6s) + this one = 2 used, 1 remaining
      expect(result.remaining).toBe(1);
    });

    it('window expiry does not affect other keys', () => {
      const windowMs = 5_000;

      rateLimit('expire-a', 1, windowMs);
      rateLimit('expire-b', 1, windowMs);

      // Both blocked
      expect(rateLimit('expire-a', 1, windowMs).success).toBe(false);
      expect(rateLimit('expire-b', 1, windowMs).success).toBe(false);

      // Advance past window
      jest.advanceTimersByTime(windowMs + 1);

      // Both should be unblocked
      expect(rateLimit('expire-a', 1, windowMs).success).toBe(true);
      expect(rateLimit('expire-b', 1, windowMs).success).toBe(true);
    });
  });

  // =========================================================================
  // Different keys are independent
  // =========================================================================

  describe('Independent keys', () => {
    it('rate limiting user A does not affect user B', () => {
      const maxRequests = 2;

      // Exhaust user A
      rateLimit('user-A', maxRequests, 60_000);
      rateLimit('user-A', maxRequests, 60_000);
      expect(rateLimit('user-A', maxRequests, 60_000).success).toBe(false);

      // User B should still have full allowance
      const resultB = rateLimit('user-B', maxRequests, 60_000);
      expect(resultB.success).toBe(true);
      expect(resultB.remaining).toBe(1);
    });

    it('different route keys are tracked independently', () => {
      rateLimit('api/signup:192.168.1.1', 1, 60_000);
      expect(rateLimit('api/signup:192.168.1.1', 1, 60_000).success).toBe(false);

      // Same IP, different route — should succeed
      expect(rateLimit('api/login:192.168.1.1', 1, 60_000).success).toBe(true);
    });

    it('many independent keys can coexist', () => {
      for (let i = 0; i < 100; i++) {
        const result = rateLimit(`key-${i}`, 1, 60_000);
        expect(result.success).toBe(true);
      }
    });
  });

  // =========================================================================
  // Edge case: exactly at the limit
  // =========================================================================

  describe('Edge case: exactly at the limit', () => {
    it('last allowed request succeeds with remaining 0', () => {
      const maxRequests = 3;

      rateLimit('exact-key', maxRequests, 60_000);
      rateLimit('exact-key', maxRequests, 60_000);

      // 3rd and last allowed request
      const lastAllowed = rateLimit('exact-key', maxRequests, 60_000);
      expect(lastAllowed.success).toBe(true);
      expect(lastAllowed.remaining).toBe(0);

      // Very next request should be blocked
      const blocked = rateLimit('exact-key', maxRequests, 60_000);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('limit of 1 allows exactly one request', () => {
      const first = rateLimit('single-key', 1, 60_000);
      expect(first.success).toBe(true);
      expect(first.remaining).toBe(0);

      const second = rateLimit('single-key', 1, 60_000);
      expect(second.success).toBe(false);
      expect(second.remaining).toBe(0);
    });

    it('limit of 1 with window expiry cycles correctly', () => {
      const windowMs = 1_000;

      expect(rateLimit('cycle-key', 1, windowMs).success).toBe(true);
      expect(rateLimit('cycle-key', 1, windowMs).success).toBe(false);

      jest.advanceTimersByTime(windowMs + 1);

      expect(rateLimit('cycle-key', 1, windowMs).success).toBe(true);
      expect(rateLimit('cycle-key', 1, windowMs).success).toBe(false);

      jest.advanceTimersByTime(windowMs + 1);

      expect(rateLimit('cycle-key', 1, windowMs).success).toBe(true);
    });
  });

  // =========================================================================
  // Concurrent calls to same key
  // =========================================================================

  describe('Concurrent calls to same key', () => {
    it('handles rapid sequential calls correctly — first N succeed, rest fail', () => {
      const maxRequests = 5;
      const results: { success: boolean; remaining: number }[] = [];

      for (let i = 0; i < 7; i++) {
        results.push(rateLimit('concurrent-key', maxRequests, 60_000));
      }

      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        expect(results[i].success).toBe(true);
        expect(results[i].remaining).toBe(maxRequests - i - 1);
      }

      // 6th and 7th should fail
      expect(results[5].success).toBe(false);
      expect(results[6].success).toBe(false);
    });

    it('all calls at exact same timestamp are handled consistently', () => {
      // With fake timers, Date.now() is frozen, so all calls get the same timestamp
      const maxRequests = 3;

      const r1 = rateLimit('same-ts', maxRequests, 60_000);
      const r2 = rateLimit('same-ts', maxRequests, 60_000);
      const r3 = rateLimit('same-ts', maxRequests, 60_000);
      const r4 = rateLimit('same-ts', maxRequests, 60_000);

      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
      expect(r3.success).toBe(true);
      expect(r4.success).toBe(false);
    });

    it('timestamps at exact window boundary are pruned correctly', () => {
      // The filter is `t > windowStart` (strictly greater), so timestamps
      // exactly at the boundary should be pruned.
      const windowMs = 5_000;

      rateLimit('boundary-key', 1, windowMs);

      // Advance exactly to the window boundary
      jest.advanceTimersByTime(windowMs);

      // The old timestamp at t=0 is now exactly windowStart (now - windowMs),
      // and the filter `t > windowStart` uses strict inequality, so t=0 should be pruned
      // when windowStart = 0 (since t > 0 is false for t=0).
      // However, at t=5000, windowStart = 5000 - 5000 = 0, and t=0, so 0 > 0 is false => pruned.
      const result = rateLimit('boundary-key', 1, windowMs);
      expect(result.success).toBe(true);
    });
  });
});
