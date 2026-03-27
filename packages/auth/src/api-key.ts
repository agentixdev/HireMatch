import { createHmac, randomBytes } from "node:crypto";

/** API key prefix for identification */
const API_KEY_PREFIX = "rm_live_";
const API_KEY_TEST_PREFIX = "rm_test_";

export interface ApiKeyData {
  /** The full key (only shown once at creation) */
  key: string;
  /** SHA-256 hash of the key for storage */
  hash: string;
  /** Short preview for display: rm_live_abc...xyz */
  preview: string;
  /** When the key was created */
  createdAt: Date;
}

export interface StoredApiKey {
  id: string;
  hash: string;
  orgId: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Generate a new API key with 32 random bytes, prefixed for easy identification.
 */
export function generateApiKey(mode: "live" | "test" = "live"): ApiKeyData {
  const prefix = mode === "live" ? API_KEY_PREFIX : API_KEY_TEST_PREFIX;
  const rawBytes = randomBytes(32);
  const keyBody = rawBytes.toString("base64url");
  const key = `${prefix}${keyBody}`;
  const hash = hashApiKey(key);
  const preview = `${key.slice(0, prefix.length + 3)}...${key.slice(-4)}`;

  return {
    key,
    hash,
    preview,
    createdAt: new Date(),
  };
}

/**
 * Hash an API key using HMAC-SHA256 with a salt derived from the key prefix.
 * This prevents rainbow table attacks even without a separate secret.
 */
export function hashApiKey(key: string): string {
  // Use the prefix as an HMAC key so each environment is isolated
  const prefix = key.startsWith(API_KEY_TEST_PREFIX)
    ? API_KEY_TEST_PREFIX
    : API_KEY_PREFIX;
  const hmac = createHmac("sha256", prefix);
  hmac.update(key);
  return hmac.digest("hex");
}

/**
 * Validate that a string looks like a valid API key format.
 */
export function isValidApiKeyFormat(key: string): boolean {
  if (!key.startsWith(API_KEY_PREFIX) && !key.startsWith(API_KEY_TEST_PREFIX)) {
    return false;
  }
  const prefix = key.startsWith(API_KEY_TEST_PREFIX)
    ? API_KEY_TEST_PREFIX
    : API_KEY_PREFIX;
  const body = key.slice(prefix.length);
  // base64url: A-Z, a-z, 0-9, -, _  and length should be ~43 for 32 bytes
  return /^[A-Za-z0-9_-]{40,50}$/.test(body);
}

/**
 * Validate an API key against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateApiKey(key: string, storedHash: string): boolean {
  if (!isValidApiKeyFormat(key)) return false;

  const computedHash = hashApiKey(key);

  // Timing-safe comparison
  if (computedHash.length !== storedHash.length) return false;

  let mismatch = 0;
  for (let i = 0; i < computedHash.length; i++) {
    mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Check whether an API key looks like a test-mode key.
 */
export function isTestKey(key: string): boolean {
  return key.startsWith(API_KEY_TEST_PREFIX);
}

/**
 * Extract the mode from a key string.
 */
export function getKeyMode(key: string): "live" | "test" | "unknown" {
  if (key.startsWith(API_KEY_PREFIX)) return "live";
  if (key.startsWith(API_KEY_TEST_PREFIX)) return "test";
  return "unknown";
}
