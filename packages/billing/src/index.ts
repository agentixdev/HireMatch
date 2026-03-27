// Stripe client
export {
  getStripeClient,
  verifyWebhookEvent,
  resetStripeClient,
} from "./stripe-client.js";
export type { StripeConfig } from "./stripe-client.js";

// Tiers
export type { TierConfig } from "./tiers.js";
export {
  TIERS,
  getTier,
  hasFeature,
  isWithinLimit,
  getLimit,
  getTiersAscending,
} from "./tiers.js";

// Usage
export type { UsageRecord, UsageCheckResult } from "./usage.js";
export {
  getUsageRecord,
  incrementUsage,
  setUsageGauge,
  checkUsage,
  checkAllUsage,
  resetUsageStore,
} from "./usage.js";

// Subscriptions
export type { SubscriptionInfo } from "./subscriptions.js";
export {
  createCustomer,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  cancelSubscriptionImmediately,
  resumeSubscription,
  getSubscription,
  listSubscriptions,
  createPortalSession,
} from "./subscriptions.js";

// Meters
export {
  reportUsageEvent,
  reportApiUsage,
  reportCandidateViewUsage,
  reportScrapeUsage,
  getUsageSummary,
} from "./meters.js";

// Middleware
export type { BillingContext, BillingCheckResult } from "./middleware.js";
export {
  requireWithinApiLimits,
  requireWithinViewLimits,
  requireWithinLimits,
  createBillingMiddleware,
} from "./middleware.js";
