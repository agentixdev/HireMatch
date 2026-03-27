import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';
import { computeMatchWithAI } from '@/lib/gemini';

interface BulkMatchBody {
  candidate_ids: string[];
  job_id: string;
}

interface RankedCandidate {
  candidate_id: string;
  full_name: string;
  score: number;
  breakdown: Record<string, number>;
  explanation: string;
  visa_eligible: boolean | null;
  missing_skills: string[];
}

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'match:run')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: match:run', 403);
  }

  const body: BulkMatchBody = await request.json().catch(() => ({} as BulkMatchBody));
  if (!body.job_id || !Array.isArray(body.candidate_ids) || body.candidate_ids.length === 0) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'job_id and candidate_ids (non-empty array) are required',
      400
    );
  }

  if (body.candidate_ids.length > 50) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Maximum 50 candidates per bulk match request',
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

  // Fetch all candidates in one query
  const { data: candidates, error: candError } = await db
    .from('candidates')
    .select('*')
    .in('id', body.candidate_ids);

  if (candError || !candidates) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch candidates', 500);
  }

  const jobData = {
    skills_required: job.skills_required || [],
    requirements: job.requirements || [],
    match_tags: job.match_tags || [],
    title: job.title,
    description: job.description || '',
  };

  // Run matches in parallel (batches of 10 to avoid rate limits)
  const results: RankedCandidate[] = [];
  const batchSize = 10;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (candidate) => {
        const matchResult = await computeMatchWithAI(
          {
            skills: candidate.skills || [],
            experience_years: candidate.experience_years || 0,
            match_tags: candidate.match_tags || [],
            bio: candidate.bio || candidate.headline || '',
          },
          jobData
        );

        const candidateSkillsLower = (candidate.skills || []).map((s: string) =>
          s.toLowerCase()
        );
        const missingSkills = (job.skills_required || []).filter(
          (s: string) => !candidateSkillsLower.includes(s.toLowerCase())
        );

        // Visa eligibility check
        let visaEligible: boolean | null = null;
        if (candidate.country && candidate.visa_status) {
          visaEligible =
            candidate.visa_status === 'citizen' ||
            candidate.visa_status === 'permanent_resident' ||
            job.visa_sponsorship;
        }

        return {
          candidate_id: candidate.id,
          full_name: candidate.full_name,
          score: matchResult.score,
          breakdown: matchResult.breakdown,
          explanation: matchResult.explanation,
          visa_eligible: visaEligible,
          missing_skills: missingSkills,
        } as RankedCandidate;
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Store match results in bulk
  const matchRows = results.map((r) => ({
    candidate_id: r.candidate_id,
    job_id: body.job_id,
    score: r.score,
    breakdown: r.breakdown,
    explanation: r.explanation,
  }));

  if (matchRows.length > 0) {
    await db.from('matches').upsert(matchRows, { onConflict: 'candidate_id,job_id' });
  }

  return successResponse({
    job_id: body.job_id,
    total_matched: results.length,
    total_requested: body.candidate_ids.length,
    shortlist: results,
  });
}

export const POST = pipeline(handler, { rateLimitTier: 'enterprise' });
