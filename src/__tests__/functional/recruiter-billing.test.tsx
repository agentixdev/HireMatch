/**
 * @jest-environment node
 *
 * Integration tests for recruiter billing flow — real Stripe API + real Supabase.
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = !!(STRIPE_SECRET && SUPABASE_URL && SUPABASE_SERVICE_KEY);

describe('Recruiter billing flow (integration)', () => {
  if (!canRun) {
    it('skipped — missing STRIPE_SECRET_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY', () => {
      console.warn('Billing integration tests skipped: env vars not set');
    });
    return;
  }

  const stripe = new Stripe(STRIPE_SECRET!);
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  let testCustomerId: string | null = null;

  afterAll(async () => {
    if (testCustomerId) {
      try { await stripe.customers.del(testCustomerId); } catch { /* ignore */ }
    }
  });

  it('should create a Stripe customer for a new recruiter', async () => {
    const customer = await stripe.customers.create({
      email: 'billing-flow-test@hirematch.com',
      name: 'Billing Flow Test Corp',
      metadata: { test: 'true', recruiter_id: 'test-billing-flow' },
    });

    testCustomerId = customer.id;
    expect(customer.id).toMatch(/^cus_/);
    expect(customer.email).toBe('billing-flow-test@hirematch.com');
    expect(customer.metadata.recruiter_id).toBe('test-billing-flow');
  }, 15000);

  it('should create a checkout session and get a redirect URL', async () => {
    const priceId = process.env.STRIPE_PRICE_PRO;
    expect(priceId).toBeTruthy();
    expect(testCustomerId).toBeTruthy();

    const session = await stripe.checkout.sessions.create({
      customer: testCustomerId!,
      mode: 'subscription',
      line_items: [{ price: priceId!, quantity: 1 }],
      success_url: 'https://hirematch.com/dashboard/recruiter/billing?success=true',
      cancel_url: 'https://hirematch.com/dashboard/recruiter/billing?canceled=true',
      subscription_data: {
        metadata: { recruiter_id: 'test-billing-flow', tier: 'pro' },
      },
    });

    expect(session.url).toBeTruthy();
    expect(session.url).toContain('checkout.stripe.com');
    expect(session.mode).toBe('subscription');
  }, 20000);

  it('should create a billing portal session', async () => {
    expect(testCustomerId).toBeTruthy();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: testCustomerId!,
      return_url: 'https://hirematch.com/dashboard/recruiter/billing',
    });

    expect(portalSession.url).toBeTruthy();
    expect(portalSession.url).toContain('billing.stripe.com');
  }, 15000);

  it('should verify all 3 price IDs are active in Stripe', async () => {
    const priceIds = [
      process.env.STRIPE_PRICE_PRO,
      process.env.STRIPE_PRICE_ENTERPRISE,
      process.env.STRIPE_PRICE_AGENCY,
    ];

    for (const priceId of priceIds) {
      expect(priceId).toBeTruthy();
      const price = await stripe.prices.retrieve(priceId!);
      expect(price.active).toBe(true);
      expect(price.recurring?.interval).toBe('month');
      expect(price.currency).toBe('usd');
    }
  }, 20000);

  it('should verify Supabase recruiters table has matchmaker columns', async () => {
    const { error } = await supabase
      .from('recruiters')
      .select('id, match_tags, values_dna, work_style, hiring_needs, onboarding_completed_at')
      .limit(1);

    expect(error).toBeNull();
  }, 10000);

  it('should verify recruiter_match_results table exists', async () => {
    const { error } = await supabase
      .from('recruiter_match_results')
      .select('id, recruiter_id, quiz_answers, candidates, total_scanned')
      .limit(1);

    expect(error).toBeNull();
  }, 10000);
});
