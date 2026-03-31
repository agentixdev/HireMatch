/**
 * @jest-environment node
 *
 * Unit tests for GET/POST /api/notifications
 *
 * Covers:
 * - Unauthenticated users get empty notifications (GET polls on all pages)
 * - Authenticated users get their notifications
 * - Unread count is returned
 * - POST mark-all-read
 * - POST mark-specific-ids-read
 * - POST with bad body returns 400
 * - Internal errors return 500
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports
// ---------------------------------------------------------------------------

const mockGetUser = jest.fn();
const mockServiceSelect = jest.fn();
const mockServiceSelectCount = jest.fn();
const mockServiceUpdate = jest.fn();

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
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
  createServiceClient: jest.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockServiceFrom(...args),
  }),
}));

// ---------------------------------------------------------------------------
// Import route handler AFTER mocks
// ---------------------------------------------------------------------------
import { GET, POST } from '@/app/api/notifications/route';

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

const FAKE_USER = { id: 'user-123', email: 'test@test.com' };

const FAKE_NOTIFICATIONS = [
  { id: 'n1', type: 'match_found', title: 'New match!', body: 'You matched', is_read: false, created_at: '2026-03-31T00:00:00Z' },
  { id: 'n2', type: 'system', title: 'Welcome', body: 'Welcome to HireMatch', is_read: true, created_at: '2026-03-30T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty notifications for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest('GET', 'http://localhost/api/notifications?limit=10'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.notifications).toEqual([]);
    expect(data.unread_count).toBe(0);
  });

  it('returns empty notifications when getUser throws', async () => {
    mockGetUser.mockRejectedValue(new Error('Cookie parse error'));

    const res = await GET(makeRequest('GET', 'http://localhost/api/notifications?limit=10'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.notifications).toEqual([]);
    expect(data.unread_count).toBe(0);
  });

  it('returns notifications for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    // Mock the query chain: from('notifications').select('*').eq('user_id', ...).order(...).range(...)
    const mockRange = jest.fn().mockResolvedValue({ data: FAKE_NOTIFICATIONS, error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelectAll = jest.fn().mockReturnValue({ eq: mockEq });

    // Mock the count query: from('notifications').select('id', { count: ... }).eq(...).eq(...)
    const mockCountEq2 = jest.fn().mockResolvedValue({ count: 1, error: null });
    const mockCountEq1 = jest.fn().mockReturnValue({ eq: mockCountEq2 });
    const mockCountSelect = jest.fn().mockReturnValue({ eq: mockCountEq1 });

    let callCount = 0;
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'notifications') {
        callCount++;
        if (callCount === 1) {
          return { select: mockSelectAll };
        }
        return { select: mockCountSelect };
      }
      return {};
    });

    const res = await GET(makeRequest('GET', 'http://localhost/api/notifications?limit=10'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.notifications).toEqual(FAKE_NOTIFICATIONS);
    expect(data.unread_count).toBe(1);
    expect(mockServiceFrom).toHaveBeenCalledWith('notifications');
  });

  it('handles unread_only filter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockRange = jest.fn().mockResolvedValue({ data: [FAKE_NOTIFICATIONS[0]], error: null });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    // When unread_only=true, the chain is .eq('user_id').order().range() then .eq('is_read', false)
    // But Supabase chains are: query.eq('user_id', ...).order(...).range(...)
    // then if unread_only: query = query.eq('is_read', false) — this is called AFTER the order
    // Looking at the code: query is built with .eq('user_id') first, then .order(), then .range()
    // Then if (unreadOnly) query = query.eq('is_read', false) — BUT this is before range is awaited
    // Actually the code builds the query then calls .eq on it. Let me trace:
    // let query = service.from('notifications').select('*').eq('user_id', user.id).order(...).range(...)
    // if (unreadOnly) query = query.eq('is_read', false)
    // But .range() returns a promise... Actually in Supabase, chaining is fluent, range doesn't execute.
    // So: .select().eq().order().range() returns a chainable, then .eq() is called on that.
    // So the mock needs: range returns an object with .eq method for the unread filter
    const mockUnreadEq = jest.fn().mockResolvedValue({ data: [FAKE_NOTIFICATIONS[0]], error: null });
    mockRange.mockReturnValue({ eq: mockUnreadEq });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelectAll = jest.fn().mockReturnValue({ eq: mockEq });

    const mockCountEq2 = jest.fn().mockResolvedValue({ count: 1, error: null });
    const mockCountEq1 = jest.fn().mockReturnValue({ eq: mockCountEq2 });
    const mockCountSelect = jest.fn().mockReturnValue({ eq: mockCountEq1 });

    let callCount = 0;
    mockServiceFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { select: mockSelectAll };
      return { select: mockCountSelect };
    });

    const res = await GET(makeRequest('GET', 'http://localhost/api/notifications?limit=10&unread_only=true'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toHaveLength(1);
  });

  it('returns 500 when query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockRange = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockSelectAll = jest.fn().mockReturnValue({ eq: mockEq });

    mockServiceFrom.mockReturnValue({ select: mockSelectAll });

    const res = await GET(makeRequest('GET', 'http://localhost/api/notifications?limit=10'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 for unauthenticated user on POST', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest('POST', 'http://localhost/api/notifications', { all: true }));
    // POST still returns 401 (unlike GET which returns empty)
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('marks all notifications as read', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockUpdateEq2 = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 });
    mockServiceFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(makeRequest('POST', 'http://localhost/api/notifications', { all: true }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
  });

  it('marks specific notification ids as read', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockIn = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateEq = jest.fn().mockReturnValue({ in: mockIn });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });
    mockServiceFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(makeRequest('POST', 'http://localhost/api/notifications', { ids: ['n1', 'n2'] }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockIn).toHaveBeenCalledWith('id', ['n1', 'n2']);
  });

  it('returns 400 for bad body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const res = await POST(makeRequest('POST', 'http://localhost/api/notifications', { foo: 'bar' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when mark-all fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: FAKE_USER } });

    const mockUpdateEq2 = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const mockUpdateEq1 = jest.fn().mockReturnValue({ eq: mockUpdateEq2 });
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq1 });
    mockServiceFrom.mockReturnValue({ update: mockUpdate });

    const res = await POST(makeRequest('POST', 'http://localhost/api/notifications', { all: true }));
    expect(res.status).toBe(500);
  });
});
