import { createHmac, randomBytes } from "node:crypto";

/** TOTP configuration */
export interface TotpConfig {
  /** Secret key (base32 encoded) */
  secret: string;
  /** Time step in seconds (default: 30) */
  period?: number;
  /** Number of digits (default: 6) */
  digits?: number;
  /** Hash algorithm (default: SHA1 for compatibility) */
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  /** Allow codes from adjacent windows (default: 1) */
  window?: number;
}

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate a random base32-encoded secret for TOTP.
 */
export function generateTotpSecret(length = 20): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i]! % 32];
  }
  return result;
}

/**
 * Decode a base32 string to a Buffer.
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/[= ]/g, "").toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error(`Invalid base32 character: ${char}`);
    // Push 5 bits
    for (let j = 4; j >= 0; j--) {
      bits.push((val >> j) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

/**
 * Generate a TOTP code for a given time counter.
 */
function generateHotp(secret: Buffer, counter: bigint, digits: number, algorithm: string): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);

  const alg = algorithm === "SHA256" ? "sha256" : algorithm === "SHA512" ? "sha512" : "sha1";
  const hmac = createHmac(alg, secret);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    ((hash[offset + 1]! & 0xff) << 16) |
    ((hash[offset + 2]! & 0xff) << 8) |
    (hash[offset + 3]! & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

/**
 * Generate the current TOTP code.
 */
export function generateTotp(config: TotpConfig): string {
  const period = config.period ?? 30;
  const digits = config.digits ?? 6;
  const algorithm = config.algorithm ?? "SHA1";
  const secret = base32Decode(config.secret);
  const counter = BigInt(Math.floor(Date.now() / 1000 / period));

  return generateHotp(secret, counter, digits, algorithm);
}

/**
 * Verify a TOTP code, checking a window of adjacent periods.
 * Returns true if the code is valid for any period within the window.
 */
export function verifyTotp(code: string, config: TotpConfig): boolean {
  const period = config.period ?? 30;
  const digits = config.digits ?? 6;
  const algorithm = config.algorithm ?? "SHA1";
  const window = config.window ?? 1;
  const secret = base32Decode(config.secret);
  const currentCounter = BigInt(Math.floor(Date.now() / 1000 / period));

  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + BigInt(i);
    const expected = generateHotp(secret, counter, digits, algorithm);
    // Constant-time comparison
    if (expected.length === code.length) {
      let mismatch = 0;
      for (let j = 0; j < expected.length; j++) {
        mismatch |= expected.charCodeAt(j) ^ code.charCodeAt(j);
      }
      if (mismatch === 0) return true;
    }
  }

  return false;
}

/**
 * Generate a provisioning URI for QR code generation.
 * Compatible with Google Authenticator, Authy, etc.
 */
export function generateTotpUri(
  config: TotpConfig,
  accountName: string,
  issuer: string
): string {
  const params = new URLSearchParams({
    secret: config.secret,
    issuer,
    algorithm: config.algorithm ?? "SHA1",
    digits: String(config.digits ?? 6),
    period: String(config.period ?? 30),
  });

  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Generate backup codes (one-time use recovery codes).
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(4);
    const code = bytes.toString("hex").toUpperCase();
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}
