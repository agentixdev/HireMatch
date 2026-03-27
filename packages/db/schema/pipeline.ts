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
import { organisations } from './auth';

/* ─── Enums ─── */

export const scrapeTypeEnum = pgEnum('scrape_type', [
  'playwright',
  'crawl4ai',
  'computer_use',
]);

export const scrapePriorityEnum = pgEnum('scrape_priority', [
  'high',
  'standard',
  'low',
]);

export const scrapeStatusEnum = pgEnum('scrape_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'paused',
]);

export const embeddingStatusEnum = pgEnum('embedding_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const recordTypeEnum = pgEnum('record_type', [
  'candidate',
  'job',
  'visa_rule',
]);

/* ─── Tables ─── */

export const scrapeJobs = pgTable('scrape_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  source_url: text('source_url').notNull(),
  scrape_type: scrapeTypeEnum('scrape_type').notNull(),
  schedule_cron: text('schedule_cron'),
  priority: scrapePriorityEnum('priority').notNull().default('standard'),
  status: scrapeStatusEnum('status').notNull().default('pending'),
  retry_count: integer('retry_count').notNull().default(0),
  last_run_at: timestamp('last_run_at', { withTimezone: true }),
  next_run_at: timestamp('next_run_at', { withTimezone: true }),
  bright_data_pool: text('bright_data_pool'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('scrape_org_idx').on(table.org_id),
  index('scrape_status_idx').on(table.status),
  index('scrape_next_run_idx').on(table.next_run_at),
  index('scrape_priority_idx').on(table.priority),
]);

export const scrapeLog = pgTable('scrape_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  scrape_job_id: uuid('scrape_job_id').notNull().references(() => scrapeJobs.id, { onDelete: 'cascade' }),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  started_at: timestamp('started_at', { withTimezone: true }).notNull(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  content_hash: text('content_hash'),
  records_upserted: integer('records_upserted').default(0),
  error_message: text('error_message'),
  minio_archive_key: text('minio_archive_key'),
  proxy_ip_region: text('proxy_ip_region'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('scrape_log_job_idx').on(table.scrape_job_id),
  index('scrape_log_org_idx').on(table.org_id),
  index('scrape_log_hash_idx').on(table.content_hash),
]);

export const embeddingQueue = pgTable('embedding_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  record_type: recordTypeEnum('record_type').notNull(),
  record_id: uuid('record_id').notNull(),
  org_id: uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
  status: embeddingStatusEnum('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  last_error: text('last_error'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processed_at: timestamp('processed_at', { withTimezone: true }),
}, (table) => [
  index('embed_org_idx').on(table.org_id),
  index('embed_status_idx').on(table.status),
  index('embed_record_idx').on(table.record_type, table.record_id),
]);

/* ─── Type exports ─── */

export type ScrapeJob = InferSelectModel<typeof scrapeJobs>;
export type NewScrapeJob = InferInsertModel<typeof scrapeJobs>;
export type ScrapeLogEntry = InferSelectModel<typeof scrapeLog>;
export type NewScrapeLogEntry = InferInsertModel<typeof scrapeLog>;
export type EmbeddingQueueItem = InferSelectModel<typeof embeddingQueue>;
export type NewEmbeddingQueueItem = InferInsertModel<typeof embeddingQueue>;
