import { Queue, Worker, type Processor, type QueueOptions, type WorkerOptions } from "bullmq";
import type IORedis from "ioredis";
import { getDefaultConnection, toBullMQConnection } from "./connection.js";
import { QUEUE_NAMES, type QueueName, type QueuePayloadMap } from "./types.js";

/** Default job options per queue */
const QUEUE_DEFAULTS: Record<QueueName, Partial<QueueOptions["defaultJobOptions"]>> = {
  [QUEUE_NAMES.SCRAPE_HIGH]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    priority: 1,
  },
  [QUEUE_NAMES.SCRAPE_STANDARD]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    priority: 5,
  },
  [QUEUE_NAMES.SCRAPE_LOW]: {
    attempts: 2,
    backoff: { type: "exponential", delay: 30_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
    priority: 10,
  },
  [QUEUE_NAMES.EMBED_PROCESS]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 5000 },
  },
  [QUEUE_NAMES.WEBHOOK_DELIVER]: {
    attempts: 5,
    backoff: { type: "custom" },
    removeOnComplete: { count: 5000 },
    removeOnFail: { count: 10000 },
  },
};

/** Store created queues for reuse */
const queueInstances = new Map<string, Queue>();

/**
 * Create or retrieve a BullMQ Queue for the given queue name.
 */
export function getQueue<N extends QueueName>(
  name: N,
  connection?: IORedis
): Queue<QueuePayloadMap[N]> {
  const existing = queueInstances.get(name);
  if (existing) return existing as Queue<QueuePayloadMap[N]>;

  const redis = connection ?? getDefaultConnection();
  const queue = new Queue<QueuePayloadMap[N]>(name, {
    connection: toBullMQConnection(redis),
    defaultJobOptions: QUEUE_DEFAULTS[name] as QueueOptions["defaultJobOptions"],
  });

  queueInstances.set(name, queue as unknown as Queue);
  return queue;
}

/**
 * Create a BullMQ Worker for the given queue name.
 * Returns the worker instance which can be used to listen to events.
 */
export function createWorker<N extends QueueName>(
  name: N,
  processor: Processor<QueuePayloadMap[N]>,
  options?: Partial<WorkerOptions>,
  connection?: IORedis
): Worker<QueuePayloadMap[N]> {
  const redis = connection ?? getDefaultConnection();

  const worker = new Worker<QueuePayloadMap[N]>(name, processor, {
    connection: toBullMQConnection(redis),
    concurrency: options?.concurrency ?? 5,
    limiter: options?.limiter,
    ...options,
  });

  worker.on("error", (err) => {
    console.error(`[Worker:${name}] Error:`, err.message);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[Worker:${name}] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
  });

  return worker;
}

/**
 * Gracefully shut down all queue instances.
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];
  for (const [name, queue] of queueInstances) {
    closePromises.push(
      queue.close().then(() => {
        queueInstances.delete(name);
      })
    );
  }
  await Promise.allSettled(closePromises);
}

/**
 * Get queue health metrics.
 */
export async function getQueueMetrics(name: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(name);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}
