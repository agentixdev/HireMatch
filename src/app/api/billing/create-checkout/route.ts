import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { getStripe, TIER_CONFIG, type BillingTier } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Auth
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = (await request.json()) as { tier: BillingTier };

    if (!tier || !TIER_CONFIG[tier] || tier === 'free') {
      return NextResponse.json({ error: 'Invalid billing tier' }, { status: 400 });
    }

    const priceId = TIER_CONFIG[tier].stripePriceId;
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this tier' }, { status: 400 });
    }

    // Get recruiter record
    const admin = await createServiceClient();
    const { data: recruiter } = await admin
      .from('recruiters')
      .select('id, stripe_customer_id, company_name, tier')
      .eq('user_id', user.id)
      .single();

    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 404 });
    }

    // Reuse or create Stripe customer
    let customerId = recruiter.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: recruiter.company_name,
        metadata: {
          recruiter_id: recruiter.id,
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await admin
        .from('recruiters')
        .update({ stripe_customer_id: customerId })
        .eq('id', recruiter.id);
    }

    // Determine origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/recruiter/billing?success=true`,
      cancel_url: `${origin}/dashboard/recruiter/billing?canceled=true`,
      subscription_data: {
        metadata: {
          recruiter_id: recruiter.id,
          tier,
        },
      },
      metadata: {
        recruiter_id: recruiter.id,
        tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[billing/create-checkout] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
