import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';

/* ─── Tables ─── */

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret_hash: text('secret_hash').notNull(),
  events: text('events').array().notNull().default(sql`'{}'::text[]`),
  is_active: boolean('is_active').notNull().default(true),
  failure_count: integer('failure_count').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('webhook_org_idx').on(table.org_id),
  index('webhook_active_idx').on(table.is_active),
]);

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  endpoint_id: uuid('endpoint_id').notNull().references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  response_status: integer('response_status'),
  response_body: text('response_body'),
  attempt_count: integer('attempt_count').notNull().default(0),
  next_retry_at: timestamp('next_retry_at', { withTimezone: true }),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('delivery_endpoint_idx').on(table.endpoint_id),
  index('delivery_org_idx').on(table.org_id),
  index('delivery_event_idx').on(table.event_type),
  index('delivery_retry_idx').on(table.next_retry_at),
]);

/* ─── Type exports ─── */

export type WebhookEndpoint = InferSelectModel<typeof webhookEndpoints>;
export type NewWebhookEndpoint = InferInsertModel<typeof webhookEndpoints>;
export type WebhookDelivery = InferSelectModel<typeof webhookDeliveries>;
export type NewWebhookDelivery = InferInsertModel<typeof webhookDeliveries>;
