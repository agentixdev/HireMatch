import { NextRequest } from 'next/server';
import { pipeline } from '../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../_lib/response';
import { getCurrentOrg, requireScope } from '../../_lib/auth-helpers';
import { getServiceClient } from '../../_lib/db';

// GET — single webhook with delivery stats
async function getHandler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:read')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:read', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Webhook ID is required', 400);

  const db = getServiceClient();

  const { data: webhook, error } = await db
    .from('webhook_configs')
    .select('id, url, events, is_active, created_at')
    .eq('id', id)
    .eq('recruiter_id', auth.org_id)
    .single();

  if (error || !webhook) {
    return errorResponse(ErrorCode.NOT_FOUND, `Webhook ${id} not found`, 404);
  }

  // Fetch delivery stats
  const { data: deliveries } = await db
    .from('webhook_deliveries')
    .select('response_status, created_at')
    .eq('webhook_config_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  const total = deliveries?.length || 0;
  const successful = deliveries?.filter((d) => d.response_status >= 200 && d.response_status < 300).length || 0;
  const failed = total - successful;
  const lastDelivery = deliveries?.[0]?.created_at || null;

  return successResponse({
    ...webhook,
    delivery_stats: {
      total,
      successful,
      failed,
      success_rate: total > 0 ? Math.round((successful / total) * 100) : null,
      last_delivery_at: lastDelivery,
    },
  });
}

// PUT — update webhook
async function putHandler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:write')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:write', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Webhook ID is required', 400);

  const body = await request.json().catch(() => null);
  if (!body) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Request body is required', 400);

  const db = getServiceClient();

  // Verify ownership
  const { data: existing, error: fetchError } = await db
    .from('webhook_configs')
    .select('id')
    .eq('id', id)
    .eq('recruiter_id', auth.org_id)
    .single();

  if (fetchError || !existing) {
    return errorResponse(ErrorCode.NOT_FOUND, `Webhook ${id} not found`, 404);
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (body.url !== undefined) {
    try {
      new URL(body.url);
    } catch {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 'Invalid webhook URL', 400);
    }
    updates.url = body.url;
  }
  if (body.events !== undefined) updates.events = body.events;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return errorResponse(ErrorCode.VALIDATION_ERROR, 'No valid fields to update', 400);
  }

  const { data: updated, error } = await db
    .from('webhook_configs')
    .update(updates)
    .eq('id', id)
    .select('id, url, events, is_active, created_at')
    .single();

  if (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update webhook', 500);
  }

  return successResponse(updated);
}

// DELETE — delete webhook
async function deleteHandler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:write')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:write', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Webhook ID is required', 400);

  const db = getServiceClient();

  const { error } = await db
    .from('webhook_configs')
    .delete()
    .eq('id', id)
    .eq('recruiter_id', auth.org_id);

  if (error) {
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to delete webhook', 500);
  }

  return successResponse({ message: 'Webhook deleted' });
}

export const GET = pipeline(getHandler);
export const PUT = pipeline(putHandler);
export const DELETE = pipeline(deleteHandler);
