import type { Client } from 'minio';
import type { BucketName } from './buckets.js';

/** Default expiry: 1 hour (in seconds) */
const DEFAULT_EXPIRY = 3600;

/** Maximum expiry: 7 days (in seconds) */
const MAX_EXPIRY = 7 * 24 * 3600;

/**
 * Generate a presigned URL for downloading an object.
 *
 * @param client        MinIO client instance
 * @param bucket        Target bucket
 * @param key           Object key
 * @param expirySeconds URL expiration time (default: 1 hour, max: 7 days)
 * @returns             Presigned download URL
 */
export async function getPresignedUrl(
  client: Client,
  bucket: BucketName,
  key: string,
  expirySeconds = DEFAULT_EXPIRY,
): Promise<string> {
  const expiry = Math.min(Math.max(1, expirySeconds), MAX_EXPIRY);
  return client.presignedGetObject(bucket, key, expiry);
}

/**
 * Generate a presigned URL for uploading an object (PUT).
 *
 * @param client        MinIO client instance
 * @param bucket        Target bucket
 * @param key           Object key
 * @param expirySeconds URL expiration time (default: 1 hour, max: 7 days)
 * @returns             Presigned upload URL
 */
export async function getPresignedUploadUrl(
  client: Client,
  bucket: BucketName,
  key: string,
  expirySeconds = DEFAULT_EXPIRY,
): Promise<string> {
  const expiry = Math.min(Math.max(1, expirySeconds), MAX_EXPIRY);
  return client.presignedPutObject(bucket, key, expiry);
}

/**
 * Generate a presigned POST policy for browser-based uploads.
 * Useful for direct uploads from the frontend.
 *
 * @param client        MinIO client instance
 * @param bucket        Target bucket
 * @param keyPrefix     Key prefix for the uploaded file
 * @param expirySeconds Policy expiration time (default: 1 hour)
 * @param maxSizeMB     Maximum upload size in megabytes (default: 50)
 */
export async function getPresignedPostPolicy(
  client: Client,
  bucket: BucketName,
  keyPrefix: string,
  expirySeconds = DEFAULT_EXPIRY,
  maxSizeMB = 50,
): Promise<{ postURL: string; formData: Record<string, string> }> {
  const policy = client.newPostPolicy();
  policy.setBucket(bucket);
  policy.setKeyStartsWith(keyPrefix);

  const expiry = new Date();
  expiry.setSeconds(expiry.getSeconds() + Math.min(expirySeconds, MAX_EXPIRY));
  policy.setExpires(expiry);

  policy.setContentLengthRange(0, maxSizeMB * 1024 * 1024);

  const result = await client.presignedPostPolicy(policy);
  return {
    postURL: result.postURL,
    formData: result.formData as Record<string, string>,
  };
}
