import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recruiter
    const admin = await createServiceClient();
    const { data: recruiter } = await admin
      .from('recruiters')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!recruiter?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: recruiter.stripe_customer_id,
      return_url: `${origin}/dashboard/recruiter/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('[billing/portal] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
