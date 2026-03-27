import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';
import { candidates } from './candidates';
import { jobs } from './jobs';

/* ─── Enums ─── */

export const applicationStatusEnum = pgEnum('application_status', [
  'applied',
  'reviewed',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'offer_accepted',
  'hired',
  'rejected',
  'withdrawn',
]);

/* ─── JSONB types ─── */

export interface StatusChange {
  status: string;
  changed_at: string;
  changed_by?: string;
  note?: string;
}

/* ─── Table ─── */

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  candidate_id: uuid('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  job_id: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').notNull().default('applied'),
  cover_letter: text('cover_letter'),
  match_score: integer('match_score'),
  match_explanation: text('match_explanation'),
  notes: text('notes'),
  status_history: jsonb('status_history').$type<StatusChange[]>().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('app_candidate_job_unique').on(table.org_id, table.candidate_id, table.job_id),
  index('app_org_idx').on(table.org_id),
  index('app_candidate_idx').on(table.candidate_id),
  index('app_job_idx').on(table.job_id),
  index('app_status_idx').on(table.status),
]);

/* ─── Type exports ─── */

export type Application = InferSelectModel<typeof applications>;
export type NewApplication = InferInsertModel<typeof applications>;
