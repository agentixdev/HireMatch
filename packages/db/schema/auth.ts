import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

/* ─── Enums ─── */

export const planTierEnum = pgEnum('plan_tier', [
  'starter',
  'pro',
  'enterprise',
]);

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'member',
]);

export const dataResidencyEnum = pgEnum('data_residency', [
  'eu',
  'us',
  'ch',
  'any',
]);

export const auditOutcomeEnum = pgEnum('audit_outcome', [
  'success',
  'failure',
  'denied',
]);

/* ─── White-label config type ─── */

export interface WhiteLabelConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  custom_domain?: string;
  favicon_url?: string;
}

/* ─── Audit metadata type ─── */

export interface AuditMetadata {
  [key: string]: unknown;
}

/* ─── Tables ─── */

export const organisations = pgTable('organisations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  plan_tier: planTierEnum('plan_tier').notNull().default('starter'),
  stripe_customer_id: text('stripe_customer_id'),
  white_label_config: jsonb('white_label_config').$type<WhiteLabelConfig>().default({}),
  data_residency: dataResidencyEnum('data_residency').notNull().default('any'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('org_stripe_idx').on(table.stripe_customer_id),
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  hashed_password: text('hashed_password'),
  mfa_secret: text('mfa_secret'),
  sso_provider: text('sso_provider'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_org_idx').on(table.org_id),
  index('user_email_idx').on(table.email),
]);

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  key_hash: text('key_hash').notNull(),
  name: text('name').notNull(),
  scopes: text('scopes').array().notNull().default(sql`'{}'::text[]`),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  revoked: boolean('revoked').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('api_key_org_idx').on(table.org_id),
  index('api_key_hash_idx').on(table.key_hash),
]);

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull(),
  ip: text('ip'),
  user_agent: text('user_agent'),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('session_user_idx').on(table.user_id),
  index('session_token_idx').on(table.token_hash),
]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource'),
  ip: text('ip'),
  user_agent: text('user_agent'),
  outcome: auditOutcomeEnum('outcome').notNull().default('success'),
  metadata: jsonb('metadata').$type<AuditMetadata>().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_org_idx').on(table.org_id),
  index('audit_user_idx').on(table.user_id),
  index('audit_action_idx').on(table.action),
  index('audit_created_idx').on(table.created_at),
]);

/* ─── Type exports ─── */

export type Organisation = InferSelectModel<typeof organisations>;
export type NewOrganisation = InferInsertModel<typeof organisations>;
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type ApiKey = InferSelectModel<typeof apiKeys>;
export type NewApiKey = InferInsertModel<typeof apiKeys>;
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type AuditLogEntry = InferSelectModel<typeof auditLog>;
export type NewAuditLogEntry = InferInsertModel<typeof auditLog>;
