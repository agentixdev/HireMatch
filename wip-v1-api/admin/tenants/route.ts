import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (auth.role !== 'admin') {
    return errorResponse(ErrorCode.FORBIDDEN, 'Superadmin access required', 403);
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 100);
  const status = url.searchParams.get('status'); // active, suspended
  const search = url.searchParams.get('search');

  const db = getServiceClient();
  let query = db
    .from('organisations')
    .select('*, owner:users!organisations_owner_id_fkey(email, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (search) query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  if (cursor) query = query.lt('created_at', cursor);

  const { data, count, error } = await query;

  if (error) {
    console.error('Tenants query error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch organisations', 500);
  }

  const nextCursor =
    data && data.length === limit ? data[data.length - 1].created_at : null;

  return paginatedResponse(data || [], nextCursor, count || 0);
}

export const GET = pipeline(handler);
