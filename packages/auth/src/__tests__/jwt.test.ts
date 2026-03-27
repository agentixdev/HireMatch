import { generateTokenPair, verifyToken, decodeToken, isTokenExpired } from '../jwt';
import type { TokenPayload, JwtConfig } from '../jwt';

const testConfig: JwtConfig = {
  secret: 'test-secret-key-for-jwt-testing-purposes-only',
  issuer: 'hirematch-test',
  audience: 'hirematch-test',
  accessTtl: 900,   // 15 min
  refreshTtl: 604800, // 7 days
};

const testPayload: TokenPayload = {
  sub: 'user-123',
  role: 'recruiter',
  orgId: 'org-456',
  scopes: ['read:candidates', 'write:jobs'],
  sessionId: 'session-789',
};

describe('generateTokenPair()', () => {
  it('creates access + refresh tokens', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);

    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(typeof pair.accessToken).toBe('string');
    expect(typeof pair.refreshToken).toBe('string');
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });

  it('tokens are valid JWTs (three dot-separated parts)', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);

    expect(pair.accessToken.split('.')).toHaveLength(3);
    expect(pair.refreshToken.split('.')).toHaveLength(3);
  });

  it('access token expires before refresh token', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);

    expect(pair.accessExpiresAt.getTime()).toBeLessThan(pair.refreshExpiresAt.getTime());
  });

  it('access token expires in ~15 minutes', async () => {
    const before = Date.now();
    const pair = await generateTokenPair(testPayload, testConfig);
    const expectedExpiry = before + 900 * 1000;

    // Allow 5 second tolerance
    expect(Math.abs(pair.accessExpiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
  });

  it('refresh token expires in ~7 days', async () => {
    const before = Date.now();
    const pair = await generateTokenPair(testPayload, testConfig);
    const expectedExpiry = before + 604800 * 1000;

    expect(Math.abs(pair.refreshExpiresAt.getTime() - expectedExpiry)).toBeLessThan(5000);
  });
});

describe('verifyToken()', () => {
  it('validates a correct access token', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const payload = await verifyToken(pair.accessToken, testConfig);

    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('recruiter');
    expect(payload.orgId).toBe('org-456');
    expect(payload.scopes).toEqual(['read:candidates', 'write:jobs']);
    expect(payload.sid).toBe('session-789');
    expect(payload.type).toBe('access');
  });

  it('validates a correct refresh token', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const payload = await verifyToken(pair.refreshToken, testConfig);

    expect(payload.sub).toBe('user-123');
    expect(payload.sid).toBe('session-789');
    expect(payload.type).toBe('refresh');
  });

  it('rejects token with wrong secret', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const wrongConfig = { ...testConfig, secret: 'wrong-secret-key-for-testing' };

    await expect(verifyToken(pair.accessToken, wrongConfig)).rejects.toThrow();
  });

  it('rejects token with wrong issuer', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const wrongConfig = { ...testConfig, issuer: 'wrong-issuer' };

    await expect(verifyToken(pair.accessToken, wrongConfig)).rejects.toThrow();
  });

  it('rejects token with wrong audience', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const wrongConfig = { ...testConfig, audience: 'wrong-audience' };

    await expect(verifyToken(pair.accessToken, wrongConfig)).rejects.toThrow();
  });

  it('rejects expired token', async () => {
    const expiredConfig = { ...testConfig, accessTtl: 0 };
    const pair = await generateTokenPair(testPayload, expiredConfig);

    // Token with 0 TTL should be expired immediately or within milliseconds
    // Need a small wait to ensure the token is past expiration
    await new Promise((r) => setTimeout(r, 1100));

    await expect(verifyToken(pair.accessToken, testConfig)).rejects.toThrow();
  });

  it('rejects garbage token', async () => {
    await expect(verifyToken('not.a.token', testConfig)).rejects.toThrow();
  });
});

describe('decodeToken()', () => {
  it('decodes a valid token without verification', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    const decoded = decodeToken(pair.accessToken);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe('user-123');
  });

  it('returns null for invalid token', () => {
    expect(decodeToken('garbage')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeToken('')).toBeNull();
  });
});

describe('isTokenExpired()', () => {
  it('returns false for a fresh token', async () => {
    const pair = await generateTokenPair(testPayload, testConfig);
    expect(isTokenExpired(pair.accessToken)).toBe(false);
  });

  it('returns true for garbage input', () => {
    expect(isTokenExpired('not-a-token')).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isTokenExpired('')).toBe(true);
  });
});
