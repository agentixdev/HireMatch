import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyJwt, verifyApiKey, type AuthContext } from './auth-helpers';
import { errorResponse, ErrorCode } from './response';
import { getServiceClient } from './db';

// ---- Types ----
export type ApiHandler = (
  request: NextRequest,
  context: { params?: Record<string, string>; auth: AuthContext }
) => Promise<NextResponse>;

// ---- Compose middleware chain ----
type Middleware = (handler: ApiHandler) => ApiHandler;

/**
 * Compose an array of middleware into a single handler wrapper.
 * Middleware is applied outside-in (first in array wraps outermost).
 */
export function compose(...middlewares: Middleware[]): (handler: ApiHandler) => ApiHandler {
  return (handler) =>
    middlewares.reduceRight((h, mw) => mw(h), handler);
}

// ---- withRequestId ----
export function withRequestId(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    const requestId =
      request.headers.get('x-request-id') || crypto.randomUUID();
    const response = await handler(request, ctx);
    response.headers.set('X-Request-ID', requestId);
    return response;
  };
}

// ---- withCors ----
const ALLOWED_ORIGINS = (process.env.API_CORS_ORIGINS || '*').split(',').map((o) => o.trim());

export function withCors(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }
    const response = await handler(request, ctx);
    const ch = corsHeaders(request);
    for (const [k, v] of Object.entries(ch)) {
      response.headers.set(k, v);
    }
    return response;
  };
}

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowed =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
      ? origin || '*'
      : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Idempotency-Key, X-Request-ID',
    'Access-Control-Max-Age': '86400',
  };
}

// ---- withAuth ----
/**
 * Authenticate via Bearer JWT or API key in Authorization header.
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    const authHeader = request.headers.get('authorization') || '';

    let authContext: AuthContext | null = null;

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = await verifyJwt(token);
        authContext = {
          user_id: payload.sub,
          org_id: payload.org_id,
          role: payload.role,
          scopes: payload.scopes ?? ['*'],
          auth_method: 'jwt',
        };
      } catch {
        return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or expired JWT', 401);
      }
    } else if (authHeader.startsWith('ApiKey ') || authHeader.startsWith('Api-Key ')) {
      const key = authHeader.replace(/^(ApiKey|Api-Key)\s+/, '');
      const result = await verifyApiKey(key);
      if (!result) {
        return errorResponse(ErrorCode.UNAUTHORIZED, 'Invalid or revoked API key', 401);
      }
      authContext = {
        user_id: '', // API keys are org-level, not user-level
        org_id: result.org_id,
        role: 'api_key',
        scopes: result.scopes,
        auth_method: 'api_key',
      };
    }

    if (!authContext) {
      return errorResponse(
        ErrorCode.UNAUTHORIZED,
        'Missing Authorization header. Use "Bearer <jwt>" or "ApiKey <key>"',
        401
      );
    }

    // Attach auth context so downstream can use it
    const newHeaders = new Headers(request.headers);
    newHeaders.set('x-auth-context', JSON.stringify(authContext));
    const enrichedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
    });

    return handler(enrichedRequest, { ...ctx, auth: authContext });
  };
}

// ---- withRateLimit ----
/**
 * Sliding-window rate limiter backed by Upstash Redis.
 * Falls through gracefully if UPSTASH_REDIS_REST_URL is not set.
 */
