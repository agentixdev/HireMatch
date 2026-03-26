import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * Daily cron: Refresh visa requirement data from scraped sources.
 * The actual scraping runs on the VPS via agent-browser; this cron
 * pulls the latest scraped data from Supabase and flags any changes.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // TODO: Phase 7 — Pull scraped visa data from Supabase,
    // compare with existing records, flag changes, send alerts
    return NextResponse.json({
      ok: true,
      message: 'Visa refresh cron — not yet implemented',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Visa refresh cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
