import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
  const prompt = `You are an expert CV/resume parser. Extract structured data from this CV text.

Return ONLY valid JSON with this exact structure:
{
  "full_name": "string",
  "headline": "one-line professional headline",
  "skills": ["skill1", "skill2", ...],
  "experience_years": number,
  "education": [{"institution": "", "degree": "", "field": "", "start_year": 0, "end_year": 0}],
  "work_history": [{"company": "", "title": "", "description": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM or null", "is_current": false, "skills": []}],
  "certifications": ["cert1", ...],
  "languages": ["English", ...],
  "bio": "2-3 sentence professional summary"
}

CV TEXT:
${cvText}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse CV: no JSON in response');
  return JSON.parse(jsonMatch[0]);
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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse JD: no JSON in response');
  return JSON.parse(jsonMatch[0]);
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
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to compute match');
  return JSON.parse(jsonMatch[0]);
}
