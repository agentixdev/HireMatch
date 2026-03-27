import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  }

  const db = getServiceClient();

  // Delete all sessions for this user (full logout)
  const body = await request.json().catch(() => ({}));
  const sessionId = body?.session_id;

  if (sessionId) {
    // Revoke specific session
    await db
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', auth.user_id);
  } else {
    // Revoke all sessions for this user
    await db.from('sessions').delete().eq('user_id', auth.user_id);
  }

  // Audit log
  await db.from('audit_log').insert({
    user_id: auth.user_id,
    org_id: auth.org_id,
    action: 'auth.logout',
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    metadata: { session_id: sessionId || 'all' },
  });

  return successResponse({ message: 'Logged out successfully' });
}

export const POST = pipeline(handler);
