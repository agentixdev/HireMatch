import { authenticate, requireRole, requireScope, requireAll } from '../middleware';
import type { AuthContext, AuthRequest } from '../middleware';
import type { JwtConfig } from '../jwt';
import { generateTokenPair } from '../jwt';
import type { TokenPayload } from '../jwt';

const jwtConfig: JwtConfig = {
  secret: 'middleware-test-secret-key-long-enough',
  issuer: 'hirematch-test',
  audience: 'hirematch-test',
  accessTtl: 900,
  refreshTtl: 604800,
};

const testPayload: TokenPayload = {
  sub: 'user-abc',
  role: 'recruiter',
  orgId: 'org-xyz',
  scopes: ['read:candidates', 'write:jobs'],
  sessionId: 'sess-123',
};

function mockRequest(headers: Record<string, string>): AuthRequest {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: {
      get: (name: string) => map.get(name.toLowerCase()) ?? null,
    },
  };
}

describe('authenticate()', () => {
  it('rejects request with no Authorization header and no API key', async () => {
    const req = mockRequest({});
    const result = await authenticate(req, jwtConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Authentication required');
      expect(result.statusCode).toBe(401);
    }
  });

  it('rejects request with invalid Bearer token', async () => {
    const req = mockRequest({ authorization: 'Bearer invalid.token.here' });
    const result = await authenticate(req, jwtConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(401);
    }
  });

  it('accepts request with valid Bearer token', async () => {
    const pair = await generateTokenPair(testPayload, jwtConfig);
    const req = mockRequest({ authorization: `Bearer ${pair.accessToken}` });
    const result = await authenticate(req, jwtConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.userId).toBe('user-abc');
      expect(result.context.role).toBe('recruiter');
      expect(result.context.orgId).toBe('org-xyz');
      expect(result.context.scopes).toEqual(['read:candidates', 'write:jobs']);
      expect(result.context.authMethod).toBe('jwt');
    }
  });

  it('rejects refresh token used as access token', async () => {
    const pair = await generateTokenPair(testPayload, jwtConfig);
    const req = mockRequest({ authorization: `Bearer ${pair.refreshToken}` });
    const result = await authenticate(req, jwtConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Invalid token type');
      expect(result.statusCode).toBe(401);
    }
  });

  it('rejects Authorization header without Bearer prefix', async () => {
    const pair = await generateTokenPair(testPayload, jwtConfig);
    const req = mockRequest({ authorization: `Basic ${pair.accessToken}` });
    const result = await authenticate(req, jwtConfig);

    // Without Bearer, it falls through to API key check, then fails
    expect(result.ok).toBe(false);
  });

  it('authenticates via API key when lookupApiKey is provided', async () => {
    const { generateApiKey, hashApiKey } = await import('../api-key');
    const { key, hash } = generateApiKey('live');

    const lookupApiKey = jest.fn().mockResolvedValue({
      id: 'key-1',
      hash,
      orgId: 'org-key',
      name: 'Test Key',
      scopes: ['read:candidates'],
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    });

    const req = mockRequest({ 'x-api-key': key });
    const result = await authenticate(req, jwtConfig, lookupApiKey);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.orgId).toBe('org-key');
      expect(result.context.authMethod).toBe('api-key');
      expect(result.context.scopes).toEqual(['read:candidates']);
    }
  });

  it('rejects invalid API key', async () => {
    const lookupApiKey = jest.fn().mockResolvedValue(null);
    const req = mockRequest({ 'x-api-key': 'rm_live_invalidkeyhere000000000000000000000000' });
    const result = await authenticate(req, jwtConfig, lookupApiKey);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Invalid API key');
      expect(result.statusCode).toBe(401);
    }
  });

  it('rejects expired API key', async () => {
    const lookupApiKey = jest.fn().mockResolvedValue({
      id: 'key-2',
      hash: 'some-hash',
      orgId: 'org-exp',
      name: 'Expired Key',
      scopes: [],
      lastUsedAt: null,
      expiresAt: '2020-01-01T00:00:00.000Z', // expired
      createdAt: '2019-01-01T00:00:00.000Z',
    });

    const req = mockRequest({ 'x-api-key': 'rm_live_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' });
    const result = await authenticate(req, jwtConfig, lookupApiKey);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('API key expired');
    }
  });
});

describe('requireRole()', () => {
  const ctx: AuthContext = {
    userId: 'u1',
    role: 'recruiter',
    orgId: 'o1',
    scopes: ['read:candidates'],
    authMethod: 'jwt',
  };

  it('allows matching role', () => {
    const result = requireRole(ctx, 'recruiter');
    expect(result.ok).toBe(true);
  });

  it('allows when role matches one of multiple options', () => {
    const result = requireRole(ctx, 'admin', 'recruiter');
    expect(result.ok).toBe(true);
  });

  it('rejects insufficient role', () => {
    const result = requireRole(ctx, 'admin');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain('admin');
    }
  });

  it('rejects when no roles match', () => {
    const result = requireRole(ctx, 'admin', 'system');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });
});

describe('requireScope()', () => {
  const ctx: AuthContext = {
    userId: 'u2',
    role: 'recruiter',
    orgId: 'o2',
    scopes: ['read:candidates', 'write:jobs'],
    authMethod: 'jwt',
  };

  it('allows when all required scopes are present', () => {
    const result = requireScope(ctx, 'read:candidates', 'write:jobs');
    expect(result.ok).toBe(true);
  });

  it('allows single matching scope', () => {
    const result = requireScope(ctx, 'read:candidates');
    expect(result.ok).toBe(true);
  });

  it('rejects missing scope', () => {
    const result = requireScope(ctx, 'admin:all');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
      expect(result.error).toContain('admin:all');
    }
  });

  it('rejects when some scopes are missing', () => {
    const result = requireScope(ctx, 'read:candidates', 'write:billing');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('write:billing');
    }
  });

  it('admin:all scope grants everything', () => {
    const adminCtx: AuthContext = { ...ctx, scopes: ['admin:all'] };
    const result = requireScope(adminCtx, 'read:candidates', 'write:billing', 'admin:all');
    expect(result.ok).toBe(true);
  });
});

describe('requireAll()', () => {
  const ctx: AuthContext = {
    userId: 'u3',
    role: 'admin',
    orgId: 'o3',
    scopes: ['admin:all'],
    authMethod: 'jwt',
  };

  it('passes when all checks pass', () => {
    const result = requireAll(
      ctx,
      (c) => requireRole(c, 'admin'),
      (c) => requireScope(c, 'admin:all'),
    );
    expect(result.ok).toBe(true);
  });

  it('fails on first failing check', () => {
    const result = requireAll(
      { ...ctx, role: 'candidate' },
      (c) => requireRole(c, 'admin'),
      (c) => requireScope(c, 'admin:all'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(403);
    }
  });
});
