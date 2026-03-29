import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:recruiter:webhooks:[id]');

const ALLOWED_EVENTS = [
  'application.created',
  'application.status_changed',
  'candidate.matched',
  'job.created',
  'job.closed',
  'match.found',
] as const;

async function authenticateRecruiter() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const service = await createServiceClient();
  const { data: recruiter } = await service
    .from('recruiters')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return recruiter ? { userId: user.id, recruiterId: recruiter.id, service } : null;
}

/**
 * PATCH /api/recruiter/webhooks/[id] — update a webhook config
 * Body: { url?, events?, is_active? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRecruiter();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await auth.service
      .from('webhook_configs')
      .select('id, recruiter_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    if (existing.recruiter_id !== auth.recruiterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Validate and collect updates
    if (body.url !== undefined) {
      if (typeof body.url !== 'string') {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
      try {
        const parsed = new URL(body.url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
      }
      updates.url = body.url;
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
      }
      const invalidEvents = body.events.filter(
        (e: string) => !ALLOWED_EVENTS.includes(e as typeof ALLOWED_EVENTS[number])
      );
      if (invalidEvents.length > 0) {
        return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
      }
      updates.events = body.events;
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
      }
      updates.is_active = body.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: config, error } = await auth.service
      .from('webhook_configs')
      .update(updates)
      .eq('id', id)
      .select('id, url, events, is_active, created_at')
      .single();

    if (error) {
      log.error('Failed to update webhook config', { error: error.message, id });
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
    }

    log.info('Webhook config updated', { configId: id });
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    log.error('Unexpected error in PATCH', { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/recruiter/webhooks/[id] — delete a webhook config
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRecruiter();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existing } = await auth.service
      .from('webhook_configs')
      .select('id, recruiter_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    if (existing.recruiter_id !== auth.recruiterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await auth.service
      .from('webhook_configs')
      .delete()
      .eq('id', id);

    if (error) {
      log.error('Failed to delete webhook config', { error: error.message, id });
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    log.info('Webhook config deleted', { configId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('Unexpected error in DELETE', { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/recruiter/webhooks/[id] — send a test webhook event
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRecruiter();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: config } = await auth.service
      .from('webhook_configs')
      .select('*')
      .eq('id', id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }
    if (config.recruiter_id !== auth.recruiterId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Decrypt secret for signing
    const { decryptSecret } = await import('@/lib/crypto');
    const secret = decryptSecret(config.secret);

    const timestamp = Date.now().toString();
    const testPayload = {
      event: 'test',
      data: {
        message: 'This is a test webhook delivery from HireMatch',
        webhook_config_id: id,
        timestamp,
      },
      timestamp,
    };
    const body = JSON.stringify(testPayload);

    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    let responseStatus = 0;
    let responseBody = '';
    let delivered = false;

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HireMatch-Signature': signature,
          'X-HireMatch-Timestamp': timestamp,
          'X-HireMatch-Event': 'test',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => '');
      delivered = response.ok;
    } catch (err) {
      responseBody = String(err);
    }

    // Log the test delivery
    await auth.service.from('webhook_deliveries').insert({
      webhook_config_id: id,
      event: 'test',
      payload: testPayload.data,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 1000),
    });

    log.info('Test webhook sent', { configId: id, delivered, responseStatus });

    return NextResponse.json({
      ok: true,
      delivered,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 500),
    });
  } catch (err) {
    log.error('Unexpected error in test webhook', { error: String(err) });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
