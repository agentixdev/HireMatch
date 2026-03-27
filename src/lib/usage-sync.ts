import { getStripe, TIER_CONFIG, type BillingTier } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase service client (standalone — this module may run in cron context)
// ---------------------------------------------------------------------------
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// syncUsageToStripe — read api_usage counts and report to Stripe meter
// ---------------------------------------------------------------------------
export async function syncUsageToStripe(orgId: string): Promise<{
  apiCalls: number;
  candidateViews: number;
  reported: boolean;
}> {
  const db = getServiceClient();

  // Fetch org to get stripe customer ID and subscription period
  const { data: org, error: orgErr } = await db
    .from('organizations' as string)
    .select('id, stripe_customer_id, stripe_subscription_id, billing_tier')
    .eq('id', orgId)
    .single();

  if (orgErr || !org || !org.stripe_customer_id) {
    return { apiCalls: 0, candidateViews: 0, reported: false };
  }

  // Determine current billing period
  let periodStart: string;
  const stripe = getStripe();

  if (org.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id, { expand: ['items.data'] });
      const start = (sub as any).current_period_start ?? sub.items.data[0]?.current_period_start;
      periodStart = start ? new Date(start * 1000).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    } catch {
      periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    }
  } else {
    periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  }

  // Count API calls
  const { count: apiCalls } = await db
    .from('api_usage' as string)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', periodStart);

  // Count candidate views
  const { count: candidateViews } = await db
    .from('api_usage' as string)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .like('path', '%/candidates/%')
    .eq('method', 'GET')
    .gte('created_at', periodStart);

  const apiCount = apiCalls ?? 0;
  const viewCount = candidateViews ?? 0;

  // Report to Stripe metered billing (if metering is set up)
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    if (apiCount > 0) {
      await (stripe as any).billing.meterEvents.create({
        event_name: 'api_calls',
        payload: {
          stripe_customer_id: org.stripe_customer_id,
          value: String(apiCount),
        },
        timestamp,
      });
    }

    if (viewCount > 0) {
      await (stripe as any).billing.meterEvents.create({
        event_name: 'candidate_views',
        payload: {
          stripe_customer_id: org.stripe_customer_id,
          value: String(viewCount),
        },
        timestamp,
      });
    }
  } catch (err) {
    console.error(`Failed to report usage to Stripe for org ${orgId}:`, err);
    return { apiCalls: apiCount, candidateViews: viewCount, reported: false };
  }

  return { apiCalls: apiCount, candidateViews: viewCount, reported: true };
}

// ---------------------------------------------------------------------------
// checkUsageLimits — check if org is near/over limits, publish events
// ---------------------------------------------------------------------------
export async function checkUsageLimits(orgId: string): Promise<{
  warnings: string[];
  limitReached: string[];
}> {
  const db = getServiceClient();

  const { data: org, error: orgErr } = await db
    .from('organizations' as string)
    .select('id, stripe_subscription_id, billing_tier')
    .eq('id', orgId)
    .single();

  if (orgErr || !org) {
    return { warnings: [], limitReached: [] };
  }

  const tier = (org.billing_tier || 'free') as BillingTier;
  const tierConfig = TIER_CONFIG[tier];
  if (!tierConfig) {
    return { warnings: [], limitReached: [] };
  }

  // Determine period
  let periodStart: string;
  if (org.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id, { expand: ['items.data'] });
      const start = (sub as any).current_period_start ?? sub.items.data[0]?.current_period_start;
      periodStart = start ? new Date(start * 1000).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    } catch {
      periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    }
  } else {
    periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  }

  // Count current usage
  const { count: candidateViews } = await db
    .from('api_usage' as string)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .like('path', '%/candidates/%')
    .eq('method', 'GET')
    .gte('created_at', periodStart);

  const { count: activeJobs } = await db
    .from('jobs' as string)
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('is_active', true);

  const viewCount = candidateViews ?? 0;
  const jobCount = activeJobs ?? 0;

  const warnings: string[] = [];
  const limitReached: string[] = [];

  // Check candidate view limits
  const viewLimit = tierConfig.viewLimit;
  if (Number.isFinite(viewLimit) && viewLimit > 0) {
    const pct = (viewCount / viewLimit) * 100;
    if (pct >= 100) {
      limitReached.push('candidate_views');
    } else if (pct >= 80) {
      warnings.push('candidate_views');
    }
  }

  // Check job limits
  const jobLimit = tierConfig.jobLimit;
  if (Number.isFinite(jobLimit) && jobLimit > 0) {
    const pct = (jobCount / jobLimit) * 100;
    if (pct >= 100) {
      limitReached.push('jobs');
    } else if (pct >= 80) {
      warnings.push('jobs');
    }
  }

  // Publish billing events to subscription_events table
  for (const resource of warnings) {
    await db.from('subscription_events' as string).insert({
      org_id: orgId,
      event_type: 'billing.limit_warning',
      metadata: { resource, tier },
    });
  }

  for (const resource of limitReached) {
    await db.from('subscription_events' as string).insert({
      org_id: orgId,
      event_type: 'billing.limit_reached',
      metadata: { resource, tier },
    });
  }

  return { warnings, limitReached };
}
