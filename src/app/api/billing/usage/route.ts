import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { TIER_CONFIG, type BillingTier } from '@/lib/stripe';

export async function GET() {
  try {
    // Auth
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createServiceClient();
    const { data: recruiter } = await admin
      .from('recruiters')
      .select('id, tier, monthly_views_used, monthly_views_reset_at, billing_period_end')
      .eq('user_id', user.id)
      .single();

    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 404 });
    }

    const tier = (recruiter.tier || 'free') as BillingTier;
    const config = TIER_CONFIG[tier];

    // Check if monthly views need to be reset
    let monthlyViewsUsed = recruiter.monthly_views_used || 0;
    const resetAt = recruiter.monthly_views_reset_at ? new Date(recruiter.monthly_views_reset_at) : null;
    const now = new Date();

    if (!resetAt || now >= resetAt) {
      // Reset views and set next reset date (first of next month)
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      monthlyViewsUsed = 0;

      await admin
        .from('recruiters')
        .update({
          monthly_views_used: 0,
          monthly_views_reset_at: nextReset.toISOString(),
        })
        .eq('id', recruiter.id);
    }

    // Count active jobs
    const { count: activeJobs } = await admin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('recruiter_id', recruiter.id)
      .eq('is_active', true);

    // Count total jobs
    const { count: totalJobs } = await admin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('recruiter_id', recruiter.id);

    return NextResponse.json({
      tier,
      activeJobs: activeJobs || 0,
      totalJobs: totalJobs || 0,
      jobLimit: config.jobLimit === Infinity ? null : config.jobLimit,
      monthlyViewsUsed,
      viewLimit: config.viewLimit === Infinity ? null : config.viewLimit,
      billingPeriodEnd: recruiter.billing_period_end,
    });
  } catch (error) {
    console.error('[billing/usage] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
