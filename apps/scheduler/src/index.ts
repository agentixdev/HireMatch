import cron from 'node-cron';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import pino from 'pino';
import { computeNextRun, isValidCron } from './cron-parser.js';

const logger = pino({
  name: 'scheduler',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const POLL_INTERVAL_CRON = process.env.POLL_CRON ?? '* * * * *'; // every minute

/* ─── Redis / Queue setup ─── */

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

const queues = {
  high: new Queue('scrape:high', { connection }),
  standard: new Queue('scrape:standard', { connection }),
  low: new Queue('scrape:low', { connection }),
};

/* ─── DB operations ─── */

interface DueScrapeJob {
  id: string;
  org_id: string;
  source_url: string;
  scrape_type: 'playwright' | 'crawl4ai' | 'computer_use';
  schedule_cron: string | null;
  priority: 'high' | 'standard' | 'low';
  status: string;
  retry_count: number;
  bright_data_pool: string | null;
  next_run_at: Date | null;
}

async function getDb() {
  const { createDb } = await import('@recruitment/db');
  return createDb();
}

/**
 * Query all scrape jobs that are due for execution.
 */
async function getDueScrapeJobs(): Promise<DueScrapeJob[]> {
  const db = await getDb();
  const { scrapeJobs } = await import('@recruitment/db');
  const { lte, ne, and, isNotNull } = await import('drizzle-orm');

  const now = new Date();

  const results = await db
    .select({
      id: scrapeJobs.id,
      org_id: scrapeJobs.org_id,
      source_url: scrapeJobs.source_url,
      scrape_type: scrapeJobs.scrape_type,
      schedule_cron: scrapeJobs.schedule_cron,
      priority: scrapeJobs.priority,
      status: scrapeJobs.status,
      retry_count: scrapeJobs.retry_count,
      bright_data_pool: scrapeJobs.bright_data_pool,
      next_run_at: scrapeJobs.next_run_at,
    })
    .from(scrapeJobs)
    .where(
      and(
        lte(scrapeJobs.next_run_at, now),
        ne(scrapeJobs.status, 'paused'),
        ne(scrapeJobs.status, 'running'),
        isNotNull(scrapeJobs.next_run_at),
      ),
    )
    .limit(100);

  return results as DueScrapeJob[];
}

/**
 * Update a scrape job's next_run_at and status after dispatching.
 */
async function updateScrapeJobAfterDispatch(
  jobId: string,
  scheduleCron: string | null,
): Promise<void> {
  const db = await getDb();
  const { scrapeJobs } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  let nextRunAt: Date | null = null;

  if (scheduleCron && isValidCron(scheduleCron)) {
    nextRunAt = computeNextRun(scheduleCron, new Date());
  }

  await db
    .update(scrapeJobs)
    .set({
      status: 'running',
      last_run_at: new Date(),
      next_run_at: nextRunAt,
    })
    .where(eq(scrapeJobs.id, jobId));
}

/* ─── Queue selection ─── */

function getQueueForJob(
  scrapeType: string,
  priority: string,
): Queue {
  // computer_use always goes to high priority
  if (scrapeType === 'computer_use') {
    return queues.high;
  }

  switch (priority) {
    case 'high':
      return queues.high;
    case 'low':
      return queues.low;
    default:
      return queues.standard;
  }
}

function getJobOptions(priority: string) {
  const baseOpts = {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  };

  switch (priority) {
    case 'high':
      return {
        ...baseOpts,
        priority: 1,
        attempts: 5,
        backoff: { type: 'exponential' as const, delay: 5000 },
      };
    case 'low':
      return {
        ...baseOpts,
        priority: 10,
        attempts: 2,
        backoff: { type: 'exponential' as const, delay: 30000 },
      };
    default:
      return {
        ...baseOpts,
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 10000 },
      };
  }
}

/* ─── Dispatch logic ─── */

async function dispatchDueJobs(): Promise<void> {
  const startTime = Date.now();

  try {
    const dueJobs = await getDueScrapeJobs();

    if (dueJobs.length === 0) {
      logger.debug('No due scrape jobs');
      return;
    }

    logger.info({ count: dueJobs.length }, 'Found due scrape jobs');

    let dispatched = 0;
    let errors = 0;

    for (const job of dueJobs) {
      try {
        const queue = getQueueForJob(job.scrape_type, job.priority);
        const jobOpts = getJobOptions(job.priority);

        await queue.add(
          'scrape',
          {
            scrapeJobId: job.id,
            orgId: job.org_id,
            sourceUrl: job.source_url,
            scrapeType: job.scrape_type,
            priority: job.priority,
            brightDataPool: job.bright_data_pool,
            retryCount: job.retry_count,
          },
          {
            ...jobOpts,
            jobId: `scrape-${job.id}-${Date.now()}`,
          },
        );

        await updateScrapeJobAfterDispatch(job.id, job.schedule_cron);
        dispatched++;

        logger.info(
          {
            scrapeJobId: job.id,
            queue: queue.name,
            scrapeType: job.scrape_type,
            priority: job.priority,
            url: job.source_url,
            nextRun: job.schedule_cron
              ? computeNextRun(job.schedule_cron).toISOString()
              : 'none (one-shot)',
          },
          'Dispatched scrape job',
        );
      } catch (err) {
        errors++;
        logger.error(
          { scrapeJobId: job.id, err },
          'Failed to dispatch scrape job',
        );
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      { dispatched, errors, total: dueJobs.length, durationMs: duration },
      'Dispatch cycle complete',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to query due scrape jobs');
  }
}

/* ─── Lifecycle ─── */

let cronTask: cron.ScheduledTask | null = null;

async function shutdown(): Promise<void> {
  logger.info('Shutting down scheduler...');

  if (cronTask) {
    cronTask.stop();
    logger.info('Cron task stopped');
  }

  await Promise.allSettled(
    Object.values(queues).map((q) => q.close()),
  );

  await connection.quit();
  logger.info('Shutdown complete');
  process.exit(0);
}

async function main(): Promise<void> {
  logger.info(
    { pollCron: POLL_INTERVAL_CRON, redis: REDIS_URL },
    'Starting scheduler service',
  );

  // Run an initial dispatch immediately
  await dispatchDueJobs();

  // Schedule recurring dispatch
  cronTask = cron.schedule(POLL_INTERVAL_CRON, async () => {
    logger.debug('Cron tick: checking for due jobs');
    await dispatchDueJobs();
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Scheduler service is running');
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start scheduler');
  process.exit(1);
});
