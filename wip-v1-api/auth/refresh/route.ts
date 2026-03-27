import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { jwtVerify } from 'jose';
import { publicPipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { signJwt, signRefreshToken } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.refresh_token) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'refresh_token is required', 400);
  }

  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Server configuration error', 500);
  }

  // Verify the refresh token
  let payload: { sub: string; sid: string; type: string };
  try {
    const { payload: raw } = await jwtVerify(
      body.refresh_token,
      new TextEncoder().encode(secret),
      { issuer: 'hirematch-api', audience: 'hirematch' }
    );
    payload = raw as unknown as typeof payload;
  } catch {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired refresh token', 401);
  }

  if (payload.type !== 'refresh') {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Token is not a refresh token', 401);
  }

  const db = getServiceClient();

  // Verify session exists and is not expired
  const { data: session, error: sessionError } = await db
    .from('sessions')
    .select('id, user_id, org_id, expires_at')
    .eq('id', payload.sid)
    .eq('user_id', payload.sub)
    .single();

  if (sessionError || !session) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Session not found or revoked', 401);
  }

  if (new Date(session.expires_at) < new Date()) {
    await db.from('sessions').delete().eq('id', session.id);
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Session expired', 401);
  }

  // Fetch user info for token claims
  const { data: user } = await db
    .from('users')
    .select('id, role, org_id')
    .eq('id', payload.sub)
    .single();

  if (!user) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'User not found', 401);
  }

  // Rotate session — delete old, create new
  const newSessionId = crypto.randomUUID();
  await db.from('sessions').delete().eq('id', session.id);
  await db.from('sessions').insert({
    id: newSessionId,
    user_id: user.id,
    org_id: user.org_id,
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent') || null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Generate new tokens
  const accessToken = await signJwt(
    { sub: user.id, org_id: user.org_id, role: user.role, scopes: ['*'] },
    '15m'
  );
  const refreshToken = await signRefreshToken(user.id, newSessionId);

  return successResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900,
    token_type: 'Bearer',
  });
}

export const POST = publicPipeline(handler);
