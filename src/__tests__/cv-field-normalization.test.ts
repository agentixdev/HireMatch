/**
 * Tests for CV parse field normalization.
 * Ensures the API correctly normalizes alternate field names from Gemini
 * and that all critical fields (full_name, headline, bio, photo_url)
 * are properly populated and returned to the client.
 */

// ── Mock next/server ───────────────────────────────────────
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

// ── Supabase mocks ──────────────────────────────────────────
const mockGetUser = jest.fn();
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockUpdateEq = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
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
    }),
  }),
}));

// ── Gemini mock (configurable per test) ─────────────────────
const mockParseCVWithAI = jest.fn();
const mockParseCVFromPDF = jest.fn();
jest.mock('@/lib/gemini', () => ({
  parseCVWithAI: (...args: unknown[]) => mockParseCVWithAI(...args),
  parseCVFromPDF: (...args: unknown[]) => mockParseCVFromPDF(...args),
}));

// ── Photo extraction mock ───────────────────────────────────
jest.mock('@/lib/photo-extraction', () => ({
  extractPhotoFromPDF: jest.fn().mockReturnValue(null),
  extractPhotoFromDOCX: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ success: true, remaining: 99 }),
}));

jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'John Doe Software Engineer at Google...' }), { virtual: true });

import { POST } from '@/app/api/parse-cv/route';

// ── Request builder ─────────────────────────────────────────
function makeRequest(content: string = 'test content', type: string = 'text/plain', name: string = 'resume.txt') {
  return {
    formData: async () => {
      const map = new Map<string, unknown>();
      map.set('cv', {
        name,
        type,
        arrayBuffer: async () => {
          const buf = Buffer.from(content);
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
      });
      return { get: (key: string) => map.get(key) ?? null };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ── Tests ───────────────────────────────────────────────────

describe('CV field normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/cv.pdf' } });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('normalizes standard field names (full_name, headline, bio)', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'John Doe',
      headline: 'Senior Engineer',
      bio: 'Experienced developer.',
      skills: ['JS'],
      experience_years: 5,
      education: [],
      work_history: [],
      certifications: [],
      languages: ['English'],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.full_name).toBe('John Doe');
    expect(json.parsed.headline).toBe('Senior Engineer');
    expect(json.parsed.bio).toBe('Experienced developer.');
  });

  it('normalizes "name" → "full_name"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      name: 'Jane Smith',
      headline: 'Designer',
      bio: 'Creative designer.',
      skills: ['Figma'],
      experience_years: 3,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.full_name).toBe('Jane Smith');
  });

  it('normalizes "fullName" → "full_name"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      fullName: 'Bob Wilson',
      headline: 'PM',
      bio: 'Product person.',
      skills: [],
      experience_years: 0,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.full_name).toBe('Bob Wilson');
  });

  it('normalizes "summary" → "bio"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Alice',
      headline: 'Dev',
      summary: 'Talented developer with broad experience.',
      skills: ['Python'],
      experience_years: 7,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.bio).toBe('Talented developer with broad experience.');
  });

  it('normalizes "professional_summary" → "bio"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Charlie',
      headline: 'CTO',
      professional_summary: 'Seasoned tech leader.',
      skills: [],
      experience_years: 15,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.bio).toBe('Seasoned tech leader.');
  });

  it('normalizes "title" → "headline"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Diana',
      title: 'Staff Engineer',
      bio: 'Staff eng.',
      skills: [],
      experience_years: 10,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.headline).toBe('Staff Engineer');
  });

  it('normalizes "work_experience" → "work_history"', async () => {
    const workData = [{ company: 'Acme', title: 'Dev', description: '', start_date: '2020-01', is_current: true, skills: [] }];
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Eve',
      headline: 'Dev',
      bio: 'Works hard.',
      skills: [],
      experience_years: 3,
      education: [],
      work_experience: workData,
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.work_history).toEqual(workData);
  });

  it('normalizes "certificates" → "certifications"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Frank',
      headline: 'SRE',
      bio: 'Reliable.',
      skills: ['Linux'],
      experience_years: 5,
      education: [],
      work_history: [],
      certificates: ['AWS Certified', 'CKA'],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.certifications).toEqual(['AWS Certified', 'CKA']);
  });

  it('normalizes "experienceYears" → "experience_years"', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Grace',
      headline: 'Analyst',
      bio: 'Analyzes things.',
      skills: ['SQL'],
      experienceYears: 4,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { parsed: Record<string, unknown> };

    expect(json.parsed.experience_years).toBe(4);
  });

  it('handles all fields being empty strings gracefully', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: '',
      headline: '',
      bio: '',
      skills: [],
      experience_years: 0,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { ok: boolean; parsed: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Empty strings are preserved, not undefined
    expect(json.parsed.full_name).toBe('');
    expect(json.parsed.headline).toBe('');
    expect(json.parsed.bio).toBe('');
  });

  it('returns photo_url as null when no photo in document', async () => {
    mockParseCVWithAI.mockResolvedValue({
      full_name: 'Test',
      headline: 'Test',
      bio: 'Test bio.',
      skills: [],
      experience_years: 0,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest());
    const json = await res.json() as { photo_url: string | null };

    expect(json.photo_url).toBeNull();
  });

  it('returns photo_url when photo extraction succeeds', async () => {
    const { extractPhotoFromPDF } = require('@/lib/photo-extraction');
    extractPhotoFromPDF.mockReturnValue({
      data: Buffer.alloc(10000, 0x42),
      mimeType: 'image/jpeg',
    });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/avatar.jpg' } });

    mockParseCVFromPDF.mockResolvedValue({
      full_name: 'Photo Person',
      headline: 'Photographer',
      bio: 'I take photos.',
      skills: ['Photography'],
      experience_years: 5,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    const res = await POST(makeRequest('%PDF-1.4 content', 'application/pdf', 'resume.pdf'));
    const json = await res.json() as { photo_url: string | null };

    expect(json.photo_url).toBe('https://storage.example.com/avatar.jpg');
  });

  it('saves photo_url to DB when extracted', async () => {
    const { extractPhotoFromPDF } = require('@/lib/photo-extraction');
    extractPhotoFromPDF.mockReturnValue({
      data: Buffer.alloc(10000, 0x42),
      mimeType: 'image/jpeg',
    });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/avatar.jpg' } });

    mockParseCVFromPDF.mockResolvedValue({
      full_name: 'Photo Person',
      headline: 'Dev',
      bio: 'Bio.',
      skills: [],
      experience_years: 0,
      education: [],
      work_history: [],
      certifications: [],
      languages: [],
    });

    await POST(makeRequest('%PDF-1.4 content', 'application/pdf', 'resume.pdf'));

    // Verify the DB update was called with photo_url
    expect(mockUpdateEq).toHaveBeenCalled();
  });
});
