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
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';

/* ─── pgvector custom type ─── */

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    return String(value)
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(Number);
  },
});

/* ─── Enums ─── */

export const jobTypeEnum = pgEnum('job_type', [
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
]);

export const workModeEnum = pgEnum('work_mode', [
  'remote',
  'hybrid',
  'onsite',
]);

/* ─── Table ─── */

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  company: text('company'),
  requirements: text('requirements').array().notNull().default(sql`'{}'::text[]`),
  nice_to_haves: text('nice_to_haves').array().notNull().default(sql`'{}'::text[]`),
  skills_required: text('skills_required').array().notNull().default(sql`'{}'::text[]`),
  job_type: jobTypeEnum('job_type').default('full-time'),
  work_mode: workModeEnum('work_mode').default('onsite'),
  seniority: text('seniority'),
  country: text('country'),
  city: text('city'),
  salary_min: integer('salary_min'),
  salary_max: integer('salary_max'),
  salary_currency: text('salary_currency').default('USD'),
  visa_sponsorship: boolean('visa_sponsorship').notNull().default(false),
  experience_min: integer('experience_min'),
  experience_max: integer('experience_max'),
  education_level: text('education_level'),
  industry: text('industry'),
  match_tags: text('match_tags').array().notNull().default(sql`'{}'::text[]`),
  is_active: boolean('is_active').notNull().default(true),
  is_featured: boolean('is_featured').notNull().default(false),
  views_count: integer('views_count').notNull().default(0),
  applications_count: integer('applications_count').notNull().default(0),
  remote_ok: boolean('remote_ok').notNull().default(false),
  raw_text: text('raw_text'),
  embedding: vector('embedding'),
  source_url: text('source_url'),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('job_org_idx').on(table.org_id),
  index('job_country_idx').on(table.country),
  index('job_company_idx').on(table.company),
  index('job_requirements_gin_idx').using('gin', table.requirements),
  index('job_skills_gin_idx').using('gin', table.skills_required),
  index('job_match_tags_gin_idx').using('gin', table.match_tags),
  index('job_active_idx').on(table.is_active),
  index('job_type_idx').on(table.job_type),
]);

/* ─── Type exports ─── */

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
