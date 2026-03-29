import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseLLMJson } from './parse-json';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY environment variable');

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

/** Return type for CV parsing */
export type ParsedCV = {
  full_name: string;
  headline: string;
  skills: string[];
  experience_years: number;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year?: number;
  }>;
  work_history: Array<{
    company: string;
    title: string;
    description: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    skills: string[];
  }>;
  certifications: string[];
  languages: string[];
  bio: string;
};

const CV_PARSE_PROMPT = `You are an expert CV/resume parser. Extract structured data from this CV.

CRITICAL RULES:
- "full_name" MUST be the person's full name from the CV. Never leave it empty.
- "headline" MUST be a professional headline (e.g. "Senior Software Engineer" or "Marketing Manager with 5 years experience"). Derive from their most recent job title if not explicitly stated.
- "bio" MUST be a 2-3 sentence professional summary. Write one from the CV content if not explicitly present.
- All fields are REQUIRED — never return empty strings or null for full_name, headline, or bio.

Return ONLY valid JSON with this EXACT structure (use these exact key names):
{
  "full_name": "The person's full name",
  "headline": "One-line professional headline",
  "skills": ["skill1", "skill2"],
  "experience_years": 0,
  "education": [{"institution": "", "degree": "", "field": "", "start_year": 0, "end_year": 0}],
  "work_history": [{"company": "", "title": "", "description": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "is_current": false, "skills": []}],
  "certifications": ["cert1"],
  "languages": ["English"],
  "bio": "2-3 sentence professional summary synthesized from the CV"
}`;

function parseJsonResponse(text: string): ParsedCV {
  return parseLLMJson<ParsedCV>(text);
}

/**
 * Parse a CV/resume from a PDF buffer using Gemini's native multimodal PDF support.
 * This sends the raw PDF bytes to Gemini, bypassing text extraction entirely.
 */
export async function parseCVFromPDF(pdfBuffer: Buffer): Promise<ParsedCV> {
  const base64Data = pdfBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data,
      },
    },
    { text: CV_PARSE_PROMPT },
  ]);

  const text = result.response.text();
  return parseJsonResponse(text);
}

/**
 * Parse a CV/resume PDF text into structured candidate data.
 */
export async function parseCVWithAI(cvText: string): Promise<{
  full_name: string;
  headline: string;
  skills: string[];
  experience_years: number;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    start_year: number;
    end_year?: number;
  }>;
  work_history: Array<{
    company: string;
    title: string;
    description: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    skills: string[];
  }>;
  certifications: string[];
  languages: string[];
  bio: string;
}> {
  const result = await model.generateContent(`${CV_PARSE_PROMPT}\n\nCV TEXT:\n${cvText}`);
  const text = result.response.text();
  return parseJsonResponse(text);
}

/**
 * Parse a job description into structured job data.
 */
export async function parseJobDescriptionWithAI(jdText: string): Promise<{
  title: string;
  requirements: string[];
  nice_to_haves: string[];
  skills_required: string[];
  experience_min: number;
  experience_max: number;
  education_level: string;
  match_tags: string[];
}> {
  const prompt = `You are an expert job description parser. Extract structured data from this JD.

Return ONLY valid JSON:
{
  "title": "job title",
  "requirements": ["req1", ...],
  "nice_to_haves": ["nice1", ...],
  "skills_required": ["skill1", ...],
  "experience_min": number,
  "experience_max": number,
  "education_level": "bachelor|master|phd|none",
  "match_tags": ["tag1", ...] // tags for matching algorithm
}

JOB DESCRIPTION:
${jdText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseLLMJson(text);
}

/**
 * Compute match score + explanation between a candidate and a job.
 */
export async function computeMatchWithAI(
  candidate: { skills: string[]; experience_years: number; match_tags: string[]; bio: string },
  job: { skills_required: string[]; requirements: string[]; match_tags: string[]; title: string; description: string }
): Promise<{ score: number; explanation: string; breakdown: Record<string, number> }> {
  const prompt = `You are a recruitment matching expert. Score how well this candidate matches this job.

CANDIDATE:
- Skills: ${candidate.skills.join(', ')}
- Experience: ${candidate.experience_years} years
- Tags: ${candidate.match_tags.join(', ')}
- Bio: ${candidate.bio}

JOB:
- Title: ${job.title}
- Required skills: ${job.skills_required.join(', ')}
- Requirements: ${job.requirements.join('; ')}
- Tags: ${job.match_tags.join(', ')}
- Description: ${job.description.slice(0, 500)}

Return ONLY valid JSON:
{
  "score": 0-100,
  "explanation": "2-3 sentences explaining the match",
  "breakdown": {
    "skills_score": 0-100,
    "experience_score": 0-100,
    "culture_score": 0-100
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return parseLLMJson(text);
}
