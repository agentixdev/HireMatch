/** Retry delays in milliseconds: 1m, 5m, 30m, 2h, 12h */
export const RETRY_DELAYS_MS = [
  60_000,       // 1 minute
  300_000,      // 5 minutes
  1_800_000,    // 30 minutes
  7_200_000,    // 2 hours
  43_200_000,   // 12 hours
] as const;

export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // 6 total (1 initial + 5 retries)

export interface RetryState {
  attempt: number;
  maxAttempts: number;
  nextDelay: number | null;
  shouldRetry: boolean;
  totalElapsed: number;
}

/**
 * Get the delay in ms for a given attempt number (0-indexed).
 * Returns null if no more retries should be attempted.
 */
export function getRetryDelay(attempt: number): number | null {
  if (attempt < 0 || attempt >= RETRY_DELAYS_MS.length) return null;
  return RETRY_DELAYS_MS[attempt] ?? null;
}

/**
 * Calculate the full retry state for a given attempt.
 */
export function getRetryState(attempt: number): RetryState {
  const shouldRetry = attempt < MAX_ATTEMPTS - 1;
  const nextDelay = shouldRetry ? getRetryDelay(attempt) : null;
  const totalElapsed = RETRY_DELAYS_MS.slice(0, attempt).reduce((sum, d) => sum + d, 0);

  return {
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    nextDelay,
    shouldRetry,
    totalElapsed,
  };
}

/**
 * Determine if a response status code is retryable.
 * 4xx (except 408, 429) are not retried. 5xx and network errors are retried.
 */
export function isRetryableStatus(statusCode: number): boolean {
  // Client errors are not retried (except timeout and rate limit)
  if (statusCode === 408 || statusCode === 429) return true;
  if (statusCode >= 400 && statusCode < 500) return false;
  // Server errors and anything else are retried
  return statusCode >= 500 || statusCode === 0;
}

/**
 * Calculate when the next retry should be attempted.
 * Returns an absolute Date or null if no more retries.
 */
export function getNextRetryAt(attempt: number): Date | null {
  const delay = getRetryDelay(attempt);
  if (delay === null) return null;
  return new Date(Date.now() + delay);
}

/**
 * Human-readable description of the retry schedule.
 */
export function describeRetrySchedule(): string {
  const labels = ["1 minute", "5 minutes", "30 minutes", "2 hours", "12 hours"];
  return labels.map((l, i) => `Attempt ${i + 2}: ${l}`).join(", ");
}