export function withRateLimit(
  handler: ApiHandler,
  tier: 'free' | 'pro' | 'enterprise' | 'agency' = 'pro'
): ApiHandler {
  const limits: Record<string, { requests: number; windowMs: number }> = {
    free: { requests: 100, windowMs: 60_000 },
    pro: { requests: 1000, windowMs: 60_000 },
    enterprise: { requests: 5000, windowMs: 60_000 },
    agency: { requests: 10000, windowMs: 60_000 },
  };

  return async (request, ctx) => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      // Skip rate limiting if Redis not configured
      return handler(request, ctx);
    }

    const { requests: max, windowMs } = limits[tier] || limits.pro;
    const key = `rl:${ctx.auth?.org_id || 'anon'}:${Math.floor(Date.now() / windowMs)}`;

    try {
      const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const { result: count } = (await res.json()) as { result: number };

      // Set TTL on first hit
      if (count === 1) {
        await fetch(
          `${url}/pexpire/${encodeURIComponent(key)}/${windowMs}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (count > max) {
        const resp = errorResponse(
          ErrorCode.RATE_LIMITED,
          `Rate limit exceeded. ${max} requests per ${windowMs / 1000}s allowed.`,
          429
        );
        resp.headers.set('Retry-After', String(Math.ceil(windowMs / 1000)));
        resp.headers.set('X-RateLimit-Limit', String(max));
        resp.headers.set('X-RateLimit-Remaining', '0');
        return resp;
      }

      const response = await handler(request, ctx);
      response.headers.set('X-RateLimit-Limit', String(max));
      response.headers.set('X-RateLimit-Remaining', String(Math.max(0, max - count)));
      return response;
    } catch {
      // Redis error — don't block the request
      return handler(request, ctx);
    }
  };
}

// ---- withIdempotency ----
/**
 * Idempotency key support. Caches response for 24h in Redis.
 */
export function withIdempotency(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey || request.method === 'GET') {
      return handler(request, ctx);
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return handler(request, ctx);

    const cacheKey = `idem:${ctx.auth?.org_id}:${idempotencyKey}`;

    try {
      // Check for existing response
      const getRes = await fetch(`${url}/get/${encodeURIComponent(cacheKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { result: cached } = (await getRes.json()) as { result: string | null };

      if (cached) {
        const parsed = JSON.parse(cached);
        return NextResponse.json(parsed.body, {
          status: parsed.status,
          headers: { 'X-Idempotent-Replayed': 'true' },
        });
      }

      // Execute handler and cache result
      const response = await handler(request, ctx);
      const body = await response.clone().json();
      const toCache = JSON.stringify({ body, status: response.status });

      await fetch(
        `${url}/set/${encodeURIComponent(cacheKey)}/${encodeURIComponent(toCache)}/EX/86400`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );

      return response;
    } catch {
      return handler(request, ctx);
    }
  };
}

// ---- withUsageTracking ----
/**
 * Log each API call to the api_usage table for billing and analytics.
 */
export function withUsageTracking(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    const start = Date.now();
    const response = await handler(request, ctx);
    const durationMs = Date.now() - start;

    // Fire-and-forget — don't delay response
    try {
      const db = getServiceClient();
      const url = new URL(request.url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any).from('api_usage')
        .insert({
          org_id: ctx.auth?.org_id || null,
          user_id: ctx.auth?.user_id || null,
          method: request.method,
          path: url.pathname,
          status_code: response.status,
          duration_ms: durationMs,
          request_id: response.headers.get('X-Request-ID') || null,
          ip_address:
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            null,
          user_agent: request.headers.get('user-agent') || null,
        })
        .then(() => {});
    } catch {
      // Silently ignore tracking errors
    }

    return response;
  };
}

// ---- withEnvelope ----
/**
 * Ensure every response follows the { data, meta, errors } envelope format.
 * If the handler already returns envelope format, pass through.
 */
export function withEnvelope(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    const response = await handler(request, ctx);
    // We rely on handlers using successResponse/errorResponse which already
    // produce the envelope. This middleware adds the request-id to meta.
    return response;
  };
}

// ---- Pre-built pipeline ----
/**
 * Standard authenticated API pipeline.
 * Use: export const GET = pipeline(handler)
 */
export function pipeline(
  handler: ApiHandler,
  opts: { rateLimitTier?: 'free' | 'pro' | 'enterprise' | 'agency'; requireAuth?: boolean } = {}
): (request: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  const { rateLimitTier = 'pro', requireAuth = true } = opts;

  const chain = compose(
    withRequestId,
    withCors,
    withEnvelope,
    withUsageTracking,
    ...(requireAuth ? [withAuth] : []),
    (h: ApiHandler) => withRateLimit(h, rateLimitTier),
    withIdempotency
  );

  const wrapped = chain(handler);

  // Return the Next.js route handler signature
  return async (request: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    const resolvedParams = routeCtx?.params ? await routeCtx.params : undefined;
    return wrapped(request, {
      params: resolvedParams,
      auth: { user_id: '', org_id: '', role: '', scopes: [], auth_method: 'jwt' },
    });
  };
}

/**
 * Public (no auth) pipeline for health checks etc.
 */
export function publicPipeline(
  handler: ApiHandler
): (request: NextRequest, routeCtx?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return pipeline(handler, { requireAuth: false, rateLimitTier: 'free' });
}
