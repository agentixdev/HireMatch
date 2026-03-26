import { createServiceClient } from './supabase-server';
import type { WebhookEvent } from '@/types';
import crypto from 'crypto';

/**
 * Fire webhooks for a given event. Called internally when application status changes, etc.
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
    // Sign payload with HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', config.secret)
      .update(body)
      .digest('hex');

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

      // Log delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_config_id: config.id,
        event,
        payload,
        response_status: response.status,
        response_body: await response.text().catch(() => ''),
      });
    } catch (err) {
      // Log failed delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_config_id: config.id,
        event,
        payload,
        response_status: 0,
        response_body: String(err),
      });
    }
  }
}
