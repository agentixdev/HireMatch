import { NextResponse } from 'next/server';
import { seedVisaRules } from '@/lib/visa-scraper';

/**
 * POST /api/visa/seed
 * Admin endpoint to trigger seed data for visa rules.
 * Auth: Bearer token via CRON_SECRET.
 */
export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await seedVisaRules();

    return NextResponse.json({
      ok: true,
      total: result.total,
      success: result.success,
      ...(result.error ? { error: result.error } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Visa seed error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
