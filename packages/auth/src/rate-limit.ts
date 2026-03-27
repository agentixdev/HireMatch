import { Redis } from "@upstash/redis";

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** When the window resets (Unix ms) */
  resetAt: number;
  /** How long to wait before retrying (ms), 0 if allowed */
  retryAfterMs: number;
}

/**
 * Sliding window rate limiter using Upstash Redis.
 *
 * Uses a sorted set where each member is a unique request ID and the score
 * is the timestamp. On each check, old entries outside the window are removed,
 * then the count is checked against the limit.
 */
export class SlidingWindowRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private keyPrefix: string;

  constructor(
    redis: Redis,
    config: RateLimitConfig,
    keyPrefix = "rl"
  ) {
    this.redis = redis;
    this.config = config;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check and consume one request for the given identifier.
   * Returns whether the request is allowed and rate limit metadata.
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowSeconds * 1000;
    const resetAt = now + this.config.windowSeconds * 1000;

    // Use a pipeline for atomicity
    const pipeline = this.redis.pipeline();

    // Remove entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current entries in the window
    pipeline.zcard(key);

    // Add the new request
    const requestId = `${now}:${Math.random().toString(36).slice(2, 8)}`;
    pipeline.zadd(key, { score: now, member: requestId });

    // Set TTL on the key to auto-cleanup
    pipeline.expire(key, this.config.windowSeconds);

    const results = await pipeline.exec();

    // zcard result is at index 1
    const currentCount = (results[1] as number) ?? 0;

    if (currentCount >= this.config.maxRequests) {
      // Over limit — remove the entry we just added
      await this.redis.zrem(key, requestId);

      // Find the oldest entry to calculate retry-after
      const oldest = await this.redis.zrange<string[]>(key, 0, 0, { withScores: false });
      const oldestScore = oldest.length > 0
        ? await this.redis.zscore(key, oldest[0]!)
        : null;

      const retryAfterMs = oldestScore
        ? Math.max(0, Number(oldestScore) + this.config.windowSeconds * 1000 - now)
        : this.config.windowSeconds * 1000;

      return {
        allowed: false,
        remaining: 0,
        limit: this.config.maxRequests,
        resetAt,
        retryAfterMs,
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - currentCount - 1,
      limit: this.config.maxRequests,
      resetAt,
      retryAfterMs: 0,
    };
  }

  /**
   * Get current usage without consuming a request.
   */
  async peek(identifier: string): Promise<{ count: number; remaining: number }> {
    const key = `${this.keyPrefix}:${identifier}`;
    const windowStart = Date.now() - this.config.windowSeconds * 1000;

    // Clean up and count
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return {
      count,
      remaining: Math.max(0, this.config.maxRequests - count),
    };
  }

  /**
   * Reset the rate limit for a specific identifier.
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Create a rate limiter with common presets.
 */
export function createRateLimiter(
  redis: Redis,
  preset: "api" | "auth" | "webhook" | "scrape"
): SlidingWindowRateLimiter {
  const presets: Record<string, RateLimitConfig> = {
    api: { maxRequests: 100, windowSeconds: 60 },
    auth: { maxRequests: 10, windowSeconds: 300 },
    webhook: { maxRequests: 1000, windowSeconds: 60 },
    scrape: { maxRequests: 20, windowSeconds: 60 },
  };

  return new SlidingWindowRateLimiter(
    redis,
    presets[preset]!,
    `rl:${preset}`
  );
}
