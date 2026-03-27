import { signPayload, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./sign.js";
import { getRetryState, isRetryableStatus, MAX_ATTEMPTS } from "./retry.js";

/** Delivery result */
export interface DeliveryResult {
  deliveryId: string;
  success: boolean;
  statusCode: number;
  responseBody?: string;
  responseTime: number;
  attempt: number;
  error?: string;
  retryable: boolean;
}

/** Delivery options */
export interface DeliveryOptions {
  /** Timeout per request in ms (default: 30s) */
  timeoutMs?: number;
  /** Custom headers to include */
  headers?: Record<string, string>;
}

/**
 * Deliver a webhook payload to an endpoint.
 * Signs the payload, sends it, and returns the result.
 */
export async function deliverWebhook(
  endpointUrl: string,
  payload: Record<string, unknown>,
  secret: string,
  deliveryId: string,
  attempt: number = 0,
  options: DeliveryOptions = {}
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload);
  const { signature, timestamp } = signPayload(body, secret);
  const timeoutMs = options.timeoutMs ?? 30_000;

  const startTime = performance.now();
  let statusCode = 0;
  let responseBody: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SIGNATURE_HEADER]: signature,
        [TIMESTAMP_HEADER]: String(timestamp),
        "User-Agent": "RecruitmentPlatform-Webhook/1.0",
        "X-Delivery-Id": deliveryId,
        "X-Attempt": String(attempt + 1),
        ...options.headers,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    statusCode = response.status;

    // Read response body (truncated)
    try {
      const text = await response.text();
      responseBody = text.slice(0, 4096);
    } catch {
      // Ignore response body read errors
    }

    const responseTime = performance.now() - startTime;
    const success = statusCode >= 200 && statusCode < 300;
    const retryState = getRetryState(attempt);

    return {
      deliveryId,
      success,
      statusCode,
      responseBody,
      responseTime,
      attempt,
      retryable: !success && retryState.shouldRetry && isRetryableStatus(statusCode),
    };
  } catch (err) {
    const responseTime = performance.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const retryState = getRetryState(attempt);

    return {
      deliveryId,
      success: false,
      statusCode: isTimeout ? 408 : 0,
      responseTime,
      attempt,
      error: errorMessage,
      retryable: retryState.shouldRetry,
    };
  }
}

/**
 * Deliver a webhook with automatic retries.
 * This is a synchronous retry loop — for async retries via queue, use the queue-based approach.
 */
export async function deliverWithRetries(
  endpointUrl: string,
  payload: Record<string, unknown>,
  secret: string,
  deliveryId: string,
  options: DeliveryOptions & { maxAttempts?: number } = {}
): Promise<DeliveryResult> {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await deliverWebhook(
      endpointUrl,
      payload,
      secret,
      deliveryId,
      attempt,
      options
    );

    if (result.success || !result.retryable) {
      return result;
    }

    // Wait before retrying (exponential backoff within a single delivery)
    if (attempt < maxAttempts - 1) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should not reach here, but return a failure result
  return {
    deliveryId,
    success: false,
    statusCode: 0,
    responseTime: 0,
    attempt: maxAttempts - 1,
    error: "Max attempts exceeded",
    retryable: false,
  };
}
