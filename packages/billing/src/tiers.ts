/** Tier definitions with limits and pricing */
export interface TierConfig {
  id: string;
  name: string;
  stripePriceId: string | null;
  monthlyPriceCents: number;
  limits: {
    apiCallsPerMonth: number;
    seats: number;
    sources: number;
    jobs: number;
    candidateViews: number;
    webhooks: boolean;
    customBranding: boolean;
    atsIntegration: boolean;
    ssoEnabled: boolean;
    prioritySupport: boolean;
    dedicatedAccount: boolean;
  };
}

export const TIERS: Record<string, TierConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    stripePriceId: process.env["STRIPE_PRICE_STARTER"] ?? null,
    monthlyPriceCents: 9900, // $99/mo
    limits: {
      apiCallsPerMonth: 10_000,
      seats: 2,
      sources: 5,
      jobs: 25,
      candidateViews: 500,
      webhooks: true,
      customBranding: false,
      atsIntegration: false,
      ssoEnabled: false,
      prioritySupport: false,
      dedicatedAccount: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    stripePriceId: process.env["STRIPE_PRICE_PRO"] ?? null,
    monthlyPriceCents: 49900, // $499/mo
    limits: {
      apiCallsPerMonth: 100_000,
      seats: 10,
      sources: Infinity,
      jobs: 100,
      candidateViews: 5_000,
      webhooks: true,
      customBranding: true,
      atsIntegration: true,
      ssoEnabled: false,
      prioritySupport: false,
      dedicatedAccount: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    stripePriceId: process.env["STRIPE_PRICE_ENTERPRISE"] ?? null,
    monthlyPriceCents: 99900, // $999/mo
    limits: {
      apiCallsPerMonth: Infinity,
      seats: Infinity,
      sources: Infinity,
      jobs: Infinity,
      candidateViews: Infinity,
      webhooks: true,
      customBranding: true,
      atsIntegration: true,
      ssoEnabled: true,
      prioritySupport: true,
      dedicatedAccount: true,
    },
  },
};

/**
 * Get a tier config by ID.
 */
export function getTier(tierId: string): TierConfig | null {
  return TIERS[tierId] ?? null;
}

/**
 * Check if a feature is available for a given tier.
 */
export function hasFeature(
  tierId: string,
  feature: keyof TierConfig["limits"]
): boolean {
  const tier = getTier(tierId);
  if (!tier) return false;
  const value = tier.limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

/**
 * Check if a numeric limit is exceeded.
 */
export function isWithinLimit(
  tierId: string,
  resource: keyof TierConfig["limits"],
  current: number
): boolean {
  const tier = getTier(tierId);
  if (!tier) return false;
  const limit = tier.limits[resource];
  if (typeof limit !== "number") return false;
  return current < limit;
}

/**
 * Get the numeric limit for a resource, or Infinity if boolean/unlimited.
 */
export function getLimit(
  tierId: string,
  resource: keyof TierConfig["limits"]
): number {
  const tier = getTier(tierId);
  if (!tier) return 0;
  const value = tier.limits[resource];
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? Infinity : 0;
  return 0;
}

/**
 * Get a sorted list of tiers by price ascending.
 */
export function getTiersAscending(): TierConfig[] {
  return Object.values(TIERS).sort(
    (a, b) => a.monthlyPriceCents - b.monthlyPriceCents
  );
}
