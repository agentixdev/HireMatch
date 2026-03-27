import { Worker, type Job as BullJob } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { processJob } from './worker.js';

const logger = pino({
  name: 'scraper',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const CONCURRENCY = Number(process.env.SCRAPER_CONCURRENCY ?? '3');

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

const QUEUE_NAMES = ['scrape:high', 'scrape:standard', 'scrape:low'] as const;

const workers: Worker[] = [];

function createWorker(queueName: string, concurrency: number): Worker {
  const worker = new Worker(
    queueName,
    async (job: BullJob) => {
      const startTime = Date.now();
      logger.info(
        { jobId: job.id, queue: queueName, data: job.data },
        'Processing scrape job',
      );

      try {
        const result = await processJob(job, logger);
        const duration = Date.now() - startTime;
        logger.info(
          { jobId: job.id, duration, result: result.status },
          'Scrape job completed',
        );
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error(
          { jobId: job.id, duration, err },
          'Scrape job failed',
        );
        throw err;
      }
    },
    {
      connection,
      concurrency,
      limiter: {
        max: 10,
        duration: 30_000,
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      'Job permanently failed',
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Job stalled');
  });

  worker.on('error', (err) => {
    logger.error({ err }, `Worker error on ${queueName}`);
  });

  return worker;
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down scraper workers...');
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
    { queues: QUEUE_NAMES, concurrency: CONCURRENCY, redis: REDIS_URL },
    'Starting scraper service',
  );

  for (const queueName of QUEUE_NAMES) {
    const concurrency =
      queueName === 'scrape:high'
        ? CONCURRENCY
        : queueName === 'scrape:standard'
          ? Math.max(1, Math.floor(CONCURRENCY * 0.6))
          : 1;
    const worker = createWorker(queueName, concurrency);
    workers.push(worker);
    logger.info({ queue: queueName, concurrency }, 'Worker registered');
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Scraper service is running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start scraper');
  process.exit(1);
});
