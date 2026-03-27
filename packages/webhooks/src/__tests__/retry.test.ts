import {
  RETRY_DELAYS_MS,
  MAX_ATTEMPTS,
  getRetryDelay,
  getRetryState,
  isRetryableStatus,
  getNextRetryAt,
  describeRetrySchedule,
} from '../retry';

describe('RETRY_DELAYS_MS', () => {
  it('has 5 retry delays', () => {
    expect(RETRY_DELAYS_MS).toHaveLength(5);
  });

  it('delays are 1m, 5m, 30m, 2h, 12h in milliseconds', () => {
    expect(RETRY_DELAYS_MS[0]).toBe(60_000);       // 1 minute
    expect(RETRY_DELAYS_MS[1]).toBe(300_000);      // 5 minutes
    expect(RETRY_DELAYS_MS[2]).toBe(1_800_000);    // 30 minutes
    expect(RETRY_DELAYS_MS[3]).toBe(7_200_000);    // 2 hours
    expect(RETRY_DELAYS_MS[4]).toBe(43_200_000);   // 12 hours
  });

  it('delays are in ascending order', () => {
    for (let i = 1; i < RETRY_DELAYS_MS.length; i++) {
      expect(RETRY_DELAYS_MS[i]).toBeGreaterThan(RETRY_DELAYS_MS[i - 1]);
    }
  });
});

describe('MAX_ATTEMPTS', () => {
  it('equals RETRY_DELAYS_MS.length + 1 (6 total)', () => {
    expect(MAX_ATTEMPTS).toBe(6);
  });
});

describe('getRetryDelay()', () => {
  it('returns 60000 for attempt 0', () => {
    expect(getRetryDelay(0)).toBe(60_000);
  });

  it('returns 300000 for attempt 1', () => {
    expect(getRetryDelay(1)).toBe(300_000);
  });

  it('returns 1800000 for attempt 2', () => {
    expect(getRetryDelay(2)).toBe(1_800_000);
  });

  it('returns 7200000 for attempt 3', () => {
    expect(getRetryDelay(3)).toBe(7_200_000);
  });

  it('returns 43200000 for attempt 4', () => {
    expect(getRetryDelay(4)).toBe(43_200_000);
  });

  it('returns null for attempt 5 (beyond retry schedule)', () => {
    expect(getRetryDelay(5)).toBeNull();
  });

  it('returns null for negative attempt', () => {
    expect(getRetryDelay(-1)).toBeNull();
  });
});

describe('getRetryState()', () => {
  it('attempt 0 should retry with 60s delay', () => {
    const state = getRetryState(0);
    expect(state.shouldRetry).toBe(true);
    expect(state.nextDelay).toBe(60_000);
    expect(state.totalElapsed).toBe(0);
    expect(state.maxAttempts).toBe(6);
  });

  it('attempt 4 should retry with 43200s delay', () => {
    const state = getRetryState(4);
    expect(state.shouldRetry).toBe(true);
    expect(state.nextDelay).toBe(43_200_000);
    // Total elapsed = sum of delays 0..3
    expect(state.totalElapsed).toBe(60_000 + 300_000 + 1_800_000 + 7_200_000);
  });

  it('attempt 5 should NOT retry', () => {
    const state = getRetryState(5);
    expect(state.shouldRetry).toBe(false);
    expect(state.nextDelay).toBeNull();
  });

  it('attempt 6 should NOT retry', () => {
    const state = getRetryState(6);
    expect(state.shouldRetry).toBe(false);
    expect(state.nextDelay).toBeNull();
  });

  it('tracks totalElapsed correctly', () => {
    const state3 = getRetryState(3);
    // sum of delays 0, 1, 2 = 60000 + 300000 + 1800000 = 2160000
    expect(state3.totalElapsed).toBe(2_160_000);
  });
});

describe('isRetryableStatus()', () => {
  it('retries 500 Internal Server Error', () => {
    expect(isRetryableStatus(500)).toBe(true);
  });

  it('retries 502 Bad Gateway', () => {
    expect(isRetryableStatus(502)).toBe(true);
  });

  it('retries 503 Service Unavailable', () => {
    expect(isRetryableStatus(503)).toBe(true);
  });

  it('retries 408 Request Timeout', () => {
    expect(isRetryableStatus(408)).toBe(true);
  });

  it('retries 429 Too Many Requests', () => {
    expect(isRetryableStatus(429)).toBe(true);
  });

  it('retries status 0 (network error)', () => {
    expect(isRetryableStatus(0)).toBe(true);
  });

  it('does NOT retry 400 Bad Request', () => {
    expect(isRetryableStatus(400)).toBe(false);
  });

  it('does NOT retry 401 Unauthorized', () => {
    expect(isRetryableStatus(401)).toBe(false);
  });

  it('does NOT retry 403 Forbidden', () => {
    expect(isRetryableStatus(403)).toBe(false);
  });

  it('does NOT retry 404 Not Found', () => {
    expect(isRetryableStatus(404)).toBe(false);
  });

  it('does NOT retry 422 Unprocessable Entity', () => {
    expect(isRetryableStatus(422)).toBe(false);
  });
});

describe('getNextRetryAt()', () => {
  it('returns a Date for valid attempt', () => {
    const before = Date.now();
    const result = getNextRetryAt(0);
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThanOrEqual(before + 60_000 - 100);
  });

  it('returns null for attempt beyond schedule', () => {
    expect(getNextRetryAt(5)).toBeNull();
    expect(getNextRetryAt(10)).toBeNull();
  });

  it('returns null for negative attempt', () => {
    expect(getNextRetryAt(-1)).toBeNull();
  });
});

describe('describeRetrySchedule()', () => {
  it('returns a human-readable description', () => {
    const desc = describeRetrySchedule();
    expect(desc).toContain('1 minute');
    expect(desc).toContain('5 minutes');
    expect(desc).toContain('30 minutes');
    expect(desc).toContain('2 hours');
    expect(desc).toContain('12 hours');
  });
});
