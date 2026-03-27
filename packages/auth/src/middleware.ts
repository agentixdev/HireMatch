import type { JwtConfig } from "./jwt.js";
import { verifyToken } from "./jwt.js";
import { validateApiKey, type StoredApiKey } from "./api-key.js";

/** Minimal request-like interface for middleware */
export interface AuthRequest {
  headers: {
    get(name: string): string | null;
  };
}

/** Authenticated context attached after auth */
export interface AuthContext {
  userId: string;
  role: string;
  orgId?: string;
  scopes: string[];
  sessionId?: string;
  authMethod: "jwt" | "api-key";
}

/** Result of an auth check */
export type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; error: string; statusCode: number };

/**
 * Extract and verify authentication from a request.
 * Supports both Bearer JWT and API key via X-API-Key header.
 */
export async function authenticate(
  req: AuthRequest,
  jwtConfig: JwtConfig,
  lookupApiKey?: (hash: string) => Promise<StoredApiKey | null>
): Promise<AuthResult> {
  // Try JWT first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token, jwtConfig);
      if (payload.type !== "access") {
        return { ok: false, error: "Invalid token type", statusCode: 401 };
      }
      return {
        ok: true,
        context: {
          userId: payload.sub ?? "",
          role: payload.role ?? "candidate",
          orgId: payload.orgId,
          scopes: payload.scopes ?? [],
          sessionId: payload.sid,
          authMethod: "jwt",
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid token";
      return { ok: false, error: message, statusCode: 401 };
    }
  }

  // Try API key
  const apiKey = req.headers.get("x-api-key");
  if (apiKey && lookupApiKey) {
    const { hashApiKey } = await import("./api-key.js");
    const hash = hashApiKey(apiKey);
    const stored = await lookupApiKey(hash);
    if (!stored) {
      return { ok: false, error: "Invalid API key", statusCode: 401 };
    }
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
      return { ok: false, error: "API key expired", statusCode: 401 };
    }
    return {
      ok: true,
      context: {
        userId: stored.orgId,
        role: "recruiter",
        orgId: stored.orgId,
        scopes: stored.scopes,
        authMethod: "api-key",
      },
    };
  }

  return { ok: false, error: "Authentication required", statusCode: 401 };
}

/**
 * Require the user to have a specific role.
 */
export function requireRole(
  context: AuthContext,
  ...roles: string[]
): AuthResult {
  if (roles.includes(context.role)) {
    return { ok: true, context };
  }
  return {
    ok: false,
    error: `Required role: ${roles.join(" or ")}`,
    statusCode: 403,
  };
}

/**
 * Require the user to have specific scopes.
 */
export function requireScope(
  context: AuthContext,
  ...requiredScopes: string[]
): AuthResult {
  // admin:all grants everything
  if (context.scopes.includes("admin:all")) {
    return { ok: true, context };
  }

  const missing = requiredScopes.filter((s) => !context.scopes.includes(s));
  if (missing.length === 0) {
    return { ok: true, context };
  }

  return {
    ok: false,
    error: `Missing scopes: ${missing.join(", ")}`,
    statusCode: 403,
  };
}

/**
 * Compose multiple auth checks. All must pass.
 */
export function requireAll(
  context: AuthContext,
  ...checks: ((ctx: AuthContext) => AuthResult)[]
): AuthResult {
  for (const check of checks) {
    const result = check(context);
    if (!result.ok) return result;
  }
  return { ok: true, context };
}
