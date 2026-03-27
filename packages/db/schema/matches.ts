import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';
import { candidates } from './candidates';
import { jobs } from './jobs';

/* ─── JSONB types ─── */

export interface MatchBreakdown {
  skills_score: number;
  experience_score: number;
  culture_score: number;
  location_score: number;
  salary_score: number;
  visa_eligible?: boolean;
  sponsorship_required?: boolean;
  missing_skills?: string[];
}

/* ─── Table ─── */

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  candidate_id: uuid('candidate_id').notNull().references(() => candidates.id, { onDelete: 'cascade' }),
  job_id: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  breakdown: jsonb('breakdown').$type<MatchBreakdown>().default({
    skills_score: 0,
    experience_score: 0,
    culture_score: 0,
    location_score: 0,
    salary_score: 0,
  }),
  explanation: text('explanation'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('match_org_candidate_job_unique').on(table.org_id, table.candidate_id, table.job_id),
  index('match_org_idx').on(table.org_id),
  index('match_candidate_idx').on(table.candidate_id),
  index('match_job_idx').on(table.job_id),
  index('match_score_idx').on(table.score),
]);

/* ─── Type exports ─── */

export type Match = InferSelectModel<typeof matches>;
export type NewMatch = InferInsertModel<typeof matches>;
