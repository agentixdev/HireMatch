/**
 * Tests for the parse-cv API route.
 *
 * Since Next.js server modules require Web APIs (Request/Response) that don't exist
 * in jsdom, we mock `next/server` completely and test the route handler with
 * mock request objects.
 */

// ── Mock next/server (must be before any imports) ───────────────
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

// ── Mocks ──────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockUpdateEq = jest.fn();
const mockSelectEqSingle = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    storage: {
      from: jest.fn().mockReturnValue({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: (...args: unknown[]) => mockUpdateEq(...args),
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: (...args: unknown[]) => mockSelectEqSingle(...args),
        }),
      }),
    }),
  }),
}));

jest.mock('@/lib/gemini', () => ({
  parseCVWithAI: jest.fn().mockResolvedValue({
    full_name: 'Test User',
    headline: 'Software Engineer',
    skills: ['JavaScript', 'React'],
    experience_years: 5,
    education: [],
    work_history: [],
    certifications: [],
    languages: ['English'],
    bio: 'A test bio.',
  }),
  parseCVFromPDF: jest.fn().mockResolvedValue({
    full_name: 'Test User',
    headline: 'Software Engineer',
    skills: ['JavaScript', 'React'],
    experience_years: 5,
    education: [],
    work_history: [],
    certifications: [],
    languages: ['English'],
    bio: 'A test bio.',
  }),
}));

jest.mock('@/lib/photo-extraction', () => ({
  extractPhotoFromPDF: jest.fn().mockReturnValue(null),
  extractPhotoFromDOCX: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 99 }),
}));

jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'Parsed PDF text' }), { virtual: true });

// ── Import the route AFTER all mocks ────────────────────────────

import { POST } from '@/app/api/parse-cv/route';

// ── Request builder ─────────────────────────────────────────────

interface MockFile {
  name: string;
  type: string;
  content: string;
}

function makeRequest(file: MockFile | null) {
  return {
    formData: async () => {
      const map = new Map<string, unknown>();
      if (file) {
        map.set('cv', {
          name: file.name,
          type: file.type,
          arrayBuffer: async () => {
            const buf = Buffer.from(file.content);
            return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
          },
        });
      }
      return {
        get: (key: string) => map.get(key) ?? null,
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ── Tests ───────────────────────────────────────────────────────

describe('POST /api/parse-cv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/cv.pdf' } });
    mockUpload.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
    mockSelectEqSingle.mockResolvedValue({ data: null });
  });

  it('returns 401 when no auth user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ name: 'resume.pdf', type: 'application/pdf', content: 'hello' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 when no file uploaded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest(null));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: 'No file uploaded' });
  });

  it('returns 400 for unsupported file type (image/png)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'photo.png', type: 'image/png', content: 'data' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).error).toContain('Unsupported file type');
  });

  it('returns 400 for unsupported file type (application/json)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'data.json', type: 'application/json', content: '{}' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).error).toContain('Unsupported file type');
  });

  it('accepts application/pdf file type and returns parsed data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'resume.pdf', type: 'application/pdf', content: '%PDF-1.4 content' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).parsed.full_name).toBe('Test User');
  });

  it('accepts text/plain file type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'resume.txt', type: 'text/plain', content: 'My resume content here with enough text to pass check.' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).ok).toBe(true);
  });

  it('accepts application/msword file type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'resume.doc', type: 'application/msword', content: 'fake doc content' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).ok).toBe(true);
  });

  it('accepts docx file type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({
      name: 'resume.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: 'fake docx content',
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).ok).toBe(true);
  });

  it('returns cv_url in response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'resume.txt', type: 'text/plain', content: 'test content' }));
    const json = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).cv_url).toBe('https://storage.example.com/cv.pdf');
  });

  it('returns 500 when storage upload fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUpload.mockResolvedValue({ error: { message: 'Storage full' } });

    const res = await POST(makeRequest({ name: 'resume.txt', type: 'text/plain', content: 'test' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).error).toContain('File upload failed');
  });

  it('returns 500 when candidate update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUpdateEq.mockResolvedValue({ error: { message: 'DB error' } });

    const res = await POST(makeRequest({ name: 'resume.txt', type: 'text/plain', content: 'test' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((json as any).error).toBe('Failed to update profile');
  });

  it('returns parsed skills array in response', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const res = await POST(makeRequest({ name: 'resume.txt', type: 'text/plain', content: 'content' }));
    const json = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = (json as any).parsed;
    expect(parsed.skills).toEqual(['JavaScript', 'React']);
    expect(parsed.headline).toBe('Software Engineer');
  });
});
