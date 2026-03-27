/**
 * @jest-environment node
 */
import Stripe from 'stripe';
import {
  TIER_CONFIG,
  tierFromPriceId,
  canPostJob,
  canViewCandidate,
  type BillingTier,
} from '@/lib/stripe';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

function getStripeClient(): Stripe {
  if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(STRIPE_SECRET);
}

describe('Stripe billing', () => {
  describe('TIER_CONFIG', () => {
    it('should define all 4 tiers with correct pricing', () => {
      expect(TIER_CONFIG.free.price).toBe(0);
      expect(TIER_CONFIG.pro.price).toBe(99);
      expect(TIER_CONFIG.enterprise.price).toBe(499);
      expect(TIER_CONFIG.agency.price).toBe(999);
    });

    it('should have limits on free tier only', () => {
      expect(TIER_CONFIG.free.jobLimit).toBe(3);
      expect(TIER_CONFIG.free.viewLimit).toBe(10);
      expect(TIER_CONFIG.pro.jobLimit).toBe(Infinity);
      expect(TIER_CONFIG.pro.viewLimit).toBe(Infinity);
    });

    it('should have features arrays for all tiers', () => {
      Object.values(TIER_CONFIG).forEach((config) => {
        expect(config.features.length).toBeGreaterThan(0);
      });
    });
  });

  describe('tierFromPriceId', () => {
    it('should return free for unknown price IDs', () => {
      expect(tierFromPriceId('price_unknown')).toBe('free');
      expect(tierFromPriceId('')).toBe('free');
    });

    it('should match configured price IDs when set', () => {
      if (TIER_CONFIG.pro.stripePriceId) {
        expect(tierFromPriceId(TIER_CONFIG.pro.stripePriceId)).toBe('pro');
      }
    });
  });

  describe('canPostJob', () => {
    it('should enforce free tier limit at 3', () => {
      expect(canPostJob('free', 0)).toBe(true);
      expect(canPostJob('free', 2)).toBe(true);
      expect(canPostJob('free', 3)).toBe(false);
      expect(canPostJob('free', 10)).toBe(false);
    });

    it('should allow unlimited for paid tiers', () => {
      expect(canPostJob('pro', 1000)).toBe(true);
      expect(canPostJob('enterprise', 999)).toBe(true);
      expect(canPostJob('agency', 5000)).toBe(true);
    });
  });

  describe('canViewCandidate', () => {
    it('should enforce free tier limit at 10', () => {
      expect(canViewCandidate('free', 0)).toBe(true);
      expect(canViewCandidate('free', 9)).toBe(true);
      expect(canViewCandidate('free', 10)).toBe(false);
    });

    it('should allow unlimited for paid tiers', () => {
      expect(canViewCandidate('pro', 10000)).toBe(true);
      expect(canViewCandidate('agency', 50000)).toBe(true);
    });
  });

  // Real Stripe API tests
  describe('Stripe API integration (test mode)', () => {
    const skipIfNoKey = STRIPE_SECRET ? it : it.skip;

    skipIfNoKey('should list products in the catalog', async () => {
      const stripe = getStripeClient();
      const products = await stripe.products.list({ limit: 10 });
      expect(products.data.length).toBeGreaterThan(0);

      const names = products.data.map((p) => p.name);
      expect(names).toContain('HireMatch Pro');
      expect(names).toContain('HireMatch Enterprise');
      expect(names).toContain('HireMatch Agency');
    }, 15000);

    skipIfNoKey('should verify Pro price exists and is $99/mo', async () => {
      const stripe = getStripeClient();
      const priceId = process.env.STRIPE_PRICE_PRO;
      if (!priceId) return;

      const price = await stripe.prices.retrieve(priceId);
      expect(price.unit_amount).toBe(9900); // cents
      expect(price.currency).toBe('usd');
      expect(price.recurring?.interval).toBe('month');
      expect(price.active).toBe(true);
    }, 15000);

    skipIfNoKey('should verify Enterprise price exists and is $499/mo', async () => {
      const stripe = getStripeClient();
      const priceId = process.env.STRIPE_PRICE_ENTERPRISE;
      if (!priceId) return;

      const price = await stripe.prices.retrieve(priceId);
      expect(price.unit_amount).toBe(49900);
      expect(price.currency).toBe('usd');
      expect(price.recurring?.interval).toBe('month');
    }, 15000);

    skipIfNoKey('should verify Agency price exists and is $999/mo', async () => {
      const stripe = getStripeClient();
      const priceId = process.env.STRIPE_PRICE_AGENCY;
      if (!priceId) return;

      const price = await stripe.prices.retrieve(priceId);
      expect(price.unit_amount).toBe(99900);
      expect(price.currency).toBe('usd');
      expect(price.recurring?.interval).toBe('month');
    }, 15000);

    skipIfNoKey('should create and delete a test customer', async () => {
      const stripe = getStripeClient();
      const customer = await stripe.customers.create({
        email: 'test-integration@hirematch.com',
        name: 'Integration Test Corp',
        metadata: { test: 'true' },
      });

      expect(customer.id).toMatch(/^cus_/);
      expect(customer.email).toBe('test-integration@hirematch.com');

      // Clean up
      const deleted = await stripe.customers.del(customer.id);
      expect(deleted.deleted).toBe(true);
    }, 15000);

    skipIfNoKey('should create a checkout session for Pro tier', async () => {
      const stripe = getStripeClient();
      const priceId = process.env.STRIPE_PRICE_PRO;
      if (!priceId) return;

      // Create temp customer
      const customer = await stripe.customers.create({
        email: 'checkout-test@hirematch.com',
        metadata: { test: 'true' },
      });

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: 'https://hirematch.com/success',
        cancel_url: 'https://hirematch.com/cancel',
        metadata: { recruiter_id: 'test-rec-123', tier: 'pro' },
      });

      expect(session.id).toMatch(/^cs_test_/);
      expect(session.url).toBeTruthy();
      expect(session.mode).toBe('subscription');
      expect(session.metadata?.tier).toBe('pro');

      // Clean up
      await stripe.customers.del(customer.id);
    }, 20000);
  });
});
