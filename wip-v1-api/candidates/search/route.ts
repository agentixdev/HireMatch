import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

interface SearchBody {
  query: string;
  filters?: {
    country?: string;
    skills?: string[];
    min_experience?: number;
    visa_status?: string;
  };
  limit?: number;
  cursor?: string;
}

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'candidates:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: candidates:read', 403);
  }

  const body: SearchBody = await request.json().catch(() => ({ query: '' }));
  if (!body.query || body.query.trim().length < 2) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'query must be at least 2 characters', 400);
  }

  const limit = Math.min(body.limit || 25, 100);
  const db = getServiceClient();

  // Build the search using Supabase's full-text search + optional pgvector
  // First try semantic search via embedding if available, fall back to tsvector
  const searchQuery = body.query.trim();

  // Use Supabase RPC for combined vector + text search
  const { data: results, error } = await db.rpc('search_candidates', {
    search_query: searchQuery,
    filter_country: body.filters?.country || null,
    filter_skills: body.filters?.skills || null,
    filter_min_experience: body.filters?.min_experience || null,
    filter_visa_status: body.filters?.visa_status || null,
    result_limit: limit,
    cursor_after: body.cursor || null,
    requesting_org_id: auth.org_id,
  });

  if (error) {
    // Fallback to basic text search if RPC not available
    console.warn('search_candidates RPC failed, falling back to text search:', error.message);
    return fallbackTextSearch(db, body, limit, auth.org_id);
  }

  const nextCursor =
    results && results.length === limit
      ? results[results.length - 1].created_at
      : null;

  return paginatedResponse(results || [], nextCursor, results?.length || 0);
}

/**
 * Fallback text search using ILIKE when pgvector RPC is unavailable.
 */
async function fallbackTextSearch(
  db: ReturnType<typeof getServiceClient>,
  body: SearchBody,
  limit: number,
  orgId: string
) {
  const q = `%${body.query.trim()}%`;

  let query = db
    .from('candidates')
    .select('*', { count: 'exact' })
    .or(`full_name.ilike.${q},headline.ilike.${q},bio.ilike.${q}`)
    .or(`is_public.eq.true,org_id.eq.${orgId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (body.filters?.country) query = query.eq('country', body.filters.country);
  if (body.filters?.visa_status) query = query.eq('visa_status', body.filters.visa_status);
  if (body.filters?.min_experience) {
    query = query.gte('experience_years', body.filters.min_experience);
  }
  if (body.filters?.skills) {
    query = query.overlaps('skills', body.filters.skills);
  }
  if (body.cursor) query = query.lt('created_at', body.cursor);

  const { data, count, error } = await query;
  if (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Search failed', 500);
  }

  const nextCursor =
    data && data.length === limit ? data[data.length - 1].created_at : null;

  return paginatedResponse(data || [], nextCursor, count || 0);
}

export const POST = pipeline(handler);
