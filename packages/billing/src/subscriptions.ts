import type Stripe from "stripe";
import { getStripeClient } from "./stripe-client.js";
import { getTier } from "./tiers.js";

export interface SubscriptionInfo {
  id: string;
  orgId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  tierId: string;
  status: Stripe.Subscription.Status;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

/**
 * Create a Stripe customer for an organization.
 */
export async function createCustomer(params: {
  orgId: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      orgId: params.orgId,
      ...params.metadata,
    },
  });
}

/**
 * Create a subscription for a customer.
 */
export async function createSubscription(params: {
  customerId: string;
  tierId: string;
  trialDays?: number;
}): Promise<Stripe.Subscription> {
  const tier = getTier(params.tierId);
  if (!tier || !tier.stripePriceId) {
    throw new Error(`Invalid tier or missing price ID: ${params.tierId}`);
  }

  const stripe = getStripeClient();
  return stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: tier.stripePriceId }],
    trial_period_days: params.trialDays,
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      tierId: params.tierId,
    },
  });
}

/**
 * Update a subscription's tier (upgrade/downgrade).
 */
export async function updateSubscription(
  subscriptionId: string,
  newTierId: string
): Promise<Stripe.Subscription> {
  const tier = getTier(newTierId);
  if (!tier || !tier.stripePriceId) {
    throw new Error(`Invalid tier or missing price ID: ${newTierId}`);
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;

  if (!itemId) {
    throw new Error("Subscription has no items");
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: tier.stripePriceId }],
    proration_behavior: "create_prorations",
    metadata: {
      tierId: newTierId,
    },
  });
}

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Immediately cancel a subscription.
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Resume a subscription that was set to cancel at period end.
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get a subscription by ID.
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * List all subscriptions for a customer.
 */
export async function listSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const stripe = getStripeClient();
  const result = await stripe.subscriptions.list({
    customer: customerId,
    limit: 10,
  });
  return result.data;
}

/**
 * Create a customer portal session for self-service billing management.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripeClient();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
