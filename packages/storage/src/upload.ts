import type { Client } from 'minio';
import type { BucketName } from './buckets.js';

/**
 * Upload a Buffer to storage.
 */
export async function uploadBuffer(
  client: Client,
  bucket: BucketName,
  key: string,
  buffer: Buffer,
  contentType = 'application/octet-stream',
): Promise<{ bucket: BucketName; key: string; size: number; etag: string }> {
  const result = await client.putObject(bucket, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return {
    bucket,
    key,
    size: buffer.length,
    etag: result.etag,
  };
}

/**
 * Upload a JSON object to storage (serialized as UTF-8).
 */
export async function uploadJson(
  client: Client,
  bucket: BucketName,
  key: string,
  data: unknown,
): Promise<{ bucket: BucketName; key: string; size: number; etag: string }> {
  const json = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(json, 'utf-8');
  return uploadBuffer(client, bucket, key, buffer, 'application/json');
}

/**
 * Upload a UTF-8 string to storage.
 */
export async function uploadText(
  client: Client,
  bucket: BucketName,
  key: string,
  text: string,
  contentType = 'text/plain',
): Promise<{ bucket: BucketName; key: string; size: number; etag: string }> {
  const buffer = Buffer.from(text, 'utf-8');
  return uploadBuffer(client, bucket, key, buffer, contentType);
}

/**
 * Upload an HTML string to storage.
 */
export async function uploadHtml(
  client: Client,
  bucket: BucketName,
  key: string,
  html: string,
): Promise<{ bucket: BucketName; key: string; size: number; etag: string }> {
  return uploadText(client, bucket, key, html, 'text/html');
}

/**
 * Build a standardized archive key path.
 * Format: {orgId}/{jobId}/{timestamp}.{ext}
 */
export function buildArchiveKey(
  orgId: string,
  jobId: string,
  timestamp?: string,
  ext?: string,
): string {
  const ts = timestamp ?? new Date().toISOString().replace(/[:.]/g, '-');
  const extension = ext ?? 'json';
  return `${orgId}/${jobId}/${ts}.${extension}`;
}

/**
 * Build a key for a CV document.
 * Format: {orgId}/cvs/{candidateId}/{filename}
 */
export function buildCvKey(
  orgId: string,
  candidateId: string,
  filename: string,
): string {
  return `${orgId}/cvs/${candidateId}/${filename}`;
}

/**
 * Build a key for a screenshot.
 * Format: screenshots/{source}/{timestamp}.png
 */
export function buildScreenshotKey(
  source: string,
  timestamp?: string,
): string {
  const ts = timestamp ?? new Date().toISOString().replace(/[:.]/g, '-');
  return `screenshots/${source}/${ts}.png`;
}
