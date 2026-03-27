import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { pipeline } from '../../../_lib/middleware';
import { successResponse, errorResponse, ErrorCode } from '../../../_lib/response';
import { getCurrentOrg, requireScope } from '../../../_lib/auth-helpers';
import { getServiceClient } from '../../../_lib/db';

async function handler(request: NextRequest, ctx: { params?: Record<string, string> }) {
  const auth = getCurrentOrg(request);
  if (!auth) return errorResponse(ErrorCode.UNAUTHORIZED, 'Not authenticated', 401);
  if (!requireScope(auth.scopes, 'webhooks:write')) {
    return errorResponse(ErrorCode.FORBIDDEN, 'Missing scope: webhooks:write', 403);
  }

  const id = ctx.params?.id;
  if (!id) return errorResponse(ErrorCode.VALIDATION_ERROR, 'Webhook ID is required', 400);

  const db = getServiceClient();

  // Fetch webhook config
  const { data: webhook, error } = await db
    .from('webhook_configs')
    .select('*')
    .eq('id', id)
    .eq('recruiter_id', auth.org_id)
    .single();

  if (error || !webhook) {
    return errorResponse(ErrorCode.NOT_FOUND, `Webhook ${id} not found`, 404);
  }

  // Build test payload
  const timestamp = Date.now().toString();
  const testPayload = {
    event: 'test.ping',
    data: {
      message: 'This is a test webhook delivery from HireMatch API',
      webhook_id: id,
      org_id: auth.org_id,
      timestamp: new Date().toISOString(),
    },
    timestamp,
  };

  const body = JSON.stringify(testPayload);

  // Sign with HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(body)
    .digest('hex');

  // Deliver
  let responseStatus = 0;
  let responseBody = '';
  let deliveryDurationMs = 0;

  try {
    const start = Date.now();
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HireMatch-Signature': signature,
        'X-HireMatch-Timestamp': timestamp,
        'X-HireMatch-Event': 'test.ping',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });
    deliveryDurationMs = Date.now() - start;
    responseStatus = response.status;
    responseBody = await response.text().catch(() => '');
  } catch (err) {
    responseBody = String(err);
  }

  // Log delivery
  await db.from('webhook_deliveries').insert({
    webhook_config_id: id,
    event: 'test.ping',
    payload: testPayload.data,
    response_status: responseStatus,
    response_body: responseBody.slice(0, 1000),
  });

  const success = responseStatus >= 200 && responseStatus < 300;

  return successResponse({
    success,
    response_status: responseStatus,
    response_body: responseBody.slice(0, 500),
    delivery_duration_ms: deliveryDurationMs,
    message: success
      ? 'Test webhook delivered successfully'
      : `Test webhook delivery failed with status ${responseStatus}`,
  });
}

export const POST = pipeline(handler);
