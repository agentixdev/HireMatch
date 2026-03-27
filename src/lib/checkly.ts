/**
 * Checkly / monitoring helpers.
 * Aggregates health checks across all backing services and optionally
 * reports to an external monitoring endpoint.
 */

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  latency_ms?: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime_seconds: number;
  services: ServiceHealth[];
}

const MONITORING_ENDPOINT = process.env.CHECKLY_WEBHOOK_URL || process.env.MONITORING_WEBHOOK_URL;

/**
 * Report a single service health check to the external monitoring endpoint.
 */
export async function reportHealthCheck(
  service: string,
  status: ServiceHealth['status'],
  latencyMs?: number,
  details?: Record<string, unknown>,
): Promise<void> {
  if (!MONITORING_ENDPOINT) return;

  try {
    await fetch(MONITORING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service,
        status,
        latency_ms: latencyMs,
        details,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silently ignore — monitoring should never break the app
  }
}

/**
 * Check Supabase database connectivity.
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { service: 'database', status: 'not_configured' };
  }

  try {
    const start = Date.now();
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, key);
    const { error } = await client.from('users').select('id').limit(1);
    const latency = Date.now() - start;

    return {
      service: 'database',
      status: error ? 'degraded' : 'healthy',
      latency_ms: latency,
      ...(error ? { error: error.message } : {}),
    };
  } catch (err) {
    return { service: 'database', status: 'unhealthy', error: String(err) };
  }
}

/**
 * Check Upstash Redis connectivity.
 */
async function checkRedis(): Promise<ServiceHealth> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { service: 'redis', status: 'not_configured' };
  }

  try {
    const start = Date.now();
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as { result: string };
    const latency = Date.now() - start;

    return {
      service: 'redis',
      status: data.result === 'PONG' ? 'healthy' : 'degraded',
      latency_ms: latency,
    };
  } catch (err) {
    return { service: 'redis', status: 'unhealthy', error: String(err) };
  }
}

/**
 * Check Gemini API availability (lightweight — just validates key presence).
 */
async function checkGemini(): Promise<ServiceHealth> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { service: 'gemini', status: 'not_configured' };
  }

  try {
    const start = Date.now();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const latency = Date.now() - start;

    return {
      service: 'gemini',
      status: res.ok ? 'healthy' : 'degraded',
      latency_ms: latency,
      details: { http_status: res.status },
    };
  } catch (err) {
    return { service: 'gemini', status: 'unhealthy', error: String(err) };
  }
}

/**
 * Check Stripe API connectivity.
 */
async function checkStripe(): Promise<ServiceHealth> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { service: 'stripe', status: 'not_configured' };
  }

  try {
    const start = Date.now();
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    return {
      service: 'stripe',
      status: res.ok ? 'healthy' : 'degraded',
      latency_ms: latency,
      details: { http_status: res.status },
    };
  } catch (err) {
    return { service: 'stripe', status: 'unhealthy', error: String(err) };
  }
}

const _startTime = Date.now();

/**
 * Run all health checks and return a structured report.
 */
export async function runAllHealthChecks(): Promise<HealthReport> {
  const services = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkGemini(),
    checkStripe(),
  ]);

  const anyUnhealthy = services.some((s) => s.status === 'unhealthy');
  const allHealthyOrNA = services.every(
    (s) => s.status === 'healthy' || s.status === 'not_configured',
  );

  const overall = anyUnhealthy ? 'unhealthy' : allHealthyOrNA ? 'healthy' : 'degraded';

  const report: HealthReport = {
    overall,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - _startTime) / 1000),
    services,
  };

  // Report to external monitoring endpoint
  await reportHealthCheck('platform', overall, undefined, { services: services.length });

  return report;
}
