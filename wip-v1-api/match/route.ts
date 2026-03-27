import { NextRequest } from 'next/server';
import { pipeline } from '../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../_lib/response';
import { getCurrentOrg, requireScope } from '../_lib/auth-helpers';
import { getServiceClient } from '../_lib/db';
import { computeMatchWithAI } from '@/lib/gemini';

interface MatchBody {
  candidate_id?: string;
  cv_text?: string;
  job_id: string;
}

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'match:run')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: match:run', 403);
  }

  const body: MatchBody = await request.json().catch(() => ({} as MatchBody));
  if (!body.job_id) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'job_id is required', 400);
  }
  if (!body.candidate_id && !body.cv_text) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Either candidate_id or cv_text is required',
      400
    );
  }

  const db = getServiceClient();

  // Fetch the job
  const { data: job, error: jobError } = await db
    .from('jobs')
    .select('*')
    .eq('id', body.job_id)
    .single();

  if (jobError || !job) {
    return errorResponse(ErrorCode.NOT_FOUND, `Job ${body.job_id} not found`, 404);
  }

  // Get candidate data
  let candidateData: {
    skills: string[];
    experience_years: number;
    match_tags: string[];
    bio: string;
    visa_status?: string;
    country?: string;
  };

  if (body.candidate_id) {
    const { data: candidate, error: candError } = await db
      .from('candidates')
      .select('*')
      .eq('id', body.candidate_id)
      .single();

    if (candError || !candidate) {
      return errorResponse(ErrorCode.NOT_FOUND, `Candidate ${body.candidate_id} not found`, 404);
    }

    candidateData = {
      skills: candidate.skills || [],
      experience_years: candidate.experience_years || 0,
      match_tags: candidate.match_tags || [],
      bio: candidate.bio || candidate.headline || '',
      visa_status: candidate.visa_status,
      country: candidate.country,
    };
  } else {
    // Use raw CV text — extract minimal data for matching
    candidateData = {
      skills: [],
      experience_years: 0,
      match_tags: [],
      bio: body.cv_text!.slice(0, 2000),
    };
  }

  // Compute match via AI
  const matchResult = await computeMatchWithAI(
    {
      skills: candidateData.skills,
      experience_years: candidateData.experience_years,
      match_tags: candidateData.match_tags,
      bio: candidateData.bio,
    },
    {
      skills_required: job.skills_required || [],
      requirements: job.requirements || [],
      match_tags: job.match_tags || [],
      title: job.title,
      description: job.description || '',
    }
  );

  // Check visa eligibility
  let visaEligible: boolean | null = null;
  if (candidateData.country && candidateData.visa_status) {
    const { data: visaRules } = await db
      .from('visa_requirements')
      .select('id, visa_type, sponsorship_required')
      .eq('origin_country', candidateData.country)
      .eq('destination_country', job.country)
      .eq('is_active', true);

    if (visaRules && visaRules.length > 0) {
      visaEligible =
        candidateData.visa_status === 'citizen' ||
        candidateData.visa_status === 'permanent_resident' ||
        (job.visa_sponsorship && visaRules.some((r) => r.sponsorship_required));
    }
  }

  // Determine missing skills
  const candidateSkillsLower = candidateData.skills.map((s) => s.toLowerCase());
  const missingSkills = (job.skills_required || []).filter(
    (s: string) => !candidateSkillsLower.includes(s.toLowerCase())
  );

  // Store the match result
  if (body.candidate_id) {
    await db.from('matches').upsert({
      candidate_id: body.candidate_id,
      job_id: body.job_id,
      score: matchResult.score,
      breakdown: matchResult.breakdown,
      explanation: matchResult.explanation,
    }, { onConflict: 'candidate_id,job_id' });
  }

  return successResponse({
    score: matchResult.score,
    breakdown: matchResult.breakdown,
    explanation: matchResult.explanation,
    visa_eligible: visaEligible,
    missing_skills: missingSkills,
  });
}

export const POST = pipeline(handler);
