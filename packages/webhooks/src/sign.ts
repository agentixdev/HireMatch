import { createHmac, timingSafeEqual } from "node:crypto";

/** Webhook signature header name */
export const SIGNATURE_HEADER = "x-recruitment-signature";
export const TIMESTAMP_HEADER = "x-recruitment-timestamp";

/** Maximum age for a webhook signature to be considered valid (5 minutes) */
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

/**
 * Sign a webhook payload using HMAC-SHA256.
 * The signature covers both the timestamp and the body to prevent replay attacks.
 *
 * Format: t=<unix_timestamp>,v1=<hmac_hex>
 */
export function signPayload(
  payload: string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedContent = `${ts}.${payload}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(signedContent);
  const hash = hmac.digest("hex");

  return {
    signature: `t=${ts},v1=${hash}`,
    timestamp: ts,
  };
}

/**
 * Parse a webhook signature header into its components.
 */
export function parseSignature(
  header: string
): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(",");
  let timestamp = 0;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) return null;

    if (key === "t") {
      timestamp = parseInt(value, 10);
      if (isNaN(timestamp)) return null;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === 0 || signatures.length === 0) return null;
  return { timestamp, signatures };
}

/**
 * Verify a webhook signature.
 * Checks both the HMAC and the timestamp freshness.
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  options?: { maxAgeMs?: number }
): { valid: boolean; reason?: string } {
  const parsed = parseSignature(signature);
  if (!parsed) {
    return { valid: false, reason: "Invalid signature format" };
  }

  const maxAge = options?.maxAgeMs ?? MAX_SIGNATURE_AGE_MS;
  const now = Math.floor(Date.now() / 1000);
  const age = (now - parsed.timestamp) * 1000;

  if (age > maxAge) {
    return { valid: false, reason: "Signature expired" };
  }

  if (age < -maxAge) {
    return { valid: false, reason: "Signature timestamp in the future" };
  }

  // Compute expected signature
  const signedContent = `${parsed.timestamp}.${payload}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(signedContent);
  const expected = hmac.digest("hex");

  // Check against all v1 signatures (supports secret rotation)
  for (const sig of parsed.signatures) {
    try {
      const expectedBuf = Buffer.from(expected, "hex");
      const actualBuf = Buffer.from(sig, "hex");
      if (expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf)) {
        return { valid: true };
      }
    } catch {
      continue;
    }
  }

  return { valid: false, reason: "Signature mismatch" };
}
