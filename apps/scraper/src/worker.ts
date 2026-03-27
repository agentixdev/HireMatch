import type { Job as BullJob } from 'bullmq';
import type { Logger } from 'pino';
import type { Extractor, ExtractedData } from './extractors/base.js';
import { linkedinExtractor } from './extractors/linkedin.js';
import { githubExtractor } from './extractors/github.js';
import { connectBrowser, createStealthContext, waitForRateLimit, getGeoPool } from './proxy.js';
import { randomDelay, simulateMouseMovement } from './human-behavior.js';
import { createHash } from 'node:crypto';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/* ─── Types ─── */

export interface ScrapeJobData {
  scrapeJobId: string;
  orgId: string;
  sourceUrl: string;
  scrapeType: 'playwright' | 'crawl4ai' | 'computer_use';
  priority: 'high' | 'standard' | 'low';
  brightDataPool?: string;
  country?: string;
  retryCount?: number;
}

export interface ScrapeResult {
  status: 'completed' | 'skipped' | 'failed';
  contentHash?: string;
  recordsUpserted?: number;
  error?: string;
}

/* ─── Extractor registry ─── */

const EXTRACTORS: Extractor[] = [linkedinExtractor, githubExtractor];

function getExtractorForUrl(url: string): Extractor | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  for (const extractor of EXTRACTORS) {
    if (extractor.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
      return extractor;
    }
  }
  return null;
}

/* ─── Redis / Queue setup (lazy) ─── */

let redisConnection: IORedis | null = null;
let embedQueue: Queue | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return redisConnection;
}

function getEmbedQueue(): Queue {
  if (!embedQueue) {
    embedQueue = new Queue('embed:process', { connection: getRedisConnection() });
  }
  return embedQueue;
}

/* ─── DB operations (via @recruitment/db) ─── */

async function getDb() {
  const { createDb } = await import('@recruitment/db');
  return createDb();
}

async function getLastContentHash(scrapeJobId: string): Promise<string | null> {
  const db = await getDb();
  const { scrapeLog } = await import('@recruitment/db');
  const { desc, eq } = await import('drizzle-orm');

  const result = await db
    .select({ content_hash: scrapeLog.content_hash })
    .from(scrapeLog)
    .where(eq(scrapeLog.scrape_job_id, scrapeJobId))
    .orderBy(desc(scrapeLog.created_at))
    .limit(1);

  return result[0]?.content_hash ?? null;
}

async function insertScrapeLog(entry: {
  scrape_job_id: string;
  org_id: string;
  started_at: Date;
  completed_at: Date | null;
  content_hash: string | null;
  records_upserted: number;
  error_message: string | null;
  minio_archive_key: string | null;
  proxy_ip_region: string | null;
}): Promise<void> {
  const db = await getDb();
  const { scrapeLog } = await import('@recruitment/db');
  await db.insert(scrapeLog).values(entry);
}

async function updateScrapeJobStatus(
  scrapeJobId: string,
  status: 'completed' | 'failed',
  retryCount?: number,
): Promise<void> {
  const db = await getDb();
  const { scrapeJobs } = await import('@recruitment/db');
  const { eq } = await import('drizzle-orm');

  const updates: Record<string, unknown> = {
    status,
    last_run_at: new Date(),
  };
  if (retryCount !== undefined) {
    updates.retry_count = retryCount;
  }

  await db.update(scrapeJobs).set(updates).where(eq(scrapeJobs.id, scrapeJobId));
}

async function upsertCandidate(orgId: string, data: Record<string, unknown>): Promise<string> {
  const db = await getDb();
  const { candidates } = await import('@recruitment/db');
  const { eq, and } = await import('drizzle-orm');

  // Check if candidate with same source_url already exists for this org
  const existing = await db
    .select({ id: candidates.id })
    .from(candidates)
    .where(
      and(
        eq(candidates.org_id, orgId),
        eq(candidates.source_url, data.source_url as string),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const id = existing[0]!.id;
    await db
      .update(candidates)
      .set({ ...data, org_id: orgId, updated_at: new Date() })
      .where(eq(candidates.id, id));
    return id;
  }

  const result = await db
    .insert(candidates)
    .values({ ...data, org_id: orgId })
    .returning({ id: candidates.id });

  return result[0]!.id;
}

async function upsertJob(orgId: string, data: Record<string, unknown>): Promise<string> {
  const db = await getDb();
  const { jobs } = await import('@recruitment/db');
  const { eq, and } = await import('drizzle-orm');

  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.org_id, orgId),
        eq(jobs.source_url, data.source_url as string),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    const id = existing[0]!.id;
    await db
      .update(jobs)
      .set({ ...data, org_id: orgId, updated_at: new Date() })
      .where(eq(jobs.id, id));
    return id;
  }

  const result = await db
    .insert(jobs)
    .values({ ...data, org_id: orgId })
    .returning({ id: jobs.id });

  return result[0]!.id;
}

async function enqueueEmbedding(
  recordType: 'candidate' | 'job',
  recordId: string,
  orgId: string,
): Promise<void> {
  // Insert into DB embedding queue
  const db = await getDb();
  const { embeddingQueue } = await import('@recruitment/db');

  await db.insert(embeddingQueue).values({
    record_type: recordType,
    record_id: recordId,
    org_id: orgId,
    status: 'pending',
  });

  // Also enqueue in BullMQ for the worker to pick up
  await getEmbedQueue().add('embed', {
    recordType,
    recordId,
    orgId,
  });
}

/* ─── MinIO screenshot storage ─── */

