import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';

/* ─── Enums ─── */

export const visaCountryEnum = pgEnum('visa_country', [
  'US', 'CA', 'GB', 'CH', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
  'AT', 'PT', 'IE', 'SE', 'DK', 'NO', 'FI', 'PL', 'CZ', 'RO',
  'IN', 'MX', 'BR', 'AR', 'CN', 'JP', 'KR', 'VN', 'PH',
]);

/* ─── JSONB types ─── */

export interface ProcessStep {
  order: number;
  title: string;
  description: string;
  duration_days?: number;
  required_documents?: string[];
  notes?: string;
}

export interface ChangedFields {
  [field: string]: { old: unknown; new: unknown };
}

/* ─── Tables ─── */

export const visaRules = pgTable('visa_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  country: visaCountryEnum('country').notNull(),
  origin_country: visaCountryEnum('origin_country'),
  visa_type: text('visa_type').notNull(),
  title: text('title'),
  description: text('description'),
  sponsorship_required: boolean('sponsorship_required').notNull().default(false),
  process_steps: jsonb('process_steps').$type<ProcessStep[]>().default([]),
  timeline_days_min: integer('timeline_days_min'),
  timeline_days_max: integer('timeline_days_max'),
  cost_usd: integer('cost_usd'),
  fee_currency: text('fee_currency').default('USD'),
  required_documents: text('required_documents').array().notNull().default(sql`'{}'::text[]`),
  eligible_occupations: text('eligible_occupations').array().notNull().default(sql`'{}'::text[]`),
  min_salary: integer('min_salary'),
  min_experience_years: integer('min_experience_years'),
  education_requirements: text('education_requirements'),
  quota_limited: boolean('quota_limited').notNull().default(false),
  annual_quota: integer('annual_quota'),
  notes: text('notes'),
  source_url: text('source_url'),
  effective_date: timestamp('effective_date', { withTimezone: true }),
  superseded_at: timestamp('superseded_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('visa_org_idx').on(table.org_id),
  index('visa_country_idx').on(table.country),
  index('visa_type_idx').on(table.visa_type),
  index('visa_country_type_idx').on(table.country, table.visa_type),
  index('visa_origin_idx').on(table.origin_country),
  index('visa_occupations_gin_idx').using('gin', table.eligible_occupations),
]);

export const visaRuleHistory = pgTable('visa_rule_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  visa_rule_id: uuid('visa_rule_id').notNull().references(() => visaRules.id, { onDelete: 'cascade' }),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  changed_fields: jsonb('changed_fields').$type<ChangedFields>().notNull(),
  previous_values: jsonb('previous_values').$type<Record<string, unknown>>().notNull(),
  changed_at: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  change_source: text('change_source'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('visa_history_rule_idx').on(table.visa_rule_id),
  index('visa_history_org_idx').on(table.org_id),
]);

/* ─── Type exports ─── */

export type VisaRule = InferSelectModel<typeof visaRules>;
export type NewVisaRule = InferInsertModel<typeof visaRules>;
export type VisaRuleHistoryEntry = InferSelectModel<typeof visaRuleHistory>;
export type NewVisaRuleHistoryEntry = InferInsertModel<typeof visaRuleHistory>;
