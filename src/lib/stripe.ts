import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    _stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Pricing tiers configuration
// ---------------------------------------------------------------------------

export type BillingTier = 'free' | 'pro' | 'enterprise' | 'agency';

export interface TierConfig {
  name: string;
  price: number;           // monthly USD
  stripePriceId: string;   // set via env vars
  jobLimit: number;        // max active jobs (Infinity = unlimited)
  viewLimit: number;       // max candidate views per month
  features: string[];
}

export const TIER_CONFIG: Record<BillingTier, TierConfig> = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: '',
    jobLimit: 3,
    viewLimit: 10,
    features: [
      '3 active job postings',
      '10 candidate views / month',
      'Basic search filters',
      'Email support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    jobLimit: Infinity,
    viewLimit: Infinity,
    features: [
      'Unlimited job postings',
      'Unlimited candidate views',
      'Advanced AI matching',
      'Priority support',
      'Custom branding',
      'Analytics dashboard',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 499,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    jobLimit: Infinity,
    viewLimit: Infinity,
    features: [
      'Everything in Pro',
      'API access',
      'ATS integrations',
      'Up to 10 team seats',
      'Dedicated account manager',
      'Custom reporting',
      'SSO / SAML',
    ],
  },
  agency: {
    name: 'Agency',
    price: 999,
    stripePriceId: process.env.STRIPE_PRICE_AGENCY || '',
    jobLimit: Infinity,
    viewLimit: Infinity,
    features: [
      'Everything in Enterprise',
      'Multi-client management',
      'Unlimited team seats',
      'White-label options',
      'Bulk job posting',
      'Revenue analytics',
      'Priority API rate limits',
    ],
  },
};

/**
 * Map a Stripe Price ID back to a billing tier.
 */
export function tierFromPriceId(priceId: string): BillingTier {
  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (config.stripePriceId && config.stripePriceId === priceId) {
      return tier as BillingTier;
    }
  }
  return 'free';
}

/**
 * Check if a recruiter can post a new job given their tier and current active job count.
 */
export function canPostJob(tier: BillingTier, activeJobCount: number): boolean {
  const limit = TIER_CONFIG[tier].jobLimit;
  return activeJobCount < limit;
}

/**
 * Check if a recruiter can view more candidates this month.
 */
export function canViewCandidate(tier: BillingTier, monthlyViewsUsed: number): boolean {
  const limit = TIER_CONFIG[tier].viewLimit;
  return monthlyViewsUsed < limit;
}
