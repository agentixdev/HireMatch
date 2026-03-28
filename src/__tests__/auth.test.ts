/**
 * Auth API tests — signup and password reset flows.
 *
 * These tests mock Supabase admin API and Resend to validate
 * the request/response logic without hitting real services.
 */

// ---------------------------------------------------------------------------
// Mocks — must be defined before imports
// ---------------------------------------------------------------------------

const mockCreateUser = jest.fn();
const mockUpdateUserById = jest.fn();
const mockListUsers = jest.fn();
const mockInsert = jest.fn();
const mockEmailSend = jest.fn();

// Mock next/server — NextResponse.json needs to return a Response-like object
jest.mock('next/server', () => {
  class MockNextResponse {
    body: string;
    status: number;
    headers: Map<string, string>;

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    async json() {
      return JSON.parse(this.body);
    }

    static json(data: unknown, init?: { status?: number }) {
      return new MockNextResponse(JSON.stringify(data), { status: init?.status || 200 });
    }
  }

  return { NextResponse: MockNextResponse };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
        listUsers: mockListUsers,
      },
    },
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailSend },
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as Request;
}

// ---------------------------------------------------------------------------
// Signup tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/signup', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/signup/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockEmailSend.mockResolvedValue({ data: { id: 'msg_1' } });
  });

  it('rejects missing fields', async () => {
    const res = await handler(makeRequest({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it('rejects short passwords', async () => {
    const res = await handler(makeRequest({ email: 'a@b.com', password: '123', role: 'candidate' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/);
  });

  it('rejects invalid role', async () => {
    const res = await handler(makeRequest({ email: 'a@b.com', password: '12345678', role: 'admin' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid role/);
  });

  it('creates candidate successfully', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'user-123', user_metadata: {} } },
      error: null,
    });

    const res = await handler(makeRequest({
      email: 'test@example.com',
      password: 'securepass',
      fullName: 'Test User',
      role: 'candidate',
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.userId).toBe('user-123');
    expect(body.role).toBe('candidate');

    // Verify createUser was called with auto-confirm
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      email_confirm: true,
    }));
  });

  it('creates recruiter successfully', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'user-456', user_metadata: {} } },
      error: null,
    });

    const res = await handler(makeRequest({
      email: 'rec@example.com',
      password: 'securepass',
      fullName: 'Acme Corp',
      role: 'recruiter',
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.role).toBe('recruiter');
  });

  it('returns 409 for duplicate email', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    });

    const res = await handler(makeRequest({
      email: 'existing@example.com',
      password: 'securepass',
      fullName: 'Dup User',
      role: 'candidate',
    }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already exists/i);
  });

  it('normalizes email to lowercase', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'user-789', user_metadata: {} } },
      error: null,
    });

    await handler(makeRequest({
      email: 'Test@Example.COM',
      password: 'securepass',
      fullName: 'Test',
      role: 'candidate',
    }));

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
    }));
  });
});

// ---------------------------------------------------------------------------
// Password reset tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/reset-password', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    const mod = await import('@/app/api/auth/reset-password/route');
    handler = mod.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockEmailSend.mockResolvedValue({ data: { id: 'msg_1' } });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects missing email on request', async () => {
    const res = await handler(makeRequest({ action: 'request' }));
    expect(res.status).toBe(400);
  });

  it('returns success even for non-existent email (no information leak)', async () => {
    mockListUsers.mockResolvedValue({ data: { users: [] } });

    const res = await handler(makeRequest({ email: 'nobody@example.com', action: 'request' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('stores OTP in user_metadata when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: { role: 'candidate', full_name: 'Test' },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const res = await handler(makeRequest({ email: 'user@test.com', action: 'request' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.requiresCode).toBe(true);

    // Verify OTP was stored in user_metadata
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-100', expect.objectContaining({
      user_metadata: expect.objectContaining({
        reset_otp: expect.stringMatching(/^\d{6}$/),
        reset_otp_expires: expect.any(Number),
        role: 'candidate',
        full_name: 'Test',
      }),
    }));
  });

  it('verifies OTP from user_metadata', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: {
        role: 'candidate',
        reset_otp: '123456',
        reset_otp_expires: Date.now() + 10 * 60 * 1000,
      },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });

    const res = await handler(makeRequest({
      email: 'user@test.com',
      code: '123456',
      action: 'verify',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
  });

  it('rejects expired OTP', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: {
        reset_otp: '123456',
        reset_otp_expires: Date.now() - 1000,
      },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });

    const res = await handler(makeRequest({
      email: 'user@test.com',
      code: '123456',
      action: 'verify',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/expired/i);
  });

  it('rejects wrong OTP', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: {
        reset_otp: '123456',
        reset_otp_expires: Date.now() + 10 * 60 * 1000,
      },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });

    const res = await handler(makeRequest({
      email: 'user@test.com',
      code: '000000',
      action: 'verify',
    }));
    expect(res.status).toBe(400);
  });

  it('resets password and clears OTP from metadata', async () => {
    process.env.RESEND_API_KEY = 'test_key';
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: {
        role: 'candidate',
        full_name: 'Test',
        reset_otp: '123456',
        reset_otp_expires: Date.now() + 10 * 60 * 1000,
      },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const res = await handler(makeRequest({
      email: 'user@test.com',
      newPassword: 'newSecure1',
      code: '123456',
      action: 'reset',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify password was updated and OTP was cleared
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-100', expect.objectContaining({
      password: 'newSecure1',
      user_metadata: expect.objectContaining({
        role: 'candidate',
        full_name: 'Test',
      }),
    }));

    // Ensure OTP fields are NOT in the updated metadata
    const updateCall = mockUpdateUserById.mock.calls[0][1];
    expect(updateCall.user_metadata).not.toHaveProperty('reset_otp');
    expect(updateCall.user_metadata).not.toHaveProperty('reset_otp_expires');
  });

  it('rejects reset with short password', async () => {
    const res = await handler(makeRequest({
      email: 'user@test.com',
      newPassword: '123',
      action: 'reset',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/);
  });

  it('allows direct reset without OTP when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const testUser = {
      id: 'user-100',
      email: 'user@test.com',
      user_metadata: { role: 'candidate' },
    };
    mockListUsers.mockResolvedValue({ data: { users: [testUser] } });
    mockUpdateUserById.mockResolvedValue({ error: null });

    const res = await handler(makeRequest({
      email: 'user@test.com',
      newPassword: 'newSecure1',
      action: 'reset',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('rejects invalid action', async () => {
    const res = await handler(makeRequest({ action: 'invalid' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid action/);
  });
});
