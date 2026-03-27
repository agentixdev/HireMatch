import { NextResponse } from 'next/server';

const startTime = Date.now();
const VERSION = process.env.npm_package_version || '0.2.0';

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const checks = {
    database: false,
    redis: false,
  };

  // Check database connectivity
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(dbUrl);
      await sql`SELECT 1`;
      checks.database = true;
    }
  } catch {
    checks.database = false;
  }

  // Check Redis connectivity
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    if (redisUrl) {
      const res = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      checks.redis = res.ok;
    }
  } catch {
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);
  const anyDown = !checks.database;

  return NextResponse.json({
    data: {
      status: anyDown ? 'down' : allHealthy ? 'ok' : 'degraded',
      version: VERSION,
      uptime,
      checks,
      timestamp: new Date().toISOString(),
    },
    meta: {},
    errors: [],
  }, {
    status: anyDown ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
