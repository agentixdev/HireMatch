import type { Job } from "bullmq";
import { getQueue } from "./queues.js";
import type { QueueName } from "./types.js";

/** Dead letter queue entry */
export interface DlqEntry {
  originalQueue: string;
  jobId: string;
  jobName: string;
  payload: unknown;
  failedReason: string;
  attemptsMade: number;
  failedAt: string;
  stackTrace?: string[];
}

/** Alert handler type */
export type AlertHandler = (entry: DlqEntry) => Promise<void>;

let alertHandler: AlertHandler | null = null;

/**
 * Register a handler that gets called when a job moves to the DLQ.
 * Typically sends to Slack, PagerDuty, email, etc.
 */
export function onDlqAlert(handler: AlertHandler): void {
  alertHandler = handler;
}

/**
 * Handle a permanently failed job.
 * Extracts metadata, logs it, and triggers the alert handler.
 */
export async function handleDeadLetter(
  job: Job,
  queueName: string
): Promise<DlqEntry> {
  const entry: DlqEntry = {
    originalQueue: queueName,
    jobId: job.id ?? "unknown",
    jobName: job.name,
    payload: job.data,
    failedReason: job.failedReason ?? "Unknown error",
    attemptsMade: job.attemptsMade,
    failedAt: new Date().toISOString(),
    stackTrace: job.stacktrace,
  };

  console.error(
    `[DLQ] Job ${entry.jobId} from ${entry.originalQueue} permanently failed after ${entry.attemptsMade} attempts: ${entry.failedReason}`
  );

  if (alertHandler) {
    try {
      await alertHandler(entry);
    } catch (alertErr) {
      console.error("[DLQ] Alert handler failed:", alertErr);
    }
  }

  return entry;
}

/**
 * Retrieve failed jobs from a queue for inspection.
 */
export async function getFailedJobs(
  queueName: QueueName,
  start = 0,
  end = 50
): Promise<Job[]> {
  const queue = getQueue(queueName);
  return queue.getFailed(start, end);
}

/**
 * Retry a specific failed job by its ID.
 */
export async function retryFailedJob(
  queueName: QueueName,
  jobId: string
): Promise<boolean> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) return false;

  try {
    await job.retry();
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry all failed jobs in a queue.
 * Returns the count of jobs retried.
 */
export async function retryAllFailed(queueName: QueueName): Promise<number> {
  const queue = getQueue(queueName);
  const failed = await queue.getFailed(0, -1);
  let retried = 0;

  for (const job of failed) {
    try {
      await job.retry();
      retried++;
    } catch {
      // Skip jobs that can't be retried
    }
  }

  return retried;
}

/**
 * Purge all failed jobs from a queue.
 */
export async function purgeFailedJobs(queueName: QueueName): Promise<number> {
  const queue = getQueue(queueName);
  const failed = await queue.getFailed(0, -1);

  for (const job of failed) {
    await job.remove();
  }

  return failed.length;
}
