import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/request';
// ---------------------------------------------------------------------------
// Security headers applied to ALL responses
// ---------------------------------------------------------------------------

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ---------------------------------------------------------------------------
// CORS for /api/v1/* routes
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = (process.env.API_CORS_ORIGINS || '*').split(',').map((o) => o.trim());

function corsHeaders(origin: string): Record<string, string> {
  const allowed =
    ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)
      ? origin || '*'
      : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Request-ID',
    'Access-Control-Max-Age': '86400',
  };
}

// ---------------------------------------------------------------------------
// next-intl middleware (locale routing for non-API pages)
// ---------------------------------------------------------------------------

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

// ---------------------------------------------------------------------------
// Main proxy (renamed from middleware per Next.js 16 convention)
// ---------------------------------------------------------------------------

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Handle CORS preflight for API v1 routes
  if (pathname.startsWith('/api/v1') && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '';
    const response = new NextResponse(null, { status: 204 });
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      response.headers.set(k, v);
    }
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(k, v);
    }
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  // For API routes, create a simple NextResponse with headers
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next();
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(k, v);
    }
    response.headers.set('X-Request-ID', requestId);

    // Add CORS headers for /api/v1/* routes
    if (pathname.startsWith('/api/v1')) {
      const origin = request.headers.get('origin') || '';
      for (const [k, v] of Object.entries(corsHeaders(origin))) {
        response.headers.set(k, v);
      }
    }

    return response;
  }

  // For all other routes, run next-intl middleware then add security headers
  const response = intlMiddleware(request);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v);
  }
  response.headers.set('X-Request-ID', requestId);

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except: _next, _vercel, static files
    '/((?!_next|_vercel|.*\\..*).*)',
    // Also match API routes for security headers
    '/api/:path*',
  ],
};
