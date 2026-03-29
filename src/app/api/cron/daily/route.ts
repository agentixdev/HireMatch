import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/daily');

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Unified daily cron — Vercel Hobby plan allows only 1 cron job.
 * This endpoint orchestrates all daily tasks sequentially.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; error?: string }> = {};
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const tasks = [
    { name: 'job-expiration', path: '/api/cron/job-expiration' },
    { name: 'visa-refresh', path: '/api/cron/visa-refresh' },
    { name: 'job-sync', path: '/api/cron/job-sync' },
  ];

  for (const task of tasks) {
    try {
      const headers: Record<string, string> = {};
      if (cronSecret) headers['authorization'] = `Bearer ${cronSecret}`;

      const res = await fetch(`${baseUrl}${task.path}`, { headers });
      if (res.ok) {
        results[task.name] = { ok: true };
        log.info(`${task.name} completed`, { status: res.status });
      } else {
        const body = await res.text().catch(() => '');
        results[task.name] = { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
        log.warn(`${task.name} failed`, { status: res.status });
      }
    } catch (err) {
      results[task.name] = { ok: false, error: String(err) };
      log.error(`${task.name} error`, { error: String(err) });
    }
  }

  const allOk = Object.values(results).every(r => r.ok);

  return NextResponse.json({
    ok: allOk,
    timestamp: new Date().toISOString(),
    results,
  }, { status: allOk ? 200 : 207 });
}
