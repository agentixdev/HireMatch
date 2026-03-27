import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';
import { getServiceClient } from './db';

// ---- Secrets ----
function getJwtSecret(): Uint8Array {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) throw new Error('Missing API_JWT_SECRET env var');
  return new TextEncoder().encode(secret);
}

// ---- Types ----
export interface JwtPayload {
  sub: string; // user_id
  org_id: string;
  role: string;
  scopes?: string[];
  iat: number;
  exp: number;
}

export interface AuthContext {
  user_id: string;
  org_id: string;
  role: string;
  scopes: string[];
  auth_method: 'jwt' | 'api_key';
}

// ---- JWT ----

/**
 * Verify a JWT access token and return the decoded payload.
 */
export async function verifyJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ['HS256'],
    issuer: 'hirematch-api',
    audience: 'hirematch',
  });
  return payload as unknown as JwtPayload;
}

/**
 * Sign a new JWT.
 */
export async function signJwt(
  claims: { sub: string; org_id: string; role: string; scopes?: string[] },
  expiresIn: string
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hirematch-api')
    .setAudience('hirematch')
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

/**
 * Sign a refresh token (longer TTL, stored in sessions table).
 */
export async function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sub: userId, sid: sessionId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('hirematch-api')
    .setAudience('hirematch')
    .setExpirationTime('7d')
    .sign(getJwtSecret());
}

// ---- API Key ----

/**
 * Hash an API key (first 8 chars are the prefix, remainder is hashed).
 */
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify an API key against the database.
 * Returns org_id + scopes if valid.
 */
export async function verifyApiKey(
  key: string
): Promise<{ org_id: string; scopes: string[]; key_id: string } | null> {
  const hash = hashApiKey(key);
  const db = getServiceClient();

  const { data, error } = await db
    .from('api_keys' as string)
    .select('id, org_id, scopes, is_revoked, expires_at')
    .eq('key_hash', hash)
    .single<{ id: string; org_id: string; scopes: string[] | null; is_revoked: boolean; expires_at: string | null }>();

  if (error || !data) return null;
  if (data.is_revoked) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return { org_id: data.org_id, scopes: data.scopes ?? [], key_id: data.id };
}

/**
 * Check whether scopes contain all required scopes.
 */
export function requireScope(scopes: string[], required: string | string[]): boolean {
  const needed = Array.isArray(required) ? required : [required];
  // Wildcard scope grants everything
  if (scopes.includes('*')) return true;
  return needed.every((s) => scopes.includes(s));
}

/**
 * Extract the authenticated org context from a request that has been through withAuth.
 */
export function getCurrentOrg(request: Request): AuthContext | null {
  // Auth context is attached to the request headers by withAuth middleware
  const authHeader = request.headers.get('x-auth-context');
  if (!authHeader) return null;
  try {
    return JSON.parse(authHeader) as AuthContext;
  } catch {
    return null;
  }
}
