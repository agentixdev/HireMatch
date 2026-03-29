import crypto from 'crypto';
import { createHmac } from 'node:crypto';
import { createServiceClient } from './supabase-server';
import { decryptSecret } from './crypto';
import { createLogger } from './logger';

const log = createLogger('event-bus');

/**
 * All event types supported by the HireMatch event bus.
 */
export const EVENT_BUS_TYPES = [
  'visa_rule.created',
  'visa_rule.updated',
  'visa_rule.superseded',
  'candidate.indexed',
  'job.indexed',
  'job.expired',
  'match.completed',
  'scrape.failed',
  'billing.limit_reached',
  'billing.limit_warning',
  'application.created',
  'application.status_changed',
] as const;

export type EventBusType = (typeof EVENT_BUS_TYPES)[number];

/**
 * Map internal event bus types to canonical webhook event names.
 */
const EVENT_TYPE_MAP: Record<EventBusType, string> = {
  'visa_rule.created': 'visa.rules_updated',
  'visa_rule.updated': 'visa.rules_updated',
  'visa_rule.superseded': 'visa.rules_updated',
  'candidate.indexed': 'candidate.created',
  'job.indexed': 'job.created',
  'job.expired': 'job.closed',
  'match.completed': 'match.found',
  'scrape.failed': 'scrape.failed',
  'billing.limit_reached': 'usage.limit_exceeded',
  'billing.limit_warning': 'usage.limit_approaching',
  'application.created': 'application.submitted',
  'application.status_changed': 'application.status_changed',
};

interface PublishOptions {
  triggeredBy?: string;
  correlationId?: string;
}

/**
 * Build a webhook event envelope.
 */
function buildEventEnvelope(
  eventType: string,
  data: Record<string, unknown>,
  metadata: { orgId: string; triggeredBy: string; correlationId: string }
): Record<string, unknown> {
  return {
    id: crypto.randomUUID(),
    type: eventType,
    version: '1.0',
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      orgId: metadata.orgId,
      triggeredBy: metadata.triggeredBy,
      correlationId: metadata.correlationId,
    },
  };
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 */
function signPayload(body: string, secret: string): { signature: string; timestamp: number } {
  const ts = Math.floor(Date.now() / 1000);
  const hmac = createHmac('sha256', secret);
  hmac.update(`${ts}.${body}`);
  return { signature: `t=${ts},v1=${hmac.digest('hex')}`, timestamp: ts };
}

/**
 * Deliver a webhook payload to a single endpoint with timeout.
 */
