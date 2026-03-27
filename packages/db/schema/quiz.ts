import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { organisations } from './auth';
import { jobs } from './jobs';

/* ─── Enums ─── */

export const quizCategoryEnum = pgEnum('quiz_category', [
  'work_style',
  'culture',
  'skills',
  'values',
  'growth',
]);

/* ─── JSONB types ─── */

export interface QuizOption {
  value: string;
  label: string;
  tags: string[];
}

export interface QuizResultCandidate {
  candidate_id: string;
  score: number;
  breakdown: Record<string, number>;
  explanation: string;
}

/* ─── Tables ─── */

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  category: quizCategoryEnum('category').notNull(),
  question: text('question').notNull(),
  options: jsonb('options').$type<QuizOption[]>().default([]),
  weight: integer('weight').notNull().default(1),
  sort_order: integer('sort_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('quiz_org_idx').on(table.org_id),
  index('quiz_category_idx').on(table.category),
  index('quiz_active_idx').on(table.is_active),
]);

export const quizResults = pgTable('quiz_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull(),
  job_id: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  quiz_answers: jsonb('quiz_answers').$type<Record<string, unknown>>().default({}),
  candidates: jsonb('candidates').$type<QuizResultCandidate[]>().default([]),
  total_scanned: integer('total_scanned').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('quiz_result_org_idx').on(table.org_id),
  index('quiz_result_user_idx').on(table.user_id),
  index('quiz_result_created_idx').on(table.created_at),
]);

/* ─── Type exports ─── */

export type QuizQuestion = InferSelectModel<typeof quizQuestions>;
export type NewQuizQuestion = InferInsertModel<typeof quizQuestions>;
export type QuizResult = InferSelectModel<typeof quizResults>;
export type NewQuizResult = InferInsertModel<typeof quizResults>;
