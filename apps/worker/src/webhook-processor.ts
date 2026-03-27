import type { Logger } from 'pino';
import { createHmac, timingSafeEqual } from 'node:crypto';

/* ─── Types ─── */

export interface WebhookJobData {
  deliveryId: string;
  endpointId: string;
  orgId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

interface WebhookDeliveryResult {
  status: 'delivered' | 'failed' | 'endpoint_disabled';
  deliveryId: string;
  httpStatus?: number;
  error?: string;
}

/* ─── Configuration ─── */

const DELIVERY_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS ?? '10000');
const MAX_FAILURES_BEFORE_DISABLE = 5;
const MAX_RESPONSE_BODY_LENGTH = 4096;

/* ─── DB operations ─── */

async function getDb() {
  const { createDb } = await import('@recruitment/db');
  return createDb();
}

interface EndpointConfig {
  id: string;
  url: string;
  secret_hash: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
}

async function getEndpointConfig(endpointId: string): Promise<EndpointConfig | null> {
  const db = await getDb();
  const { webhookEndpoints } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  const result = await db
    .select({
      id: webhookEndpoints.id,
      url: webhookEndpoints.url,
      secret_hash: webhookEndpoints.secret_hash,
      events: webhookEndpoints.events,
      is_active: webhookEndpoints.is_active,
      failure_count: webhookEndpoints.failure_count,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.id, endpointId))
    .limit(1);

  return (result[0] as EndpointConfig | undefined) ?? null;
}

async function updateDeliveryLog(
  deliveryId: string,
  updates: {
    response_status?: number;
    response_body?: string;
    attempt_count: number;
    delivered_at?: Date;
    next_retry_at?: Date | null;
  },
): Promise<void> {
  const db = await getDb();
  const { webhookDeliveries } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  await db
    .update(webhookDeliveries)
    .set(updates)
    .where(eq(webhookDeliveries.id, deliveryId));
}

async function incrementEndpointFailure(endpointId: string): Promise<number> {
  const db = await getDb();
  const { webhookEndpoints } = await import('@recruitment/db');
  const { eq, sql } = await import('drizzle-orm');

  const result = await db
    .update(webhookEndpoints)
    .set({
      failure_count: sql`${webhookEndpoints.failure_count} + 1`,
    })
    .where(eq(webhookEndpoints.id, endpointId))
    .returning({ failure_count: webhookEndpoints.failure_count });

  return result[0]?.failure_count ?? 0;
}

async function resetEndpointFailure(endpointId: string): Promise<void> {
  const db = await getDb();
  const { webhookEndpoints } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  await db
    .update(webhookEndpoints)
    .set({ failure_count: 0 })
    .where(eq(webhookEndpoints.id, endpointId));
}

async function disableEndpoint(endpointId: string): Promise<void> {
  const db = await getDb();
  const { webhookEndpoints } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  await db
    .update(webhookEndpoints)
    .set({ is_active: false })
    .where(eq(webhookEndpoints.id, endpointId));
}

/* ─── Signing ─── */

/**
 * Sign a webhook payload using HMAC-SHA256.
 * Returns the signature as hex string.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/**
 * Compute the next retry time using exponential backoff.
 * Retries at: 10s, 30s, 90s, 270s, 810s after failure.
 */
function computeNextRetry(attemptCount: number): Date | null {
  if (attemptCount >= MAX_FAILURES_BEFORE_DISABLE) return null;
  const delayMs = 10_000 * Math.pow(3, attemptCount - 1);
  return new Date(Date.now() + delayMs);
}

/* ─── Main processor ─── */

