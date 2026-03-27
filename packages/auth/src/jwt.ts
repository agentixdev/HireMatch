import * as jose from "jose";

export interface TokenPayload {
  sub: string;
  role: string;
  orgId?: string;
  scopes: string[];
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

export interface JwtConfig {
  /** Base64-encoded secret for HMAC, or PEM for RSA/EC */
  secret: string;
  /** Algorithm — defaults to HS256 */
  algorithm?: string;
  /** Issuer claim */
  issuer: string;
  /** Audience claim */
  audience: string;
  /** Access token TTL in seconds (default: 15 min) */
  accessTtl?: number;
  /** Refresh token TTL in seconds (default: 7 days) */
  refreshTtl?: number;
}

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Generate an access + refresh token pair.
 */
export async function generateTokenPair(
  payload: TokenPayload,
  config: JwtConfig
): Promise<TokenPair> {
  const accessTtl = config.accessTtl ?? 900; // 15 min
  const refreshTtl = config.refreshTtl ?? 604_800; // 7 days
  const alg = config.algorithm ?? "HS256";
  const secret = getSecret(config.secret);

  const now = Math.floor(Date.now() / 1000);
  const accessExpiresAt = new Date((now + accessTtl) * 1000);
  const refreshExpiresAt = new Date((now + refreshTtl) * 1000);

  const accessToken = await new jose.SignJWT({
    role: payload.role,
    orgId: payload.orgId,
    scopes: payload.scopes,
    sid: payload.sessionId,
    type: "access",
  })
    .setProtectedHeader({ alg })
    .setSubject(payload.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(accessExpiresAt)
    .setJti(crypto.randomUUID())
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    sid: payload.sessionId,
    type: "refresh",
  })
    .setProtectedHeader({ alg })
    .setSubject(payload.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(now)
    .setExpirationTime(refreshExpiresAt)
    .setJti(crypto.randomUUID())
    .sign(secret);

  return { accessToken, refreshToken, accessExpiresAt, refreshExpiresAt };
}

/**
 * Verify and decode a JWT token. Returns the payload or throws.
 */
export async function verifyToken(
  token: string,
  config: JwtConfig
): Promise<jose.JWTPayload & { role?: string; orgId?: string; scopes?: string[]; sid?: string; type?: string }> {
  const alg = config.algorithm ?? "HS256";
  const secret = getSecret(config.secret);

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: [alg],
  });

  return payload as jose.JWTPayload & {
    role?: string;
    orgId?: string;
    scopes?: string[];
    sid?: string;
    type?: string;
  };
}

/**
 * Decode a JWT without verification (for debugging / logging).
 */
export function decodeToken(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired (without verification).
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now();
}
