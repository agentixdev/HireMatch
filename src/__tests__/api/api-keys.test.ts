/**
 * @jest-environment node
 *
 * Unit tests for GET/POST/DELETE /api/v1/keys
 *
 * Covers:
 * - GET: unauthenticated returns 401
 * - GET: no recruiter profile returns 401
 * - GET: lists keys with recruiter tier
 * - POST: unauthenticated returns 401
 * - POST: free-plan recruiter returns 403
 * - POST: creates key with correct tier config
 * - POST: max 5 keys limit enforced
 * - POST: returns plaintext key only once
 * - POST: DB insert error returns 500
 * - DELETE: unauthenticated returns 401
 * - DELETE: missing id returns 400
 * - DELETE: revokes key successfully
 * - DELETE: DB error returns 500
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServiceFrom = jest.fn();

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: () => {},
  }),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: () => mockGetUser() },
  }),
}));

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

// Mock generateApiKey to return predictable values
jest.mock('@/lib/api-keys', () => ({
  generateApiKey: () => ({
    plaintext: 'hm_live_test1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    hash: 'fakehash123',
    prefix: 'hm_live_test...',
  }),
  API_TIERS: {
    starter: { name: 'Starter', ratePerMin: 30, monthlyQuota: 1_000, price: 0 },
    growth: { name: 'Growth', ratePerMin: 120, monthlyQuota: 25_000, price: 49 },
    enterprise: { name: 'Enterprise', ratePerMin: 600, monthlyQuota: 500_000, price: 199 },
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { GET, POST, DELETE } from '@/app/api/v1/keys/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, url: string, body?: unknown): Request {
  return {
    method,
    url,
    json: async () => body,
  } as unknown as Request;
}

const FAKE_USER = { id: 'user-rec-1', email: 'recruiter@test.com' };
const FAKE_RECRUITER = { id: 'rec-1', tier: 'pro', userId: 'user-rec-1' };

function mockRecruiterFound(tier = 'pro') {
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
  // First call to from('recruiters') for getRecruiter
  const mockSingle = jest.fn().mockResolvedValue({
    data: { id: 'rec-1', tier },
    error: null,
  });
  const mockEqUserId = jest.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEqUserId });
  return { mockSelect, mockSingle, mockEqUserId };
}

// ---------------------------------------------------------------------------
// Tests: GET /api/v1/keys
// ---------------------------------------------------------------------------

describe('GET /api/v1/keys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when no recruiter profile exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns keys with recruiter tier', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const fakeKeys = [
      { id: 'k1', name: 'Production', key_prefix: 'hm_live_abc...', tier: 'starter', is_active: true },
      { id: 'k2', name: 'Staging', key_prefix: 'hm_live_def...', tier: 'growth', is_active: false },
    ];

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: fakeKeys, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.keys).toEqual(fakeKeys);
    expect(data.tier).toBe('pro');
  });

  it('returns tier "free" when recruiter has no tier set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: null }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await GET();
    const data = await res.json();
    expect(data.tier).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/v1/keys
// ---------------------------------------------------------------------------

describe('POST /api/v1/keys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 for free-plan recruiters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'free' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'Test' }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('paid plan');
  });

  it('returns 403 when tier is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: null }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'Test' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when max 5 keys reached', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockEqActive = jest.fn().mockResolvedValue({ count: 5, error: null });
    const mockEqRecruiter = jest.fn().mockReturnValue({ eq: mockEqActive });
    const mockSelectCount = jest.fn().mockReturnValue({ eq: mockEqRecruiter });

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        return { select: mockSelectCount };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'Test' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Maximum 5');
  });

  it('creates key with correct tier config and returns plaintext', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockInsertSingle = jest.fn().mockResolvedValue({
      data: { id: 'key-new', name: 'My Key', key_prefix: 'hm_live_test...', tier: 'growth' },
      error: null,
    });
    const mockInsertSelect = jest.fn().mockReturnValue({ single: mockInsertSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockInsertSelect });

    const mockEqActive = jest.fn().mockResolvedValue({ count: 2, error: null });
    const mockEqRecruiter = jest.fn().mockReturnValue({ eq: mockEqActive });
    const mockSelectCount = jest.fn().mockReturnValue({ eq: mockEqRecruiter });

    let apiKeysCall = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        apiKeysCall++;
        if (apiKeysCall === 1) return { select: mockSelectCount };
        return { insert: mockInsert };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'My Key', tier: 'growth' }));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.key).toBe('hm_live_test1234567890abcdef1234567890abcdef1234567890abcdef12345678');
    expect(data.warning).toContain('not be shown again');

    // Check the insert was called with growth tier config
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      recruiter_id: 'rec-1',
      name: 'My Key',
      tier: 'growth',
      rate_limit_per_min: 120,
      monthly_quota: 25_000,
    }));
  });

  it('defaults to starter tier for unknown tier values', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockInsertSingle = jest.fn().mockResolvedValue({
      data: { id: 'key-new', name: 'Default', tier: 'starter' },
      error: null,
    });
    const mockInsertSelect = jest.fn().mockReturnValue({ single: mockInsertSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockInsertSelect });

    const mockEqActive = jest.fn().mockResolvedValue({ count: 0, error: null });
    const mockEqRecruiter = jest.fn().mockReturnValue({ eq: mockEqActive });
    const mockSelectCount = jest.fn().mockReturnValue({ eq: mockEqRecruiter });

    let apiKeysCall = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        apiKeysCall++;
        if (apiKeysCall === 1) return { select: mockSelectCount };
        return { insert: mockInsert };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { tier: 'invalid_tier' }));
    expect(res.status).toBe(201);

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'starter',
      rate_limit_per_min: 30,
      monthly_quota: 1_000,
    }));
  });

  it('returns 500 when DB insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockInsertSingle = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    });
    const mockInsertSelect = jest.fn().mockReturnValue({ single: mockInsertSingle });
    const mockInsert = jest.fn().mockReturnValue({ select: mockInsertSelect });

    const mockEqActive = jest.fn().mockResolvedValue({ count: 0, error: null });
    const mockEqRecruiter = jest.fn().mockReturnValue({ eq: mockEqActive });
    const mockSelectCount = jest.fn().mockReturnValue({ eq: mockEqRecruiter });

    let apiKeysCall = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        apiKeysCall++;
        if (apiKeysCall === 1) return { select: mockSelectCount };
        return { insert: mockInsert };
      }
      return {};
    });

    const res = await POST(makeRequest('POST', 'http://localhost/api/v1/keys', { name: 'Test' }));
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests: DELETE /api/v1/keys
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/keys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockServiceFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/keys?id=k1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/keys'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing key id');
  });

  it('revokes key successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockEqRecruiter = jest.fn().mockResolvedValue({ error: null });
    const mockEqKeyId = jest.fn().mockReturnValue({ eq: mockEqRecruiter });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqKeyId });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        return { update: mockUpdate };
      }
      return {};
    });

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/keys?id=key-123'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toBe('API key revoked');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      is_active: false,
    }));
  });

  it('returns 500 when revoke fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockEqRecruiter = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const mockEqKeyId = jest.fn().mockReturnValue({ eq: mockEqRecruiter });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEqKeyId });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'rec-1', tier: 'pro' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'api_keys') {
        return { update: mockUpdate };
      }
      return {};
    });

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/keys?id=key-123'));
    expect(res.status).toBe(500);
  });
});
