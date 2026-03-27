import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations, planTierEnum } from './auth';
import { apiKeys } from './auth';

/* ─── Enums ─── */

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'trialing',
  'paused',
]);

/* ─── Tables ─── */

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  stripe_subscription_id: text('stripe_subscription_id').notNull(),
  plan_tier: planTierEnum('plan_tier').notNull(),
  api_calls_limit: integer('api_calls_limit').notNull(),
  seats_limit: integer('seats_limit').notNull(),
  scrape_sources_limit: integer('scrape_sources_limit'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  current_period_end: timestamp('current_period_end', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sub_org_idx').on(table.org_id),
  index('sub_stripe_idx').on(table.stripe_subscription_id),
  index('sub_status_idx').on(table.status),
]);

export const apiUsage = pgTable('api_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  api_key_id: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  response_status: integer('response_status'),
  latency_ms: integer('latency_ms'),
  tokens_used: integer('tokens_used').default(0),
  stripe_meter_event_id: text('stripe_meter_event_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('usage_org_idx').on(table.org_id),
  index('usage_key_idx').on(table.api_key_id),
  index('usage_created_idx').on(table.created_at),
  index('usage_endpoint_idx').on(table.endpoint),
]);

/* ─── Type exports ─── */

export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type ApiUsageEntry = InferSelectModel<typeof apiUsage>;
export type NewApiUsageEntry = InferInsertModel<typeof apiUsage>;
