import { Worker, type Job as BullJob } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { navigateAndExtract, type AgentJobData, type AgentResult } from './agent.js';

const logger = pino({
  name: 'cowork-agent',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const REDIS_URL = process.env.REDIS_URL ?? process.env.UPSTASH_REDIS_URL ?? 'redis://127.0.0.1:6379';
const CONCURRENCY = Number(process.env.AGENT_CONCURRENCY ?? '2');

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
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

function createAgentWorker(): Worker<AgentJobData> {
  const worker = new Worker<AgentJobData>(
    'scrape:high',
    async (job: BullJob<AgentJobData>) => {
      // Only process computer_use type jobs
      const scrapeType = job.data.scrapeType ?? (job.data as Record<string, unknown>).scrape_type;
      if (scrapeType !== 'computer_use') {
        logger.debug(
          { jobId: job.id, scrapeType },
          'Skipping non-computer_use job',
        );
        return { status: 'skipped' as const, reason: 'Not a computer_use job', screenshots: [], stepsCompleted: 0 };
      }

      const startTime = Date.now();
      logger.info(
        { jobId: job.id, url: job.data.sourceUrl ?? (job.data as Record<string, unknown>).url },
        'Processing computer-use agent job',
      );

      try {
        const result: AgentResult = await navigateAndExtract(job.data, logger);
        const duration = Date.now() - startTime;
        logger.info(
          {
            jobId: job.id,
            duration,
            status: result.status,
            stepsCompleted: result.stepsCompleted,
            screenshots: result.screenshots.length,
          },
          'Agent job completed',
        );
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error({ jobId: job.id, duration, err }, 'Agent job failed');
        throw err;
      }
    },
    {
      connection,
      concurrency: CONCURRENCY,
      // Computer use jobs take longer — extended lock/stall times
      lockDuration: 300_000, // 5 minutes
      stalledInterval: 120_000, // 2 minutes
      limiter: {
        max: 5,
        duration: 60_000, // 5 jobs per minute
      },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job?.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, err: err.message, attempts: job?.attemptsMade },
      'Agent job permanently failed',
    );
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Agent job stalled');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Agent worker error');
  });

  return worker;
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down cowork-agent...');
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
    { concurrency: CONCURRENCY, redis: REDIS_URL.replace(/\/\/.*@/, '//***@') },
    'Starting cowork-agent service',
  );

  const worker = createAgentWorker();
  workers.push(worker);
  logger.info(
    { queue: 'scrape:high', concurrency: CONCURRENCY },
    'Agent worker started (filtering for computer_use jobs)',
  );

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Cowork-agent service is running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start cowork-agent');
  process.exit(1);
});
