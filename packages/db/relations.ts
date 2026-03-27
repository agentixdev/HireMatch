import { relations } from 'drizzle-orm';
import {
  organisations, users, apiKeys, sessions, auditLog,
  candidates, jobs, applications, matches,
  quizQuestions, quizResults,
  visaRules, visaRuleHistory,
  scrapeJobs, scrapeLog, embeddingQueue,
  webhookEndpoints, webhookDeliveries,
  subscriptions, apiUsage,
} from './schema';

/* ─── Organisations ─── */

export const organisationsRelations = relations(organisations, ({ many }) => ({
  users: many(users),
  apiKeys: many(apiKeys),
  sessions: many(sessions),
  auditLogs: many(auditLog),
  candidates: many(candidates),
  jobs: many(jobs),
  applications: many(applications),
  matches: many(matches),
  quizQuestions: many(quizQuestions),
  quizResults: many(quizResults),
  visaRules: many(visaRules),
  scrapeJobs: many(scrapeJobs),
  scrapeLogs: many(scrapeLog),
  embeddingQueue: many(embeddingQueue),
  webhookEndpoints: many(webhookEndpoints),
  webhookDeliveries: many(webhookDeliveries),
  subscriptions: many(subscriptions),
  apiUsage: many(apiUsage),
}));

/* ─── Users ─── */

export const usersRelations = relations(users, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [users.org_id],
    references: [organisations.id],
  }),
  sessions: many(sessions),
  auditLogs: many(auditLog),
}));

/* ─── API Keys ─── */

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [apiKeys.org_id],
    references: [organisations.id],
  }),
  apiUsage: many(apiUsage),
}));

/* ─── Sessions ─── */

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.user_id],
    references: [users.id],
  }),
  organisation: one(organisations, {
    fields: [sessions.org_id],
    references: [organisations.id],
  }),
}));

/* ─── Audit Log ─── */

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organisation: one(organisations, {
    fields: [auditLog.org_id],
    references: [organisations.id],
  }),
  user: one(users, {
    fields: [auditLog.user_id],
    references: [users.id],
  }),
}));

/* ─── Candidates ─── */

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [candidates.org_id],
    references: [organisations.id],
  }),
  applications: many(applications),
  matches: many(matches),
}));

/* ─── Jobs ─── */

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [jobs.org_id],
    references: [organisations.id],
  }),
  applications: many(applications),
  matches: many(matches),
  quizResults: many(quizResults),
}));

/* ─── Applications ─── */

export const applicationsRelations = relations(applications, ({ one }) => ({
  organisation: one(organisations, {
    fields: [applications.org_id],
    references: [organisations.id],
  }),
  candidate: one(candidates, {
    fields: [applications.candidate_id],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [applications.job_id],
    references: [jobs.id],
  }),
}));

/* ─── Matches ─── */

export const matchesRelations = relations(matches, ({ one }) => ({
  organisation: one(organisations, {
    fields: [matches.org_id],
    references: [organisations.id],
  }),
  candidate: one(candidates, {
    fields: [matches.candidate_id],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [matches.job_id],
    references: [jobs.id],
  }),
}));

/* ─── Quiz ─── */

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  organisation: one(organisations, {
    fields: [quizQuestions.org_id],
    references: [organisations.id],
  }),
}));

export const quizResultsRelations = relations(quizResults, ({ one }) => ({
  organisation: one(organisations, {
    fields: [quizResults.org_id],
    references: [organisations.id],
  }),
  job: one(jobs, {
    fields: [quizResults.job_id],
    references: [jobs.id],
  }),
}));

/* ─── Visa Rules ─── */

export const visaRulesRelations = relations(visaRules, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [visaRules.org_id],
    references: [organisations.id],
  }),
  history: many(visaRuleHistory),
}));

export const visaRuleHistoryRelations = relations(visaRuleHistory, ({ one }) => ({
  visaRule: one(visaRules, {
    fields: [visaRuleHistory.visa_rule_id],
    references: [visaRules.id],
  }),
  organisation: one(organisations, {
    fields: [visaRuleHistory.org_id],
    references: [organisations.id],
  }),
}));

/* ─── Scrape Jobs ─── */

export const scrapeJobsRelations = relations(scrapeJobs, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [scrapeJobs.org_id],
    references: [organisations.id],
  }),
  logs: many(scrapeLog),
}));

export const scrapeLogRelations = relations(scrapeLog, ({ one }) => ({
  scrapeJob: one(scrapeJobs, {
    fields: [scrapeLog.scrape_job_id],
    references: [scrapeJobs.id],
  }),
  organisation: one(organisations, {
    fields: [scrapeLog.org_id],
    references: [organisations.id],
  }),
}));

/* ─── Embedding Queue ─── */

export const embeddingQueueRelations = relations(embeddingQueue, ({ one }) => ({
  organisation: one(organisations, {
    fields: [embeddingQueue.org_id],
    references: [organisations.id],
  }),
}));

/* ─── Webhooks ─── */

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [webhookEndpoints.org_id],
    references: [organisations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpoint_id],
    references: [webhookEndpoints.id],
  }),
  organisation: one(organisations, {
    fields: [webhookDeliveries.org_id],
    references: [organisations.id],
  }),
}));

/* ─── Subscriptions ─── */

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organisation: one(organisations, {
    fields: [subscriptions.org_id],
    references: [organisations.id],
  }),
}));

/* ─── API Usage ─── */

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  organisation: one(organisations, {
    fields: [apiUsage.org_id],
    references: [organisations.id],
  }),
  apiKey: one(apiKeys, {
    fields: [apiUsage.api_key_id],
    references: [apiKeys.id],
  }),
}));
