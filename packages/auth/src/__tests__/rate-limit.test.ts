import { SlidingWindowRateLimiter, createRateLimiter } from '../rate-limit';
import type { RateLimitConfig } from '../rate-limit';

// Mock Redis with an in-memory sorted set
function createMockRedis() {
  const store = new Map<string, Map<string, number>>();

  const getOrCreate = (key: string) => {
    if (!store.has(key)) store.set(key, new Map());
    return store.get(key)!;
  };

  const pipeline = () => {
    const ops: Array<() => unknown> = [];
    return {
      zremrangebyscore: (key: string, min: number, max: number) => {
        ops.push(() => {
          const set = getOrCreate(key);
          for (const [member, score] of set) {
            if (score >= min && score <= max) set.delete(member);
          }
          return set.size;
        });
      },
      zcard: (key: string) => {
        ops.push(() => getOrCreate(key).size);
      },
      zadd: (key: string, { score, member }: { score: number; member: string }) => {
        ops.push(() => {
          getOrCreate(key).set(member, score);
          return 1;
        });
      },
      expire: (_key: string, _ttl: number) => {
        ops.push(() => 1);
      },
      exec: async () => ops.map((op) => op()),
    };
  };

  return {
    pipeline,
    zrem: async (key: string, member: string) => {
      getOrCreate(key).delete(member);
    },
    zrange: async (key: string, start: number, stop: number) => {
      const set = getOrCreate(key);
      const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
      return sorted.slice(start, stop + 1).map(([m]) => m);
    },
    zscore: async (key: string, member: string) => {
      return getOrCreate(key).get(member) ?? null;
    },
    zcard: async (key: string) => getOrCreate(key).size,
    zremrangebyscore: async (key: string, min: number, max: number) => {
      const set = getOrCreate(key);
      for (const [member, score] of set) {
        if (score >= min && score <= max) set.delete(member);
      }
    },
    del: async (key: string) => {
      store.delete(key);
    },
    _store: store,
  } as any;
}

describe('SlidingWindowRateLimiter', () => {
  let redis: ReturnType<typeof createMockRedis>;
  let limiter: SlidingWindowRateLimiter;
  const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 };

  beforeEach(() => {
    redis = createMockRedis();
    limiter = new SlidingWindowRateLimiter(redis, config, 'test-rl');
  });

  it('allows requests within limit', async () => {
    const result = await limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 5 max - 0 existing - 1 this
    expect(result.limit).toBe(5);
    expect(result.retryAfterMs).toBe(0);
  });

  it('returns correct remaining count as requests consume limit', async () => {
    const r1 = await limiter.check('user-2');
    expect(r1.remaining).toBe(4);

    const r2 = await limiter.check('user-2');
    expect(r2.remaining).toBe(3);

    const r3 = await limiter.check('user-2');
    expect(r3.remaining).toBe(2);
  });

  it('blocks requests exceeding limit', async () => {
    // Consume all 5 requests
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check('user-3');
      expect(result.allowed).toBe(true);
    }

    // 6th should be blocked
    const blocked = await limiter.check('user-3');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('returns correct reset timestamp', async () => {
    const before = Date.now();
    const result = await limiter.check('user-4');
    const after = Date.now();

    // resetAt should be ~60 seconds from now
    const expectedReset = before + 60_000;
    expect(result.resetAt).toBeGreaterThanOrEqual(expectedReset - 100);
    expect(result.resetAt).toBeLessThanOrEqual(after + 60_000 + 100);
  });

  it('different keys have independent limits', async () => {
    // Fill up user-a
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-a');
    }
    const blockedA = await limiter.check('user-a');
    expect(blockedA.allowed).toBe(false);

    // user-b should still be allowed
    const resultB = await limiter.check('user-b');
    expect(resultB.allowed).toBe(true);
    expect(resultB.remaining).toBe(4);
  });

  it('blocked request has positive retryAfterMs', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.check('user-5');
    }
    const blocked = await limiter.check('user-5');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});

describe('SlidingWindowRateLimiter.peek()', () => {
  it('returns current count without consuming a request', async () => {
    const redis = createMockRedis();
    const limiter = new SlidingWindowRateLimiter(redis, { maxRequests: 10, windowSeconds: 60 }, 'rl');

    await limiter.check('user-peek');
    await limiter.check('user-peek');

    const peek = await limiter.peek('user-peek');
    expect(peek.count).toBe(2);
    expect(peek.remaining).toBe(8);
  });
});

describe('SlidingWindowRateLimiter.reset()', () => {
  it('clears the rate limit for an identifier', async () => {
    const redis = createMockRedis();
    const limiter = new SlidingWindowRateLimiter(redis, { maxRequests: 2, windowSeconds: 60 }, 'rl');

    await limiter.check('user-reset');
    await limiter.check('user-reset');

    // Should be blocked
    const blocked = await limiter.check('user-reset');
    expect(blocked.allowed).toBe(false);

    // Reset
    await limiter.reset('user-reset');

    // Should be allowed again
    const after = await limiter.check('user-reset');
    expect(after.allowed).toBe(true);
  });
});

describe('createRateLimiter()', () => {
  it('creates limiter with "api" preset (100 req/60s)', () => {
    const redis = createMockRedis();
    const limiter = createRateLimiter(redis, 'api');
    expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
  });

  it('creates limiter with "auth" preset (10 req/300s)', () => {
    const redis = createMockRedis();
    const limiter = createRateLimiter(redis, 'auth');
    expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
  });

  it('creates limiter with "webhook" preset (1000 req/60s)', () => {
    const redis = createMockRedis();
    const limiter = createRateLimiter(redis, 'webhook');
    expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
  });

  it('creates limiter with "scrape" preset (20 req/60s)', () => {
    const redis = createMockRedis();
    const limiter = createRateLimiter(redis, 'scrape');
    expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
  });
});
