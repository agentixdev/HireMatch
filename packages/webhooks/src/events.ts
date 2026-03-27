import { z } from "zod";

/** All supported webhook event types */
export const WEBHOOK_EVENT_TYPES = [
  "candidate.created",
  "candidate.updated",
  "candidate.deleted",
  "candidate.cv_parsed",
  "job.created",
  "job.updated",
  "job.closed",
  "job.deleted",
  "match.found",
  "match.score_updated",
  "match.rejected",
  "application.submitted",
  "application.status_changed",
  "visa.check_completed",
  "visa.rules_updated",
  "scrape.completed",
  "scrape.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "usage.limit_approaching",
  "usage.limit_exceeded",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Base event envelope */
export const WebhookEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(WEBHOOK_EVENT_TYPES),
  version: z.literal("1.0"),
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
  metadata: z.object({
    orgId: z.string(),
    triggeredBy: z.string(),
    correlationId: z.string(),
  }),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/** Event-specific payload schemas */
export const CandidateEventDataSchema = z.object({
  candidateId: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  country: z.string().optional(),
  changes: z.record(z.unknown()).optional(),
});

export const JobEventDataSchema = z.object({
  jobId: z.string(),
  title: z.string().optional(),
  status: z.string().optional(),
  country: z.string().optional(),
  changes: z.record(z.unknown()).optional(),
});

export const MatchEventDataSchema = z.object({
  matchId: z.string(),
  candidateId: z.string(),
  jobId: z.string(),
  score: z.number().min(0).max(100).optional(),
  reason: z.string().optional(),
});

export const ApplicationEventDataSchema = z.object({
  applicationId: z.string(),
  candidateId: z.string(),
  jobId: z.string(),
  previousStatus: z.string().optional(),
  newStatus: z.string(),
});

export const VisaEventDataSchema = z.object({
  country: z.string(),
  visaType: z.string().optional(),
  candidateId: z.string().optional(),
  eligible: z.boolean().optional(),
  rulesVersion: z.string().optional(),
});

export const ScrapeEventDataSchema = z.object({
  sourceId: z.string(),
  url: z.string().url(),
  success: z.boolean(),
  recordsFound: z.number().optional(),
  error: z.string().optional(),
});

/**
 * Build a webhook event with proper structure.
 */
export function buildWebhookEvent(
  type: WebhookEventType,
  data: Record<string, unknown>,
  metadata: { orgId: string; triggeredBy: string; correlationId?: string }
): WebhookEvent {
  return {
    id: crypto.randomUUID(),
    type,
    version: "1.0",
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      orgId: metadata.orgId,
      triggeredBy: metadata.triggeredBy,
      correlationId: metadata.correlationId ?? crypto.randomUUID(),
    },
  };
}
