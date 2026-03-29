import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { encryptSecret } from '@/lib/crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:recruiter:webhooks');

const ALLOWED_EVENTS = [
  'application.created',
  'application.status_changed',
  'candidate.matched',
  'job.created',
  'job.closed',
  'match.found',
] as const;

/**
 * GET /api/recruiter/webhooks — list webhook configs for authenticated recruiter
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Get recruiter record
    const { data: recruiter } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 404 });
    }

    // Fetch webhook configs (exclude secret from response)
    const { data: configs, error } = await service
      .from('webhook_configs')
      .select('id, url, events, is_active, created_at')
      .eq('recruiter_id', recruiter.id)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Failed to fetch webhook configs', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    // Fetch recent deliveries
    const configIds = (configs || []).map((c) => c.id);
    let deliveries: unknown[] = [];
    if (configIds.length > 0) {
      const { data: deliveryData } = await service
        .from('webhook_deliveries')
        .select('id, webhook_config_id, event, response_status, created_at')
        .in('webhook_config_id', configIds)
        .order('created_at', { ascending: false })
        .limit(50);
      deliveries = deliveryData || [];
    }

    return NextResponse.json({ ok: true, configs: configs || [], deliveries });
  } catch (err) {
    log.error('Unexpected error in GET /api/recruiter/webhooks', { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/recruiter/webhooks — create a new webhook config
 * Body: { url: string, events: string[] }
 * Returns the auto-generated secret in plaintext (shown once).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url, events } = body as { url?: string; events?: string[] };

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
    }
    const invalidEvents = events.filter((e) => !ALLOWED_EVENTS.includes(e as typeof ALLOWED_EVENTS[number]));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
    }

    const service = await createServiceClient();

    // Get recruiter record
    const { data: recruiter } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 404 });
    }

    // Generate secret
    const plaintextSecret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const encryptedSecret = encryptSecret(plaintextSecret);

    // Insert webhook config
    const { data: config, error } = await service
      .from('webhook_configs')
      .insert({
        recruiter_id: recruiter.id,
        url,
        secret: encryptedSecret,
        events,
        is_active: true,
      })
      .select('id, url, events, is_active, created_at')
      .single();

    if (error) {
      log.error('Failed to create webhook config', { error: error.message });
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    log.info('Webhook config created', { configId: config.id, recruiterId: recruiter.id });

    return NextResponse.json({
      ok: true,
      config,
      secret: plaintextSecret, // shown once to the user
    }, { status: 201 });
  } catch (err) {
    log.error('Unexpected error in POST /api/recruiter/webhooks', { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
