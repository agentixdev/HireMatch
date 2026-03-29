/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: This works per-process. In a serverless environment each cold start
 * gets its own Map, so it is best-effort. For strict rate limiting, use a
 * Redis-backed solution instead.
 */

const hits = new Map<string, number[]>();

/**
 * Check whether a request identified by `key` is within the allowed rate.
 *
 * @param key         Unique identifier (e.g. IP address, email, or route+IP).
 * @param maxRequests Maximum number of requests allowed inside the window.
 * @param windowMs    Sliding window size in milliseconds.
 * @returns           `{ success, remaining }` — success is false when the
 *                    caller should be rejected (HTTP 429).
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps and prune those outside the window
  const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    return { success: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  return { success: true, remaining: maxRequests - timestamps.length };
}
