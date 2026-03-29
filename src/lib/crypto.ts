/**
 * Encrypt / decrypt webhook secrets at rest using AES-256-GCM.
 *
 * Uses WEBHOOK_ENCRYPTION_KEY env var (32-byte hex string = 64 hex chars).
 * Falls back to plaintext if the key is not set (dev mode).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const hex = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext secret. Returns a `enc:<iv>:<authTag>:<ciphertext>` string.
 * If no encryption key is configured, returns plaintext prefixed with `plain:`.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) return `plain:${plaintext}`;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a secret string produced by `encryptSecret`.
 * Handles both `enc:` (encrypted) and `plain:` (plaintext) prefixes.
 * Strings without a known prefix are treated as legacy plaintext.
 */
export function decryptSecret(stored: string): string {
  if (stored.startsWith('plain:')) return stored.slice(6);
  if (!stored.startsWith('enc:')) return stored; // legacy plaintext

  const key = getKey();
  if (!key) throw new Error('WEBHOOK_ENCRYPTION_KEY required to decrypt secrets');

  const parts = stored.split(':');
  if (parts.length !== 4) throw new Error('Malformed encrypted secret');

  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