export async function processWebhookDelivery(
  data: WebhookJobData,
  logger: Logger,
): Promise<WebhookDeliveryResult> {
  const { deliveryId, endpointId, orgId, eventType, payload } = data;

  // Load endpoint config
  const endpoint = await getEndpointConfig(endpointId);
  if (!endpoint) {
    logger.warn({ endpointId }, 'Webhook endpoint not found');
    return { status: 'failed', deliveryId, error: 'Endpoint not found' };
  }

  // Check if endpoint is still active
  if (!endpoint.is_active) {
    logger.info({ endpointId }, 'Webhook endpoint is disabled, skipping delivery');
    await updateDeliveryLog(deliveryId, {
      attempt_count: 1,
      response_body: 'Endpoint disabled',
      next_retry_at: null,
    });
    return { status: 'endpoint_disabled', deliveryId };
  }

  // Check if the endpoint subscribes to this event type
  if (endpoint.events.length > 0 && !endpoint.events.includes(eventType)) {
    logger.info(
      { endpointId, eventType, subscribedEvents: endpoint.events },
      'Endpoint does not subscribe to this event type',
    );
    return { status: 'delivered', deliveryId };
  }

  // Build the webhook envelope
  const envelope = {
    id: deliveryId,
    type: eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: payload,
    metadata: {
      orgId,
      correlationId: deliveryId,
    },
  };

  const body = JSON.stringify(envelope);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedContent = `${timestamp}.${body}`;
  const signature = signPayload(signedContent, endpoint.secret_hash);

  // Deliver
  let response: Response | null = null;
  let responseBody = '';
  let attemptCount = 1;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HireMatch-Webhook/1.0',
        'X-Webhook-Id': deliveryId,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': eventType,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Read response body (truncated)
    try {
      const fullBody = await response.text();
      responseBody = fullBody.substring(0, MAX_RESPONSE_BODY_LENGTH);
    } catch {
      responseBody = '<unable to read response body>';
    }

    const httpStatus = response.status;

    if (httpStatus >= 200 && httpStatus < 300) {
      // Success
      logger.info(
        { deliveryId, endpointId, httpStatus, url: endpoint.url },
        'Webhook delivered successfully',
      );

      await updateDeliveryLog(deliveryId, {
        response_status: httpStatus,
        response_body: responseBody,
        attempt_count: attemptCount,
        delivered_at: new Date(),
        next_retry_at: null,
      });

      // Reset failure count on success
      if (endpoint.failure_count > 0) {
        await resetEndpointFailure(endpointId);
      }

      return { status: 'delivered', deliveryId, httpStatus };
    }

    // Non-2xx response
    logger.warn(
      { deliveryId, endpointId, httpStatus, url: endpoint.url },
      'Webhook delivery received non-2xx response',
    );

    return await handleFailure(
      deliveryId,
      endpointId,
      httpStatus,
      responseBody,
      attemptCount,
      logger,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');

    logger.error(
      { deliveryId, endpointId, err: errorMessage, isTimeout, url: endpoint.url },
      'Webhook delivery failed',
    );

    return await handleFailure(
      deliveryId,
      endpointId,
      undefined,
      isTimeout ? 'Request timed out' : errorMessage,
      attemptCount,
      logger,
    );
  }
}

async function handleFailure(
  deliveryId: string,
  endpointId: string,
  httpStatus: number | undefined,
  responseBody: string,
  attemptCount: number,
  logger: Logger,
): Promise<WebhookDeliveryResult> {
  // Increment endpoint failure count
  const newFailureCount = await incrementEndpointFailure(endpointId);

  // Disable endpoint after MAX_FAILURES_BEFORE_DISABLE consecutive failures
  if (newFailureCount >= MAX_FAILURES_BEFORE_DISABLE) {
    logger.warn(
      { endpointId, failureCount: newFailureCount },
      'Disabling webhook endpoint after too many failures',
    );
    await disableEndpoint(endpointId);

    await updateDeliveryLog(deliveryId, {
      response_status: httpStatus,
      response_body: `${responseBody}\n\n[Endpoint disabled after ${newFailureCount} consecutive failures]`,
      attempt_count: attemptCount,
      next_retry_at: null,
    });

    return {
      status: 'endpoint_disabled',
      deliveryId,
      httpStatus,
      error: `Endpoint disabled after ${newFailureCount} failures`,
    };
  }

  // Schedule retry
  const nextRetry = computeNextRetry(attemptCount);

  await updateDeliveryLog(deliveryId, {
    response_status: httpStatus,
    response_body: responseBody,
    attempt_count: attemptCount,
    next_retry_at: nextRetry,
  });

  return {
    status: 'failed',
    deliveryId,
    httpStatus,
    error: responseBody,
  };
}
