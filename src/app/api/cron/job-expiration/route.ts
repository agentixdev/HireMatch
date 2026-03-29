import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';

const log = createLogger('job-expiration');

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Find all active jobs whose expires_at has passed
    const { data: expiredJobs, error: selectError } = await supabase
      .from('jobs')
      .select('id')
      .eq('is_active', true)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      log.error('Failed to query expired jobs', { error: selectError.message });
      return NextResponse.json({ error: 'Failed to query expired jobs' }, { status: 500 });
    }

    const expiredIds = expiredJobs?.map((j) => j.id) ?? [];

    if (expiredIds.length === 0) {
      log.info('No expired jobs found');
      return NextResponse.json({
        ok: true,
        deactivated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Deactivate expired jobs in batches to avoid payload limits
    const BATCH_SIZE = 500;
    let deactivated = 0;

    for (let i = 0; i < expiredIds.length; i += BATCH_SIZE) {
      const batch = expiredIds.slice(i, i + BATCH_SIZE);

      const { error: updateError, count } = await supabase
        .from('jobs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', batch)
        .select('id');

      if (updateError) {
        log.error('Failed to deactivate batch', { offset: i, error: updateError.message });
      } else {
        deactivated += count ?? batch.length;
      }
    }

    log.info('Job expiration complete', { deactivated });

    return NextResponse.json({
      ok: true,
      deactivated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Job expiration cron error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
