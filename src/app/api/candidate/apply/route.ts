import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { parseLLMJson } from '@/lib/parse-json';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, method } = await request.json() as {
      job_id: string;
      method: 'quick' | 'ai_boost';
    };

    if (!job_id || !method) {
      return NextResponse.json({ error: 'Missing job_id or method' }, { status: 400 });
    }

    // Get candidate profile
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'No candidate profile found' }, { status: 404 });
    }

    // Get job details
    const service = await createServiceClient();
    const { data: job } = await service
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check for existing application
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('job_id', job_id)
      .single();

    let coverLetterResult: { cover_letter?: string; talking_points?: string[]; skills_gap?: string[] } = {};

    // Generate cover letter if AI Boost
    if (method === 'ai_boost') {
      const prompt = `You are an expert career coach. Write a tailored cover letter for this candidate applying to this job.

CANDIDATE:
- Name: ${candidate.full_name}
- Headline: ${candidate.headline || 'Not specified'}
- Skills: ${(candidate.skills || []).join(', ')}
- Experience: ${candidate.experience_years || 0} years
- Bio: ${candidate.bio || 'Not specified'}

JOB:
- Title: ${job.title}
- Company: ${job.company_name || 'Unknown'}
- Description: ${job.description || 'Not specified'}
- Required Skills: ${(job.skills_required || []).join(', ')}
- Industry: ${job.industry || 'Not specified'}

Return JSON: {
  "cover_letter": "The full cover letter text (3-4 paragraphs, professional tone)",
  "talking_points": ["Point 1", "Point 2", "Point 3"],
  "skills_gap": ["Any missing skills to mention"]
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      coverLetterResult = parseLLMJson<{
        cover_letter: string;
        talking_points: string[];
        skills_gap: string[];
      }>(text);
    }

    let applicationId: string;

    if (existingApp) {
      // Update existing application
      const updateData: Record<string, unknown> = { apply_method: method };
      if (coverLetterResult.cover_letter) {
        updateData.cover_letter = coverLetterResult.cover_letter;
      }

      await supabase
        .from('applications')
        .update(updateData)
        .eq('id', existingApp.id);

      applicationId = existingApp.id;
    } else {
      // Create new application
      const insertData: Record<string, unknown> = {
        candidate_id: candidate.id,
        job_id: job.id,
        recruiter_id: job.recruiter_id || null,
        status: 'applied',
        apply_method: method,
        external_url: job.external_url || null,
        status_history: [
          {
            status: 'applied',
            changed_at: new Date().toISOString(),
            changed_by: candidate.id,
          },
        ],
      };

      if (coverLetterResult.cover_letter) {
        insertData.cover_letter = coverLetterResult.cover_letter;
      }

      const { data: newApp, error } = await supabase
        .from('applications')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
      }

      applicationId = newApp.id;
    }

    // Increment applications count (fire-and-forget)
    service.rpc('increment_applications', { job_id }).then(() => {}, () => {});

    return NextResponse.json({
      ok: true,
      application_id: applicationId,
      ...(coverLetterResult.cover_letter && {
        cover_letter: coverLetterResult.cover_letter,
        talking_points: coverLetterResult.talking_points,
        skills_gap: coverLetterResult.skills_gap,
      }),
    });
  } catch (err) {
    console.error('[apply] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
