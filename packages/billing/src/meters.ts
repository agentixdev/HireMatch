import { getStripeClient } from "./stripe-client.js";

/**
 * Report a metered usage event to Stripe.
 * Used for pay-as-you-go billing on top of subscription tiers.
 */
export async function reportUsageEvent(params: {
  customerId: string;
  eventName: string;
  value?: number;
  timestamp?: number;
  metadata?: Record<string, string>;
}): Promise<void> {
  const stripe = getStripeClient();

  await (stripe as any).billing.meterEvents.create({
    event_name: params.eventName,
    payload: {
      stripe_customer_id: params.customerId,
      value: String(params.value ?? 1),
      ...params.metadata,
    },
    timestamp: params.timestamp ?? Math.floor(Date.now() / 1000),
  });
}

/**
 * Report API call usage for a customer.
 */
export async function reportApiUsage(
  customerId: string,
  callCount = 1
): Promise<void> {
  await reportUsageEvent({
    customerId,
    eventName: "api_calls",
    value: callCount,
  });
}

/**
 * Report candidate view usage for a customer.
 */
export async function reportCandidateViewUsage(
  customerId: string,
  viewCount = 1
): Promise<void> {
  await reportUsageEvent({
    customerId,
    eventName: "candidate_views",
    value: viewCount,
  });
}

/**
 * Report scrape usage for a customer.
 */
export async function reportScrapeUsage(
  customerId: string,
  pageCount = 1
): Promise<void> {
  await reportUsageEvent({
    customerId,
    eventName: "scrape_pages",
    value: pageCount,
  });
}

/**
 * Get usage summary for a customer within a time range.
 */
export async function getUsageSummary(
  customerId: string,
  meterId: string,
  startTime: number,
  endTime: number
): Promise<{ totalUsage: number; periodStart: Date; periodEnd: Date }> {
  const stripe = getStripeClient();

  const summary = await (stripe as any).billing.meters.listEventSummaries(meterId, {
    customer: customerId,
    start_time: startTime,
    end_time: endTime,
  });

  const total = summary.data?.reduce(
    (sum: number, s: any) => sum + (Number(s.aggregated_value) || 0),
    0
  ) ?? 0;

  return {
    totalUsage: total,
    periodStart: new Date(startTime * 1000),
    periodEnd: new Date(endTime * 1000),
  };
}
