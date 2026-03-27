import type { Client } from 'minio';

export const BUCKETS = {
  RAW_HTML: 'raw-html',
  SCREENSHOTS: 'screenshots',
  CV_DOCUMENTS: 'cv-documents',
  SCRAPE_ARCHIVES: 'scrape-archives',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * All bucket names as an array for iteration.
 */
export const ALL_BUCKETS: BucketName[] = Object.values(BUCKETS);

/**
 * Ensure all required buckets exist, creating any that are missing.
 */
export async function ensureBuckets(client: Client): Promise<void> {
  for (const bucket of ALL_BUCKETS) {
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket);
    }
  }
}

/**
 * Check which buckets exist and return their status.
 */
export async function checkBuckets(
  client: Client,
): Promise<Record<BucketName, boolean>> {
  const result = {} as Record<BucketName, boolean>;
  for (const bucket of ALL_BUCKETS) {
    result[bucket] = await client.bucketExists(bucket);
  }
  return result;
}
