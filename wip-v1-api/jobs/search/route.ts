import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

interface SearchBody {
  query: string;
  filters?: {
    country?: string;
    job_type?: string;
    remote_ok?: boolean;
    min_salary?: number;
  };
  limit?: number;
  cursor?: string;
}

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'jobs:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: jobs:read', 403);
  }

  const body: SearchBody = await request.json().catch(() => ({ query: '' }));
  if (!body.query || body.query.trim().length < 2) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'query must be at least 2 characters', 400);
  }

  const limit = Math.min(body.limit || 25, 100);
  const db = getServiceClient();

  // Try RPC-based semantic search first
  const { data: results, error } = await db.rpc('search_jobs', {
    search_query: body.query.trim(),
    filter_country: body.filters?.country || null,
    filter_job_type: body.filters?.job_type || null,
    filter_remote_ok: body.filters?.remote_ok ?? null,
    filter_min_salary: body.filters?.min_salary || null,
    result_limit: limit,
    cursor_after: body.cursor || null,
  });

  if (error) {
    // Fallback to ILIKE search
    console.warn('search_jobs RPC failed, falling back:', error.message);
    return fallbackJobSearch(db, body, limit);
  }

  const nextCursor =
    results && results.length === limit
      ? results[results.length - 1].created_at
      : null;

  return paginatedResponse(results || [], nextCursor, results?.length || 0);
}

async function fallbackJobSearch(
  db: ReturnType<typeof getServiceClient>,
  body: SearchBody,
  limit: number
) {
  const q = `%${body.query.trim()}%`;

  let query = db
    .from('jobs')
    .select('*, recruiter:recruiters(company_name)', { count: 'exact' })
    .eq('is_active', true)
    .or(`title.ilike.${q},description.ilike.${q}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (body.filters?.country) query = query.eq('country', body.filters.country);
  if (body.filters?.job_type) query = query.eq('job_type', body.filters.job_type);
  if (body.filters?.remote_ok) query = query.eq('work_mode', 'remote');
  if (body.filters?.min_salary) query = query.gte('salary_min', body.filters.min_salary);
  if (body.cursor) query = query.lt('created_at', body.cursor);

  const { data, count, error } = await query;
  if (error) return errorResponse(ErrorCode.INTERNAL_ERROR, 'Search failed', 500);

  const nextCursor =
    data && data.length === limit ? data[data.length - 1].created_at : null;
  return paginatedResponse(data || [], nextCursor, count || 0);
}

export const POST = pipeline(handler);
