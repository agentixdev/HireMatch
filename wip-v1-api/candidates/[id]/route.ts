import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'candidates:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: candidates:read', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Candidate ID is required', 400);

  const db = getServiceClient();

  const { data: candidate, error } = await db
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !candidate) {
    return errorResponse(ErrorCode.NOT_FOUND, `Candidate ${id} not found`, 404);
  }

  // Check access: public profile or same org
  if (!candidate.is_public && candidate.org_id !== auth.org_id) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Access denied to this candidate', 403);
  }

  // Track view for billing
  try {
    await db.from('candidate_views').insert({
      candidate_id: id,
      org_id: auth.org_id,
      viewer_user_id: auth.user_id || null,
    });
  } catch {
    // Ignore view tracking failures
  }

  return successResponse(candidate);
}

export const GET = pipeline(handler);