async function uploadScreenshot(
  screenshotBuffer: Buffer,
  scrapeJobId: string,
  jobId: string,
): Promise<string> {
  const key = `scrape-failures/${scrapeJobId}/${jobId}-${Date.now()}.png`;

  try {
    // Dynamic import to avoid hard dependency if MinIO isn't configured
    const { Client: MinioClient } = await import('minio');
    const minio = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
    });

    const bucket = process.env.MINIO_BUCKET ?? 'recruitment-scraper';
    const bucketExists = await minio.bucketExists(bucket);
    if (!bucketExists) {
      await minio.makeBucket(bucket);
    }

    await minio.putObject(bucket, key, screenshotBuffer, screenshotBuffer.length, {
      'Content-Type': 'image/png',
    });

    return key;
  } catch {
    // If MinIO is not available, return the key for reference
    return `local://${key}`;
  }
}

/* ─── Main job processor ─── */

export async function processJob(job: BullJob<ScrapeJobData>, logger: Logger): Promise<ScrapeResult> {
  const {
    scrapeJobId,
    orgId,
    sourceUrl,
    brightDataPool,
    country,
    retryCount = 0,
  } = job.data;

  const startedAt = new Date();
  let browser = null;
  let context = null;
  let minioKey: string | null = null;

  try {
    // Find the right extractor
    const extractor = getExtractorForUrl(sourceUrl);
    if (!extractor) {
      throw new Error(`No extractor found for URL: ${sourceUrl}`);
    }

    logger.info(
      { extractor: extractor.name, url: sourceUrl },
      'Using extractor',
    );

    // Rate limit
    await waitForRateLimit(sourceUrl);

    // Connect browser with appropriate geo pool
    const pool = brightDataPool ?? (country ? getGeoPool(country) : undefined);
    browser = await connectBrowser(pool);
    context = await createStealthContext(browser);
    const page = await context.newPage();

    // Set request interception for additional stealth
    await page.addInitScript(() => {
      // Override webdriver detection
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      // Override chrome detection
      (window as Record<string, unknown>).chrome = {
        runtime: {},
        loadTimes: () => {},
        csi: () => {},
        app: {},
      };
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    });

    // Navigate
    logger.info({ url: sourceUrl }, 'Navigating to URL');
    const response = await page.goto(sourceUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (!response) {
      throw new Error('No response received from page');
    }

    const statusCode = response.status();
    if (statusCode >= 400) {
      throw new Error(`HTTP ${statusCode} response from ${sourceUrl}`);
    }

    // Brief human-like delay before extraction
    await randomDelay(1000, 3000);
    await simulateMouseMovement(page);

    // Extract data
    const extracted: ExtractedData = await extractor.extract(page, sourceUrl);

    // Check content hash for dedup
    const lastHash = await getLastContentHash(scrapeJobId);
    if (lastHash && lastHash === extracted.content_hash) {
      logger.info(
        { contentHash: extracted.content_hash },
        'Content unchanged, skipping DB upsert',
      );

      await insertScrapeLog({
        scrape_job_id: scrapeJobId,
        org_id: orgId,
        started_at: startedAt,
        completed_at: new Date(),
        content_hash: extracted.content_hash,
        records_upserted: 0,
        error_message: null,
        minio_archive_key: null,
        proxy_ip_region: pool ?? null,
      });

      await updateScrapeJobStatus(scrapeJobId, 'completed');

      return { status: 'skipped', contentHash: extracted.content_hash };
    }

    // Upsert to DB
    let recordId: string;
    if (extracted.type === 'candidate') {
      recordId = await upsertCandidate(orgId, extracted.data);
    } else {
      recordId = await upsertJob(orgId, extracted.data);
    }

    // Enqueue embedding generation
    await enqueueEmbedding(extracted.type, recordId, orgId);

    // Log success
    await insertScrapeLog({
      scrape_job_id: scrapeJobId,
      org_id: orgId,
      started_at: startedAt,
      completed_at: new Date(),
      content_hash: extracted.content_hash,
      records_upserted: 1,
      error_message: null,
      minio_archive_key: null,
      proxy_ip_region: pool ?? null,
    });

    await updateScrapeJobStatus(scrapeJobId, 'completed');

    return {
      status: 'completed',
      contentHash: extracted.content_hash,
      recordsUpserted: 1,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Take screenshot on failure
    try {
      if (context) {
        const pages = context.pages();
        if (pages.length > 0) {
          const screenshot = await pages[0]!.screenshot({ fullPage: true });
          minioKey = await uploadScreenshot(
            screenshot,
            scrapeJobId,
            job.id ?? 'unknown',
          );
          logger.info({ minioKey }, 'Failure screenshot uploaded');
        }
      }
    } catch (screenshotErr) {
      logger.warn({ err: screenshotErr }, 'Failed to capture screenshot');
    }

    // Log failure
    await insertScrapeLog({
      scrape_job_id: scrapeJobId,
      org_id: orgId,
      started_at: startedAt,
      completed_at: new Date(),
      content_hash: null,
      records_upserted: 0,
      error_message: errorMessage,
      minio_archive_key: minioKey,
      proxy_ip_region: null,
    }).catch((logErr) => {
      logger.error({ err: logErr }, 'Failed to insert scrape log');
    });

    await updateScrapeJobStatus(scrapeJobId, 'failed', retryCount + 1).catch(
      (logErr) => {
        logger.error({ err: logErr }, 'Failed to update scrape job status');
      },
    );

    return { status: 'failed', error: errorMessage };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}
