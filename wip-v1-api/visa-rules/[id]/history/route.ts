import { NextRequest } from 'next/server';
import { pipeline } from '../../../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../../../_lib/response';
import { getCurrentOrg, requireScope } from '../../../_lib/auth-helpers';
import { getServiceClient } from '../../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'visa:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: visa:read', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Visa rule ID is required', 400);

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const db = getServiceClient();

  // Verify the visa rule exists
  const { data: rule, error: ruleError } = await db
    .from('visa_requirements')
    .select('id')
    .eq('id', id)
    .single();

  if (ruleError || !rule) {
    return errorResponse(ErrorCode.NOT_FOUND, `Visa rule ${id} not found`, 404);
  }

  // Fetch change history
  let query = db
    .from('visa_rule_changes')
    .select('*', { count: 'exact' })
    .eq('visa_requirement_id', id)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('changed_at', cursor);

  const { data: history, count, error } = await query;

  if (error) {
    console.error('Visa rule history query error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch change history', 500);
  }

  const nextCursor =
    history && history.length === limit
      ? history[history.length - 1].changed_at
      : null;

  return paginatedResponse(history || [], nextCursor, count || 0);
}

export const GET = pipeline(handler);
