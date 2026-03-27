import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { publicPipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { signJwt, signRefreshToken } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'email and password are required', 400);
  }

  const db = getServiceClient();
  const { email, password } = body;

  // Look up user by email
  const { data: user, error } = await db
    .from('users')
    .select('id, email, password_hash, role, org_id, full_name, mfa_enabled')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid email or password', 401);
  }

  // Compare password using scrypt (built-in, no bcrypt dependency needed)
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid email or password', 401);
  }

  // If MFA is enabled, return partial auth requiring MFA verification
  if (user.mfa_enabled) {
    const mfaToken = await signJwt(
      { sub: user.id, org_id: user.org_id, role: 'mfa_pending', scopes: ['mfa:verify'] },
      '5m'
    );
    return successResponse({
      mfa_required: true,
      mfa_token: mfaToken,
      user: { id: user.id, email: user.email },
    });
  }

  // Create session
  const sessionId = crypto.randomUUID();
  await db.from('sessions').insert({
    id: sessionId,
    user_id: user.id,
    org_id: user.org_id,
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent') || null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Generate tokens
  const accessToken = await signJwt(
    { sub: user.id, org_id: user.org_id, role: user.role, scopes: ['*'] },
    '15m'
  );
  const refreshToken = await signRefreshToken(user.id, sessionId);

  // Audit log
  await db.from('audit_log').insert({
    user_id: user.id,
    org_id: user.org_id,
    action: 'auth.login',
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: request.headers.get('user-agent') || null,
    metadata: { session_id: sessionId },
  });

  return successResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900, // 15 minutes
    token_type: 'Bearer',
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      org_id: user.org_id,
    },
  });
}

/**
 * Verify a password against a stored scrypt hash.
 * Hash format: salt:hash (both hex-encoded).
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, Buffer.from(salt, 'hex'), 64, (err, derived) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derived));
    });
  });
}

export const POST = publicPipeline(handler);
