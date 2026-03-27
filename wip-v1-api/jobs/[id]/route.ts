import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'jobs:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: jobs:read', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Job ID is required', 400);

  const db = getServiceClient();

  const { data: job, error } = await db
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url, company_website, industry)')
    .eq('id', id)
    .single();

  if (error || !job) {
    return errorResponse(ErrorCode.NOT_FOUND, `Job ${id} not found`, 404);
  }

  // Increment view count (fire-and-forget)
  db.from('jobs')
    .update({ views_count: (job.views_count || 0) + 1 })
    .eq('id', id)
    .then(() => {});

  return successResponse(job);
}

export const GET = pipeline(handler);
