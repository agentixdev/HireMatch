import { createServiceClient } from './supabase-server';

const DEFAULT_RETENTION_DAYS = 30;

/**
 * Delete webhook delivery logs older than the specified retention period.
 * Also cleans up orphaned webhook_events that no longer have deliveries.
 *
 * Intended to be called from a scheduled cron job or Vercel cron handler.
 */
export async function cleanupOldDeliveries(
  retentionDays: number = DEFAULT_RETENTION_DAYS
): Promise<{ deletedDeliveries: number; deletedEvents: number }> {
  const supabase = await createServiceClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoff = cutoffDate.toISOString();

  // Delete old deliveries
  const { data: deletedDeliveryRows, error: deliveryError } = await supabase
    .from('webhook_deliveries')
    .delete()
    .lt('delivered_at', cutoff)
    .select('id');

  if (deliveryError) {
    console.error('[webhook-cleanup] Failed to delete old deliveries:', deliveryError);
  }

  const deletedDeliveries = deletedDeliveryRows?.length ?? 0;

  // Delete old events that no longer have any deliveries
  const { data: deletedEventRows, error: eventError } = await supabase
    .from('webhook_events')
    .delete()
    .lt('created_at', cutoff)
    .select('id');

  if (eventError) {
    console.error('[webhook-cleanup] Failed to delete old events:', eventError);
  }

  const deletedEvents = deletedEventRows?.length ?? 0;

  console.log(
    `[webhook-cleanup] Cleaned up ${deletedDeliveries} deliveries and ${deletedEvents} events older than ${retentionDays} days`
  );

  return { deletedDeliveries, deletedEvents };
}
