import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Daily cron: Sync job listings from external APIs (JSearch, Adzuna, USAJobs).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // TODO: Phase 7 — Pull jobs from external APIs, upsert into jobs table
    return NextResponse.json({
      ok: true,
      message: 'Job sync cron — not yet implemented',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Job sync cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
