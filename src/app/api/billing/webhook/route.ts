import { NextResponse } from 'next/server';
import { getStripe, tierFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';
import type Stripe from 'stripe';

const log = createLogger('stripe-webhook');

export const maxDuration = 60;

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = 'force-dynamic';

// --- Idempotency: in-memory Set to prevent double-processing ---
const processedEvents = new Map<string, number>(); // eventId -> timestamp
const EVENT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let lastCleanup = Date.now();

function cleanupProcessedEvents() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - CLEANUP_INTERVAL_MS;
  for (const [id, ts] of processedEvents) {
    if (ts < cutoff) {
      processedEvents.delete(id);
    }
  }
}

async function getRawBody(request: Request): Promise<Buffer> {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Safely extract customer ID string from Stripe objects */
function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string {
  if (!customer) return '';
  if (typeof customer === 'string') return customer;
  return customer.id;
}

export async function POST(request: Request) {
  const rawBody = await getRawBody(request);
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    log.error('Signature verification failed', { error: String(err) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- Idempotency check: skip already-processed events ---
  cleanupProcessedEvents();

  if (processedEvents.has(event.id)) {
    log.info('Duplicate event, skipping', { eventId: event.id });
    return NextResponse.json({ received: true, duplicate: true });
  }

  // --- Event age validation: reject events older than 5 minutes ---
  const eventAgeMs = Date.now() - event.created * 1000;
  if (eventAgeMs > EVENT_MAX_AGE_MS) {
    log.warn('Stale event, rejecting', { eventId: event.id, ageSeconds: Math.round(eventAgeMs / 1000) });
    return NextResponse.json({ error: 'Event too old' }, { status: 400 });
  }

  // Mark event as processed
  processedEvents.set(event.id, Date.now());

  const admin = await createServiceClient();

  try {
    switch (event.type) {
      // ---------------------------------------------------------------
      // Checkout completed — new subscription
      // ---------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const recruiterId = session.metadata?.recruiter_id;
        const tier = session.metadata?.tier;

        if (!recruiterId) {
          log.error('No recruiter_id in session metadata');
          break;
        }

        // Expand the subscription to get period end
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        if (!subscriptionId) {
          log.error('No subscription ID in checkout session');
          break;
        }
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ['items.data'],
        });

        // Support both clover (subscription-level) and dahlia (item-level) API versions
        const periodEnd = subscription.items.data[0]?.current_period_end;

        await admin
          .from('recruiters')
          .update({
            tier: tier || 'pro',
            stripe_customer_id: customerId(session.customer),
            stripe_subscription_id: subscriptionId,
            billing_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recruiterId);

        log.info('Checkout completed', { recruiterId, tier: tier || 'pro' });
        break;
      }

      // ---------------------------------------------------------------
      // Subscription updated — plan change, renewal
      // ---------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const recruiterId = subscription.metadata?.recruiter_id;
        const subPeriodEnd = subscription.items.data[0]?.current_period_end;
        const billingEnd = subPeriodEnd ? new Date(subPeriodEnd * 1000).toISOString() : null;

        if (!recruiterId) {
          // Try to find recruiter by customer ID
          const custId = customerId(subscription.customer);
          const { data: rec } = await admin
            .from('recruiters')
            .select('id')
            .eq('stripe_customer_id', custId)
            .single();

          if (!rec) {
            log.error('Cannot find recruiter for subscription update', { customerId: custId });
            break;
          }

          const priceId = subscription.items.data[0]?.price?.id || '';
          const newTier = tierFromPriceId(priceId);

          await admin
            .from('recruiters')
            .update({
              tier: newTier,
              stripe_subscription_id: subscription.id,
              billing_period_end: billingEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rec.id);

          log.info('Subscription updated', { recruiterId: rec.id, tier: newTier });
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id || '';
        const newTier = tierFromPriceId(priceId);

        await admin
          .from('recruiters')
          .update({
            tier: newTier,
            stripe_subscription_id: subscription.id,
            billing_period_end: billingEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recruiterId);

        log.info('Subscription updated', { recruiterId, tier: newTier });
        break;
      }

      // ---------------------------------------------------------------
      // Subscription deleted — downgrade to free
      // ---------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const custId = customerId(subscription.customer);

        // Find recruiter by customer ID
        const { data: rec } = await admin
          .from('recruiters')
          .select('id')
          .eq('stripe_customer_id', custId)
          .single();

        if (rec) {
          await admin
            .from('recruiters')
            .update({
              tier: 'free',
              stripe_subscription_id: null,
              billing_period_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rec.id);

          log.info('Subscription deleted, downgraded to free', { recruiterId: rec.id });
        }
        break;
      }

      // ---------------------------------------------------------------
      // Invoice payment failed
      // ---------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const custId = customerId(invoice.customer);

        const { data: rec } = await admin
          .from('recruiters')
          .select('id, user_id')
          .eq('stripe_customer_id', custId)
          .single();

        if (rec) {
          log.warn('Payment failed', { recruiterId: rec.id, invoiceId: invoice.id });
        }
        break;
      }

      default:
        log.info('Unhandled event type', { type: event.type });
    }
  } catch (error) {
    log.error(`Error handling ${event.type}`, { error: String(error) });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
