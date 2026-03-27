import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { pipeline } from '../_lib/middleware';
import { successResponse, paginatedResponse, errorResponse, ErrorCode } from '../_lib/response';
import { getCurrentOrg, requireScope } from '../_lib/auth-helpers';
import { getServiceClient } from '../_lib/db';

// GET — list webhooks for the authenticated org
async function listHandler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:read', 403);
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('webhook_configs')
    .select('id, url, events, is_active, created_at')
    .eq('recruiter_id', auth.org_id)
    .order('created_at', { ascending: false });

  if (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to fetch webhooks', 500);
  }

  return paginatedResponse(data || [], null, data?.length || 0);
}

// POST — create a new webhook endpoint
async function createHandler(request: NextRequest) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:write')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:write', 403);
  }

  const body = await request.json().catch(() => null);
  if (!body?.url || !Array.isArray(body?.events) || body.events.length === 0) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      'url (string) and events (non-empty array) are required',
      400
    );
  }

  // Validate URL
  try {
    new URL(body.url);
  } catch {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid webhook URL', 400);
  }

  // Validate events
  const validEvents = [
    'application.created',
    'application.status_changed',
    'candidate.matched',
    'job.created',
    'job.updated',
  ];
  const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    return errorResponse(
      ErrorCode.VALIDATION_ERROR,
      `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}`,
      400
    );
  }

  // Generate signing secret
  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

  const db = getServiceClient();
  const { data: webhook, error } = await db
    .from('webhook_configs')
    .insert({
      recruiter_id: auth.org_id,
      url: body.url,
      events: body.events,
      secret,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Webhook creation error:', error);
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to create webhook', 500);
  }

  return successResponse(
    {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret, // Only returned at creation time
      is_active: webhook.is_active,
      created_at: webhook.created_at,
    },
    {},
    201
  );
}

export const GET = pipeline(listHandler);
export const POST = pipeline(createHandler);
