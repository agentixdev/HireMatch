import { NextRequest } from 'next/server';
import { pipeline } from '../../../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../../../_lib/response';
import { getCurrentOrg } from '../../../../_lib/auth-helpers';
import { getServiceClient } from '../../../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (auth.role !== 'admin') {
    return errorResponse(ErrorCode.FORBIDDEN, 'Superadmin access required', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Organisation ID is required', 400);

  const body = await request.json().catch(() => ({}));
  const reason = body?.reason || 'Suspended by admin';

  const db = getServiceClient();

  // Verify the org exists
  const { data: org, error: orgError } = await db
    .from('organisations')
    .select('id, name, status')
    .eq('id', id)
    .single();

  if (orgError || !org) {
    return errorResponse(ErrorCode.NOT_FOUND, `Organisation ${id} not found`, 404);
  }

  if (org.status === 'suspended') {
    return errorResponse(ErrorCode.CONFLICT, 'Organisation is already suspended', 409);
  }

  // Suspend the org
  const { error: updateError } = await db
    .from('organisations')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq('id', id);

  if (updateError) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to suspend organisation', 500);
  }

  // Revoke all API keys for this org
  await db
    .from('api_keys')
    .update({ is_revoked: true })
    .eq('org_id', id);

  // Invalidate all sessions for users in this org
  await db
    .from('sessions')
    .delete()
    .eq('org_id', id);

  // Deactivate all jobs
  await db
    .from('jobs')
    .update({ is_active: false })
    .eq('recruiter_id', id);

  // Audit log
  await db.from('audit_log').insert({
    user_id: auth.user_id,
    org_id: id,
    action: 'admin.org_suspended',
    metadata: { reason, suspended_by: auth.user_id },
  });

  return successResponse({
    id,
    name: org.name,
    status: 'suspended',
    reason,
    message: 'Organisation suspended. All API keys revoked, sessions invalidated, jobs deactivated.',
  });
}

export const POST = pipeline(handler);
