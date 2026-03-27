import { NextRequest } from 'next/server';
import { pipeline } from '../_lib/middleware';
import { paginatedResponse, errorResponse, ErrorCode } from '../_lib/response';
import { getCurrentOrg, requireScope } from '../_lib/auth-helpers';
import { getServiceClient } from '../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'jobs:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: jobs:read', 403);
  }

  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const jobType = url.searchParams.get('job_type');
  const workMode = url.searchParams.get('work_mode');
  const company = url.searchParams.get('company');
  const isActive = url.searchParams.get('is_active');
  const minSalary = url.searchParams.get('min_salary');
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 100);

  const db = getServiceClient();
  let query = db
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (country) query = query.eq('country', country.toLowerCase());
  if (jobType) query = query.eq('job_type', jobType);
  if (workMode) query = query.eq('work_mode', workMode);
  if (isActive !== null && isActive !== undefined) {
    query = query.eq('is_active', isActive === 'true');
  }
  if (minSalary) query = query.gte('salary_min', parseInt(minSalary, 10));
  if (company) query = query.ilike('title', `%${company}%`);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: jobs, count, error } = await query;

  if (error) {
    console.error('Jobs query error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch jobs', 500);
  }

  const nextCursor =
    jobs && jobs.length === limit ? jobs[jobs.length - 1].created_at : null;

  return paginatedResponse(jobs || [], nextCursor, count || 0);
}

export const GET = pipeline(handler);
