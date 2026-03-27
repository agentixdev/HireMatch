import { NextRequest } from 'next/server';
import { pipeline } from '../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../_lib/response';
import { getCurrentOrg, requireScope } from '../_lib/auth-helpers';
import { getServiceClient } from '../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'visa:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: visa:read', 403);
  }

  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const originCountry = url.searchParams.get('origin_country');
  const visaType = url.searchParams.get('visa_type');
  const sponsorshipRequired = url.searchParams.get('sponsorship_required');
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const db = getServiceClient();
  let query = db
    .from('visa_requirements')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('destination_country', { ascending: true })
    .order('visa_type', { ascending: true })
    .limit(limit);

  if (country) query = query.eq('destination_country', country.toLowerCase());
  if (originCountry) query = query.eq('origin_country', originCountry.toLowerCase());
  if (visaType) query = query.ilike('visa_type', `%${visaType}%`);
  if (sponsorshipRequired !== null && sponsorshipRequired !== undefined) {
    query = query.eq('sponsorship_required', sponsorshipRequired === 'true');
  }
  if (cursor) query = query.gt('id', cursor);

  const { data, count, error } = await query;

  if (error) {
    console.error('Visa rules query error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch visa rules', 500);
  }

  const nextCursor =
    data && data.length === limit ? data[data.length - 1].id : null;

  return paginatedResponse(data || [], nextCursor, count || 0);
}

export const GET = pipeline(handler);
