import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
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

export const remotePreferenceEnum = pgEnum('remote_preference', [
  'remote',
  'hybrid',
  'onsite',
  'any',
]);

/* ─── JSONB types ─── */

export interface Education {
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year?: number;
  country?: string;
}

export interface WorkExperience {
  company: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  country?: string;
  skills: string[];
}

/* ─── Table ─── */

export const candidates = pgTable('candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  photo_url: text('photo_url'),
  headline: text('headline'),
  bio: text('bio'),
  skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
  location: text('location'),
  country: text('country'),
  city: text('city'),
  remote_preference: remotePreferenceEnum('remote_preference').default('any'),
  visa_status: text('visa_status'),
  experience_years: integer('experience_years'),
  education: jsonb('education').$type<Education[]>().default([]),
  work_history: jsonb('work_history').$type<WorkExperience[]>().default([]),
  certifications: text('certifications').array().notNull().default(sql`'{}'::text[]`),
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  salary_expectation_min: integer('salary_expectation_min'),
  salary_expectation_max: integer('salary_expectation_max'),
  salary_currency: text('salary_currency').default('USD'),
  quiz_answers: jsonb('quiz_answers').$type<Record<string, unknown>>(),
  match_tags: text('match_tags').array().notNull().default(sql`'{}'::text[]`),
  cv_url: text('cv_url'),
  cv_parsed_at: timestamp('cv_parsed_at', { withTimezone: true }),
  is_public: boolean('is_public').notNull().default(false),
  available_now: boolean('available_now').notNull().default(false),
  notice_period: text('notice_period'),
  available_from: date('available_from'),
  open_to_relocation: boolean('open_to_relocation').notNull().default(false),
  raw_text: text('raw_text'),
  embedding: vector('embedding'),
  source_url: text('source_url'),
  source_platform: text('source_platform'),
  gdpr_public_source: boolean('gdpr_public_source').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('candidate_org_idx').on(table.org_id),
  index('candidate_country_idx').on(table.country),
  index('candidate_source_idx').on(table.source_url),
  index('candidate_skills_gin_idx').using('gin', table.skills),
  index('candidate_languages_gin_idx').using('gin', table.languages),
  index('candidate_match_tags_gin_idx').using('gin', table.match_tags),
  index('candidate_email_idx').on(table.email),
]);

/* ─── Type exports ─── */

export type Candidate = InferSelectModel<typeof candidates>;
export type NewCandidate = InferInsertModel<typeof candidates>;
