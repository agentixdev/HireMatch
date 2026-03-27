import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { publicPipeline } from '../../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../../_lib/response';
import { verifyJwt, signJwt, signRefreshToken } from '../../../_lib/auth-helpers';
import { getServiceClient } from '../../../_lib/db';

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.mfa_token || !body?.code) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'mfa_token and code are required', 400);
  }

  // Verify the MFA-pending JWT
  let payload: { sub: string; org_id: string; role: string };
  try {
    payload = await verifyJwt(body.mfa_token);
  } catch {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired MFA token', 401);
  }

  if (payload.role !== 'mfa_pending') {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Token is not an MFA-pending token', 401);
  }

  const db = getServiceClient();

  // Get user's MFA secret
  const { data: user } = await db
    .from('users')
    .select('id, mfa_secret, role, org_id, email, full_name')
    .eq('id', payload.sub)
    .single();

  if (!user || !user.mfa_secret) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'MFA not configured for this user', 401);
  }

  // Verify TOTP code
  const isValid = verifyTotp(body.code, user.mfa_secret);
  if (!isValid) {
    return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid MFA code', 401);
  }

  // MFA passed — create full session
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

  const accessToken = await signJwt(
    { sub: user.id, org_id: user.org_id, role: user.role, scopes: ['*'] },
    '15m'
  );
  const refreshToken = await signRefreshToken(user.id, sessionId);

  // Audit log
  await db.from('audit_log').insert({
    user_id: user.id,
    org_id: user.org_id,
    action: 'auth.mfa_verified',
    ip_address:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  });

  return successResponse({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900,
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
 * Verify a TOTP code against a base32-encoded secret.
 * Checks current time step and +-1 step for clock drift tolerance.
 */
function verifyTotp(code: string, secret: string): boolean {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000);

  for (const offset of [-1, 0, 1]) {
    const counter = Math.floor((now + offset * timeStep) / timeStep);
    const expected = generateTotp(secret, counter);
    if (code === expected) return true;
  }
  return false;
}

function generateTotp(secret: string, counter: number): string {
  // Decode base32 secret
  const key = base32Decode(secret);

  // Counter to 8-byte big-endian buffer
  const buffer = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export const POST = publicPipeline(handler);
