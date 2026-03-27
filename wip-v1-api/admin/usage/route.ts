import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (auth.role !== 'admin') {
    return errorResponse(ErrorCode.FORBIDDEN, 'Superadmin access required', 403);
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '24h'; // 24h, 7d, 30d

  const db = getServiceClient();

  // Calculate time boundary
  const periodMs: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const since = new Date(Date.now() - (periodMs[period] || periodMs['24h'])).toISOString();

  // Fetch usage stats in parallel
  const [
    totalCallsResult,
    activeTenantsResult,
    topEndpointsResult,
    errorRateResult,
    orgCountResult,
  ] = await Promise.allSettled([
    // Total API calls in period
    db
      .from('api_usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since),

    // Active tenants (unique org_ids)
    db
      .from('api_usage')
      .select('org_id')
      .gte('created_at', since)
      .not('org_id', 'is', null),

    // Top endpoints by call count
    db
      .from('api_usage')
      .select('path, method')
      .gte('created_at', since)
      .limit(1000),

    // Error rate
    db
      .from('api_usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
      .gte('status_code', 400),

    // Total org count
    db
      .from('organisations')
      .select('id', { count: 'exact', head: true }),
  ]);

  const totalCalls =
    totalCallsResult.status === 'fulfilled' ? totalCallsResult.value.count || 0 : 0;

  // Deduplicate active tenants
  const uniqueOrgs = new Set<string>();
  if (activeTenantsResult.status === 'fulfilled' && activeTenantsResult.value.data) {
    for (const row of activeTenantsResult.value.data) {
      if (row.org_id) uniqueOrgs.add(row.org_id);
    }
  }

  // Aggregate top endpoints
  const endpointCounts: Record<string, number> = {};
  if (topEndpointsResult.status === 'fulfilled' && topEndpointsResult.value.data) {
    for (const row of topEndpointsResult.value.data) {
      const key = `${row.method} ${row.path}`;
      endpointCounts[key] = (endpointCounts[key] || 0) + 1;
    }
  }
  const topEndpoints = Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));

  const errorCount =
    errorRateResult.status === 'fulfilled' ? errorRateResult.value.count || 0 : 0;

  const totalOrgs =
    orgCountResult.status === 'fulfilled' ? orgCountResult.value.count || 0 : 0;

  return successResponse({
    period,
    total_api_calls: totalCalls,
    active_tenants: uniqueOrgs.size,
    total_organisations: totalOrgs,
    error_count: errorCount,
    error_rate: totalCalls > 0 ? Math.round((errorCount / totalCalls) * 10000) / 100 : 0,
    top_endpoints: topEndpoints,
  });
}

export const GET = pipeline(handler);
