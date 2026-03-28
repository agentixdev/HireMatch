/**
 * Tests for Gemini AI utility functions.
 * These test the prompt construction and JSON parsing logic,
 * mocking the actual Gemini API calls.
 */

// Mock the @google/generative-ai module
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
    __mockGenerateContent: mockGenerateContent,
  };
});

import { parseCVWithAI, parseJobDescriptionWithAI, computeMatchWithAI } from '@/lib/gemini';

// Get the mock function
const { __mockGenerateContent: mockGenerateContent } = jest.requireMock('@google/generative-ai');

describe('parseCVWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse CV text into structured data', async () => {
    const mockResponse = {
      full_name: 'Jane Smith',
      headline: 'Senior Software Engineer',
      skills: ['Python', 'React', 'AWS'],
      experience_years: 8,
      education: [{ institution: 'MIT', degree: 'BS', field: 'Computer Science', start_year: 2014, end_year: 2018 }],
      work_history: [{ company: 'Google', title: 'SWE', description: 'Built stuff', start_date: '2018-06', is_current: true, skills: ['Python'] }],
      certifications: ['AWS Solutions Architect'],
      languages: ['English', 'Spanish'],
      bio: 'Experienced software engineer with 8 years at top tech companies.',
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(mockResponse) },
    });

    const result = await parseCVWithAI('Jane Smith\nSenior Software Engineer\nGoogle 2018-present');
    expect(result.full_name).toBe('Jane Smith');
    expect(result.skills).toContain('Python');
    expect(result.experience_years).toBe(8);
  });

  it('should throw on invalid JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => 'Sorry, I cannot parse this CV.' },
    });

    await expect(parseCVWithAI('garbage text')).rejects.toThrow('LLM returned no valid JSON');
  });
});

describe('parseJobDescriptionWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse JD text into structured data', async () => {
    const mockResponse = {
      title: 'Full Stack Developer',
      requirements: ['3+ years experience', 'React expertise'],
      nice_to_haves: ['GraphQL knowledge'],
      skills_required: ['React', 'Node.js', 'PostgreSQL'],
      experience_min: 3,
      experience_max: 7,
      education_level: 'bachelor',
      match_tags: ['fullstack', 'react', 'nodejs'],
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(mockResponse) },
    });

    const result = await parseJobDescriptionWithAI('Full Stack Developer needed...');
    expect(result.title).toBe('Full Stack Developer');
    expect(result.skills_required).toContain('React');
  });
});

describe('computeMatchWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compute match score between candidate and job', async () => {
    const mockResponse = {
      score: 85,
      explanation: 'Strong skills match with relevant experience.',
      breakdown: { skills_score: 90, experience_score: 80, culture_score: 85 },
    };

    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(mockResponse) },
    });

    const result = await computeMatchWithAI(
      { skills: ['React', 'Node.js'], experience_years: 5, match_tags: ['fullstack'], bio: 'Full stack dev' },
      { skills_required: ['React'], requirements: ['3+ years'], match_tags: ['fullstack'], title: 'FS Dev', description: 'Build stuff' }
    );
    expect(result.score).toBe(85);
    expect(result.breakdown.skills_score).toBe(90);
  });
});
