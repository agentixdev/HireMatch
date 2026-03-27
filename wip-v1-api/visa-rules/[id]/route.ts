import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'visa:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: visa:read', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Visa rule ID is required', 400);

  const db = getServiceClient();

  const { data, error } = await db
    .from('visa_requirements')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return errorResponse(ErrorCode.NOT_FOUND, `Visa rule ${id} not found`, 404);
  }

  return successResponse(data);
}

export const GET = pipeline(handler);
