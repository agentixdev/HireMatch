import { createServiceClient } from './supabase-server';
import { decryptSecret } from './crypto';
import { createLogger } from './logger';
import type { WebhookEvent } from '@/types';
import crypto from 'crypto';

const log = createLogger('webhook');
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff: 1s, 2s, 4s

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fire webhooks for a given event. Called internally when application status changes, etc.
 * Retries failed deliveries up to 3 times with exponential backoff (1s, 2s, 4s).
 * Webhook secrets are decrypted at delivery time (encrypted at rest in DB).
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
      // Decrypt the secret from DB before signing
      const secret = decryptSecret(config.secret);

      // Sign payload with HMAC-SHA256
      const signature = crypto
        .createHmac('sha256', secret)
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
          log.info(`Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`, { configId: config.id });
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
              log.info(`Delivery succeeded on retry ${attempt}`, { configId: config.id });
            }
            break;
          }

          // Non-2xx response — treat as failure, will retry
          lastError = `HTTP ${response.status}: ${responseBody}`;
          log.warn(`Non-2xx response (${response.status})`, { configId: config.id, attempt: attempt + 1 });
        } catch (err) {
          lastError = err;
          responseStatus = 0;
          responseBody = String(err);
          log.warn('Network error', { configId: config.id, attempt: attempt + 1, error: String(err) });
        }
      }

      if (!delivered) {
        log.error(`Permanently failed after ${MAX_RETRIES} retries`, { configId: config.id, error: String(lastError) });
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
        log.error('Failed to log webhook delivery', { configId: config.id, error: logError.message });
      }
    } catch (outerErr) {
      log.error('Webhook delivery failed entirely', { configId: config.id, error: String(outerErr) });
    }
  }
}
