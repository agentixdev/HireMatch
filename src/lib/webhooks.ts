import { createServiceClient } from './supabase-server';
import type { WebhookEvent } from '@/types';
import crypto from 'crypto';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff: 1s, 2s, 4s

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire webhooks for a given event. Called internally when application status changes, etc.
 * Retries failed deliveries up to 3 times with exponential backoff (1s, 2s, 4s).
 */
export async function fireWebhooks(
  recruiterId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  const supabase = await createServiceClient();

  // Get active webhook configs for this recruiter + event
  const { data: configs } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .eq('is_active', true)
    .contains('events', [event]);

  if (!configs?.length) return;

  const timestamp = Date.now().toString();
  const body = JSON.stringify({ event, data: payload, timestamp });

  for (const config of configs) {
    try {
      // Sign payload with HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', config.secret)
        .update(body)
        .digest('hex');

      let lastError: unknown = null;
      let responseStatus = 0;
      let responseBody = '';
      let delivered = false;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // Wait before retry (skip delay on first attempt)
        if (attempt > 0) {
          const delay = RETRY_DELAYS[attempt - 1];
          console.log(`[webhook] Retry ${attempt}/${MAX_RETRIES} for config ${config.id} after ${delay}ms`);
          await sleep(delay);
        }

        try {
          const response = await fetch(config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-HireMatch-Signature': signature,
              'X-HireMatch-Timestamp': timestamp,
              'X-HireMatch-Event': event,
            },
            body,
            signal: AbortSignal.timeout(10000),
          });

          responseStatus = response.status;
          responseBody = await response.text().catch(() => '');

          if (response.ok) {
            delivered = true;
            if (attempt > 0) {
              console.log(`[webhook] Delivery succeeded on retry ${attempt} for config ${config.id}`);
            }
            break;
          }

          // Non-2xx response — treat as failure, will retry
          lastError = `HTTP ${response.status}: ${responseBody}`;
          console.warn(`[webhook] Non-2xx response (${response.status}) for config ${config.id}, attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
        } catch (err) {
          lastError = err;
          responseStatus = 0;
          responseBody = String(err);
          console.warn(`[webhook] Network error for config ${config.id}, attempt ${attempt + 1}/${MAX_RETRIES + 1}:`, err);
        }
      }

      if (!delivered) {
        console.error(`[webhook] Permanently failed after ${MAX_RETRIES} retries for config ${config.id}:`, lastError);
      }

      // Log final delivery result
      const { error: logError } = await supabase.from('webhook_deliveries').insert({
        webhook_config_id: config.id,
        event,
        payload,
        response_status: responseStatus,
        response_body: delivered ? responseBody : `FAILED after ${MAX_RETRIES} retries: ${responseBody}`,
      });
      if (logError) {
        console.error(`Failed to log webhook delivery for config ${config.id}:`, logError);
      }
    } catch (outerErr) {
      console.error(`Webhook delivery failed entirely for config ${config.id}:`, outerErr);
    }
  }
}
