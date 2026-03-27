import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export interface StripeConfig {
  secretKey: string;
  apiVersion?: string;
  maxRetries?: number;
  webhookSecret?: string;
}

/**
 * Create or retrieve the Stripe client singleton.
 */
export function getStripeClient(config?: StripeConfig): Stripe {
  if (stripeInstance) return stripeInstance;

  const secretKey = config?.secretKey ?? process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("Stripe secret key is required. Set STRIPE_SECRET_KEY or pass config.");
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    maxNetworkRetries: config?.maxRetries ?? 3,
    typescript: true,
  });

  return stripeInstance;
}

/**
 * Verify a Stripe webhook signature and parse the event.
 */
export function verifyWebhookEvent(
  body: string | Buffer,
  signature: string,
  webhookSecret?: string
): Stripe.Event {
  const secret = webhookSecret ?? process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) {
    throw new Error("Stripe webhook secret is required.");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Reset the singleton (for testing).
 */
export function resetStripeClient(): void {
  stripeInstance = null;
}
