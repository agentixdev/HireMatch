import { createHash } from "node:crypto";

/**
 * Compute SHA-256 hash of content for change detection.
 * Returns a hex string.
 */
export function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Compute SHA-256 hash of a buffer.
 */
export function bufferHash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Check if content has changed by comparing hashes.
 */
export function hasContentChanged(
  newContent: string,
  previousHash: string
): boolean {
  return contentHash(newContent) !== previousHash;
}

/**
 * Create a composite hash from multiple content pieces.
 * Useful for checking if a set of related content has changed.
 */
export function compositeHash(parts: string[]): string {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part, "utf-8");
    hash.update("\x00"); // null separator
  }
  return hash.digest("hex");
}

/**
 * Generate a short fingerprint (first 12 chars of the hash).
 */
export function fingerprint(content: string): string {
  return contentHash(content).slice(0, 12);
}
