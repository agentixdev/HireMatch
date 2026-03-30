/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: This works per-process. In a serverless environment each cold start
 * gets its own Map, so it is best-effort. For strict rate limiting, use a
 * Redis-backed solution instead.
 */

const hits = new Map<string, number[]>();

// Periodic cleanup of stale entries to prevent unbounded memory growth.
// Runs at most every 60 seconds.
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanupStaleEntries(maxAge: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - maxAge;
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  }
}

/**
 * Check whether a request identified by `key` is within the allowed rate.
 *
 * @param key         Unique identifier (e.g. IP address, email, or route+IP).
 * @param maxRequests Maximum number of requests allowed inside the window.
 * @param windowMs    Sliding window size in milliseconds.
 * @returns           `{ success, remaining, reset }` — success is false when the
 *                    caller should be rejected (HTTP 429).
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Opportunistic cleanup
  cleanupStaleEntries(windowMs);

  // Get existing timestamps and prune those outside the window
  const timestamps = (hits.get(key) || []).filter((t) => t > windowStart);
  const reset = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;

  if (timestamps.length >= maxRequests) {
    hits.set(key, timestamps);
    return { success: false, remaining: 0, reset };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  return { success: true, remaining: maxRequests - timestamps.length, reset };
}

/**
 * Extract client IP from a request (works with Vercel's x-forwarded-for header).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Factory that creates a rate limiter for a specific route.
 * Uses IP + route as the key by default.
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => {
    const ip = getClientIp(req);
    const url = new URL(req.url);
    return `${ip}:${url.pathname}`;
  });

  return (req: Request) => {
    const key = keyGenerator(req);
    return rateLimit(key, max, windowMs);
  };
}
