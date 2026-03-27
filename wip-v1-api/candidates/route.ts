import { NextRequest } from 'next/server';
import { pipeline } from '../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../_lib/response';
import { getCurrentOrg, requireScope } from '../_lib/auth-helpers';
import { getServiceClient } from '../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'candidates:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: candidates:read', 403);
  }

  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const skills = url.searchParams.get('skills'); // comma-separated
  const minExperience = url.searchParams.get('min_experience');
  const maxExperience = url.searchParams.get('max_experience');
  const visaStatus = url.searchParams.get('visa_status');
  const cursor = url.searchParams.get('cursor'); // ISO timestamp
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 100);

  const db = getServiceClient();
  let query = db
    .from('candidates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply filters
  if (country) query = query.eq('country', country.toLowerCase());
  if (visaStatus) query = query.eq('visa_status', visaStatus);
  if (minExperience) query = query.gte('experience_years', parseInt(minExperience, 10));
  if (maxExperience) query = query.lte('experience_years', parseInt(maxExperience, 10));
  if (skills) {
    const skillList = skills.split(',').map((s) => s.trim());
    query = query.overlaps('skills', skillList);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  // Only show public candidates or those belonging to the org
  query = query.or(`is_public.eq.true,org_id.eq.${auth.org_id}`);

  const { data: candidates, count, error } = await query;

  if (error) {
    console.error('Candidates query error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch candidates', 500);
  }

  const nextCursor =
    candidates && candidates.length === limit
      ? candidates[candidates.length - 1].created_at
      : null;

  return paginatedResponse(candidates || [], nextCursor, count || 0);
}

export const GET = pipeline(handler);
