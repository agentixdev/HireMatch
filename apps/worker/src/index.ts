import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { processEmbedding, type EmbedJobData } from './embed-processor.js';
import { processWebhookDelivery, type WebhookJobData } from './webhook-processor.js';

const logger = pino({
  name: 'worker',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const EMBED_CONCURRENCY = Number(process.env.EMBED_CONCURRENCY ?? '5');
const WEBHOOK_CONCURRENCY = Number(process.env.WEBHOOK_CONCURRENCY ?? '10');

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000);
    logger.warn({ times, delay }, 'Redis reconnecting');
    return delay;
  },
});

connection.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

const workers: Worker[] = [];

/* ─── Embedding worker ─── */

function createEmbedWorker(): Worker<EmbedJobData> {
  const worker = new Worker<EmbedJobData>(
    'embed:process',
    async (job) => {
      const startTime = Date.now();
      logger.info({ jobId: job.id, data: job.data }, 'Processing embedding job');

      try {
        const result = await processEmbedding(job.data, logger);
        const duration = Date.now() - startTime;
        logger.info({ jobId: job.id, duration, result }, 'Embedding job completed');
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error({ jobId: job.id, duration, err }, 'Embedding job failed');
        throw err;
      }
    },
    {
      connection,
      concurrency: EMBED_CONCURRENCY,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      'Embedding job permanently failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Embed worker error');
  });

  return worker;
}

/* ─── Webhook delivery worker ─── */

function createWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    'webhook:deliver',
    async (job) => {
      const startTime = Date.now();
      logger.info({ jobId: job.id, data: job.data }, 'Processing webhook delivery');

      try {
        const result = await processWebhookDelivery(job.data, logger);
        const duration = Date.now() - startTime;
        logger.info({ jobId: job.id, duration, result }, 'Webhook delivery completed');
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error({ jobId: job.id, duration, err }, 'Webhook delivery failed');
        throw err;
      }
    },
    {
      connection,
      concurrency: WEBHOOK_CONCURRENCY,
      removeOnComplete: { count: 2000 },
      removeOnFail: { count: 500 },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 10s, 30s, 90s, 270s, 810s
          return Math.min(10000 * Math.pow(3, attemptsMade - 1), 900_000);
        },
      },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      'Webhook delivery permanently failed',
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Webhook worker error');
  });

  return worker;
}

/* ─── Lifecycle ─── */

async function shutdown(): Promise<void> {
  logger.info('Shutting down workers...');
  const closePromises = workers.map(async (w) => {
    await w.close();
    logger.info({ queue: w.name }, 'Worker closed');
  });
  await Promise.allSettled(closePromises);
  await connection.quit();
  logger.info('Shutdown complete');
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info(
    { embedConcurrency: EMBED_CONCURRENCY, webhookConcurrency: WEBHOOK_CONCURRENCY },
    'Starting worker service',
  );

  const embedWorker = createEmbedWorker();
  workers.push(embedWorker);
  logger.info({ queue: 'embed:process', concurrency: EMBED_CONCURRENCY }, 'Embed worker started');

  const webhookWorker = createWebhookWorker();
  workers.push(webhookWorker);
  logger.info({ queue: 'webhook:deliver', concurrency: WEBHOOK_CONCURRENCY }, 'Webhook worker started');

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Worker service is running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start worker service');
  process.exit(1);
});
