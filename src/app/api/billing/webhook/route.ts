import { NextResponse } from 'next/server';
import { getStripe, tierFromPriceId } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase-server';
import type Stripe from 'stripe';

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

export async function POST(request: Request) {
  const rawBody = await getRawBody(request);
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- Idempotency check: skip already-processed events ---
  cleanupProcessedEvents();

  if (processedEvents.has(event.id)) {
    console.log(`[stripe-webhook] Duplicate event ${event.id}, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // --- Event age validation: reject events older than 5 minutes ---
  const eventAgeMs = Date.now() - event.created * 1000;
  if (eventAgeMs > EVENT_MAX_AGE_MS) {
    console.warn(`[stripe-webhook] Stale event ${event.id} (age: ${(eventAgeMs / 1000).toFixed(0)}s), rejecting`);
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
          console.error('[stripe-webhook] No recruiter_id in session metadata');
          break;
        }

        // Expand the subscription to get period end
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error('[stripe-webhook] No subscription ID in checkout session');
          break;
        }
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
          expand: ['items.data'],
        });

        // Support both clover (subscription-level) and dahlia (item-level) API versions
        const periodEnd = (subscription as any).current_period_end ?? subscription.items.data[0]?.current_period_end;

        await admin
          .from('recruiters')
          .update({
            tier: tier || 'pro',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            billing_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recruiterId);

        console.log(`[stripe-webhook] Checkout completed: recruiter=${recruiterId} tier=${tier || 'pro'}`);
        break;
      }

      // ---------------------------------------------------------------
      // Subscription updated — plan change, renewal
      // ---------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const recruiterId = subscription.metadata?.recruiter_id;
        const subPeriodEnd = (subscription as any).current_period_end ?? subscription.items.data[0]?.current_period_end;
        const billingEnd = subPeriodEnd ? new Date(subPeriodEnd * 1000).toISOString() : null;

        if (!recruiterId) {
          // Try to find recruiter by customer ID
          const customerId = subscription.customer as string;
          const { data: rec } = await admin
            .from('recruiters')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (!rec) {
            console.error('[stripe-webhook] Cannot find recruiter for subscription update');
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

          console.log(`[stripe-webhook] Subscription updated: recruiter=${rec.id} tier=${newTier}`);
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

        console.log(`[stripe-webhook] Subscription updated: recruiter=${recruiterId} tier=${newTier}`);
        break;
      }

      // ---------------------------------------------------------------
      // Subscription deleted — downgrade to free
      // ---------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find recruiter by customer ID
        const { data: rec } = await admin
          .from('recruiters')
          .select('id')
          .eq('stripe_customer_id', customerId)
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

          console.log(`[stripe-webhook] Subscription deleted: recruiter=${rec.id} downgraded to free`);
        }
        break;
      }

      // ---------------------------------------------------------------
      // Invoice payment failed
      // ---------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: rec } = await admin
          .from('recruiters')
          .select('id, user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (rec) {
          // Log the payment failure. In production you'd also send an email notification.
          console.warn(`[stripe-webhook] Payment failed: recruiter=${rec.id} invoice=${invoice.id}`);

          // After multiple failures, Stripe will eventually cancel the subscription,
          // which triggers customer.subscription.deleted and downgrades to free.
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