async function deliverToEndpoint(
  url: string,
  payload: Record<string, unknown>,
  secret: string,
  deliveryId: string,
  timeoutMs: number = 30_000
): Promise<{
  success: boolean;
  statusCode: number;
  responseBody?: string;
  responseTime: number;
  error?: string;
}> {
  const body = JSON.stringify(payload);
  const { signature, timestamp } = signPayload(body, secret);
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-recruitment-signature': signature,
        'x-recruitment-timestamp': String(timestamp),
        'User-Agent': 'HireMatch-Webhook/1.0',
        'X-Delivery-Id': deliveryId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const responseTime = performance.now() - start;
    const statusCode = response.status;
    let responseBody: string | undefined;
    try {
      responseBody = (await response.text()).slice(0, 4096);
    } catch {
      // ignore
    }

    return {
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      responseBody,
      responseTime,
    };
  } catch (err) {
    const responseTime = performance.now() - start;
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return {
      success: false,
      statusCode: isTimeout ? 408 : 0,
      responseTime,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Deliver a webhook with up to maxAttempts retries and exponential backoff.
 */
async function deliverWithRetries(
  url: string,
  payload: Record<string, unknown>,
  secret: string,
  deliveryId: string,
  maxAttempts: number = 3,
  timeoutMs: number = 30_000
) {
  let lastResult = await deliverToEndpoint(url, payload, secret, deliveryId, timeoutMs);

  for (let attempt = 1; attempt < maxAttempts && !lastResult.success; attempt++) {
    // Exponential backoff: 1s, 2s, 4s...
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    lastResult = await deliverToEndpoint(url, payload, secret, deliveryId, timeoutMs);
  }

  return lastResult;
}

/**
 * Publish an event to the webhook event bus.
 *
 * 1. Logs the event to webhook_events table
 * 2. Queries webhook_configs for matching subscriptions
 * 3. Creates a delivery per endpoint (direct delivery with retries)
 */
export async function publishEvent(
  orgId: string,
  eventType: EventBusType,
  payload: Record<string, unknown>,
  options: PublishOptions = {}
): Promise<{ eventId: string; deliveryCount: number }> {
  const supabase = await createServiceClient();
  const correlationId = options.correlationId ?? crypto.randomUUID();
  const triggeredBy = options.triggeredBy ?? 'system';

  // 1. Log the event
  const { data: event, error: eventError } = await supabase
    .from('webhook_events')
    .insert({
      org_id: orgId,
      event_type: eventType,
      payload,
      correlation_id: correlationId,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single();

  if (eventError || !event) {
    log.error('Failed to log event', { error: eventError?.message });
    // Continue with delivery even if logging fails
  }

  const eventId: string = event?.id ?? crypto.randomUUID();

  // 2. Find active webhook endpoints subscribed to this event type
  const mapped = EVENT_TYPE_MAP[eventType];
  const matchEventTypes: string[] = [eventType];
  if (mapped && mapped !== eventType) matchEventTypes.push(mapped);

  const { data: configs, error: configError } = await supabase
    .from('webhook_configs')
    .select('id, url, secret, events')
    .eq('recruiter_id', orgId)
    .eq('is_active', true);

  if (configError) {
    log.error('Failed to query webhook configs', { error: configError.message });
    return { eventId, deliveryCount: 0 };
  }

  // Filter configs that subscribe to any matching event type
  const matchingConfigs = (configs || []).filter((config) => {
    const subscribedEvents: string[] = config.events || [];
    return subscribedEvents.some((e: string) => matchEventTypes.includes(e));
  });

  if (matchingConfigs.length === 0) {
    return { eventId, deliveryCount: 0 };
  }

  // 3. Build the webhook event envelope
  const webhookEvent = buildEventEnvelope(mapped ?? eventType, payload, {
    orgId,
    triggeredBy,
    correlationId,
  });

  // 4. Deliver to each endpoint concurrently
  let deliveryCount = 0;

  const deliveryPromises = matchingConfigs.map(async (config) => {
    const deliveryId = crypto.randomUUID();

    // Insert pending delivery record
    await supabase.from('webhook_deliveries').insert({
      id: deliveryId,
      webhook_config_id: config.id,
      event: eventType,
      event_id: eventId,
      payload: webhookEvent,
      status: 'pending',
      attempt: 0,
    });

    try {
      // Decrypt webhook secret before delivery
      const plainSecret = decryptSecret(config.secret);

      const result = await deliverWithRetries(
        config.url,
        webhookEvent,
        plainSecret,
        deliveryId,
        3,
        30_000
      );

      // Update delivery record with result
      await supabase
        .from('webhook_deliveries')
        .update({
          response_status: result.statusCode,
          response_body: result.responseBody?.slice(0, 4096) ?? null,
          response_time_ms: Math.round(result.responseTime),
          status: result.success ? 'success' : 'failed',
          attempt: 1,
          error: result.error ?? null,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (result.success) deliveryCount++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown delivery error';
      log.error('Delivery failed', { url: config.url, error: errorMsg });

      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'failed',
          error: errorMsg,
          response_status: 0,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);
    }
  });

  // Don't let one slow endpoint block others
  await Promise.allSettled(deliveryPromises);

  return { eventId, deliveryCount };
}
