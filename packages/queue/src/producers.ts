import type { JobsOptions } from "bullmq";
import { getQueue } from "./queues.js";
import { QUEUE_NAMES, type ScrapeJobPayload, type EmbedJobPayload, type WebhookDeliverPayload } from "./types.js";

/**
 * Enqueue a scrape job with the given priority level.
 */
export async function enqueueScrape(
  payload: ScrapeJobPayload,
  priority: "high" | "standard" | "low" = "standard",
  options?: Partial<JobsOptions>
): Promise<string> {
  const queueName =
    priority === "high"
      ? QUEUE_NAMES.SCRAPE_HIGH
      : priority === "low"
        ? QUEUE_NAMES.SCRAPE_LOW
        : QUEUE_NAMES.SCRAPE_STANDARD;

  const queue = getQueue(queueName);
  const jobId = `scrape:${payload.sourceId}:${Date.now()}`;
  const job = await queue.add(jobId, payload, {
    jobId,
    ...options,
  });
  return job.id ?? jobId;
}

/**
 * Enqueue a batch of scrape jobs.
 * Returns an array of job IDs.
 */
export async function enqueueScrapesBatch(
  payloads: ScrapeJobPayload[],
  priority: "high" | "standard" | "low" = "standard"
): Promise<string[]> {
  const queueName =
    priority === "high"
      ? QUEUE_NAMES.SCRAPE_HIGH
      : priority === "low"
        ? QUEUE_NAMES.SCRAPE_LOW
        : QUEUE_NAMES.SCRAPE_STANDARD;

  const queue = getQueue(queueName);
  const jobs = payloads.map((payload) => {
    const jobId = `scrape:${payload.sourceId}:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
    return { name: jobId, data: payload, opts: { jobId } };
  });

  const addedJobs = await queue.addBulk(jobs);
  return addedJobs.map((j) => j.id ?? "unknown");
}

/**
 * Enqueue an embedding processing job.
 */
export async function enqueueEmbedding(
  payload: EmbedJobPayload,
  options?: Partial<JobsOptions>
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.EMBED_PROCESS);
  const jobId = `embed:${payload.documentType}:${payload.documentId}:${Date.now()}`;
  const job = await queue.add(jobId, payload, {
    jobId,
    // Deduplicate: if the same document is already queued, skip
    ...options,
  });
  return job.id ?? jobId;
}

/**
 * Enqueue a webhook delivery job with custom backoff schedule.
 * Retry delays: 1m, 5m, 30m, 2h, 12h
 */
export async function enqueueWebhookDelivery(
  payload: WebhookDeliverPayload,
  options?: Partial<JobsOptions>
): Promise<string> {
  const queue = getQueue(QUEUE_NAMES.WEBHOOK_DELIVER);
  const jobId = `webhook:${payload.deliveryId}`;

  // Calculate delay based on attempt number
  const delays = [0, 60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
  const delay = delays[payload.attempt] ?? 0;

  const job = await queue.add(jobId, payload, {
    jobId,
    delay,
    attempts: payload.maxAttempts,
    ...options,
  });
  return job.id ?? jobId;
}

/**
 * Enqueue a delayed job that will be processed after `delayMs` milliseconds.
 */
export async function enqueueDelayed<T extends Record<string, unknown>>(
  queueName: string,
  jobName: string,
  payload: T,
  delayMs: number
): Promise<string> {
  const queue = getQueue(queueName as any);
  const job = await queue.add(jobName, payload as any, {
    delay: delayMs,
    jobId: `${jobName}:${Date.now()}`,
  });
  return job.id ?? jobName;
}
