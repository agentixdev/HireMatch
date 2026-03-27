import {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  validateApiKey,
  isTestKey,
  getKeyMode,
} from '../api-key';

describe('generateApiKey()', () => {
  it('returns key with rm_live_ prefix for live mode', () => {
    const result = generateApiKey('live');
    expect(result.key).toMatch(/^rm_live_/);
  });

  it('returns key with rm_test_ prefix for test mode', () => {
    const result = generateApiKey('test');
    expect(result.key).toMatch(/^rm_test_/);
  });

  it('defaults to live mode', () => {
    const result = generateApiKey();
    expect(result.key).toMatch(/^rm_live_/);
  });

  it('key body is base64url-encoded (43 chars for 32 bytes)', () => {
    const result = generateApiKey('live');
    const body = result.key.slice('rm_live_'.length);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes -> ceil(32*4/3) = 43 chars in base64url
    expect(body.length).toBe(43);
  });

  it('returns a valid SHA-256 hash (64 hex chars)', () => {
    const result = generateApiKey();
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns a preview in format prefix...suffix', () => {
    const result = generateApiKey('live');
    expect(result.preview).toMatch(/^rm_live_\w{3}\.{3}\w{4}$/);
  });

  it('returns createdAt as a Date', () => {
    const result = generateApiKey();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('generates unique keys each time', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().key));
    expect(keys.size).toBe(50);
  });
});

describe('hashApiKey()', () => {
  it('produces consistent SHA-256 hash for same input', () => {
    const key = 'rm_live_abcdef1234567890ABCDEF1234567890abcde';
    const h1 = hashApiKey(key);
    const h2 = hashApiKey(key);
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different keys', () => {
    const h1 = hashApiKey('rm_live_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    const h2 = hashApiKey('rm_live_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    expect(h1).not.toBe(h2);
  });

  it('produces 64-char hex string', () => {
    const { key } = generateApiKey();
    const hash = hashApiKey(key);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('uses different HMAC key for live vs test prefixes', () => {
    // Same body, different prefix -> different hash
    const body = 'abcdef1234567890ABCDEF1234567890abcde1234567';
    const livHash = hashApiKey(`rm_live_${body}`);
    const testHash = hashApiKey(`rm_test_${body}`);
    expect(livHash).not.toBe(testHash);
  });
});

describe('isValidApiKeyFormat()', () => {
  it('returns true for valid live key', () => {
    const { key } = generateApiKey('live');
    expect(isValidApiKeyFormat(key)).toBe(true);
  });

  it('returns true for valid test key', () => {
    const { key } = generateApiKey('test');
    expect(isValidApiKeyFormat(key)).toBe(true);
  });

  it('returns false for missing prefix', () => {
    expect(isValidApiKeyFormat('invalid_key_here')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidApiKeyFormat('')).toBe(false);
  });

  it('returns false for key with too-short body', () => {
    expect(isValidApiKeyFormat('rm_live_abc')).toBe(false);
  });
});

describe('validateApiKey()', () => {
  it('returns true for matching key and hash', () => {
    const { key, hash } = generateApiKey();
    expect(validateApiKey(key, hash)).toBe(true);
  });

  it('returns false for wrong hash', () => {
    const { key } = generateApiKey();
    const wrongHash = 'a'.repeat(64);
    expect(validateApiKey(key, wrongHash)).toBe(false);
  });

  it('returns false for invalid key format', () => {
    expect(validateApiKey('bad-key', 'a'.repeat(64))).toBe(false);
  });

  it('returns false for tampered key', () => {
    const { key, hash } = generateApiKey();
    const tampered = key.slice(0, -1) + 'X';
    expect(validateApiKey(tampered, hash)).toBe(false);
  });
});

describe('isTestKey()', () => {
  it('returns true for test key', () => {
    const { key } = generateApiKey('test');
    expect(isTestKey(key)).toBe(true);
  });

  it('returns false for live key', () => {
    const { key } = generateApiKey('live');
    expect(isTestKey(key)).toBe(false);
  });
});

describe('getKeyMode()', () => {
  it('returns "live" for live key', () => {
    const { key } = generateApiKey('live');
    expect(getKeyMode(key)).toBe('live');
  });

  it('returns "test" for test key', () => {
    const { key } = generateApiKey('test');
    expect(getKeyMode(key)).toBe('test');
  });

  it('returns "unknown" for invalid prefix', () => {
    expect(getKeyMode('invalid_key')).toBe('unknown');
  });
});
