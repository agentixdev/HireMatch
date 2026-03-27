/**
 * Sentry integration for error tracking and performance monitoring.
 * Uses the Sentry HTTP API directly to avoid a hard dependency on @sentry/nextjs.
 * If @sentry/nextjs is installed, prefer importing from there directly.
 *
 * Env vars: SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN
 */

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

// Parse DSN into components: https://<key>@<host>/<project_id>
let _config: { key: string; host: string; projectId: string; storeUrl: string } | null = null;

function parseDsn(): typeof _config {
  if (_config) return _config;
  if (!DSN) return null;

  try {
    const url = new URL(DSN);
    const key = url.username;
    const host = url.hostname;
    const projectId = url.pathname.replace('/', '');
    const storeUrl = `https://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`;
    _config = { key, host, projectId, storeUrl };
    return _config;
  } catch {
    return null;
  }
}

export interface SentryContext {
  org_id?: string;
  user_id?: string;
  request_id?: string;
  [key: string]: unknown;
}

// Current user context
let _userContext: { id?: string; org_id?: string } = {};

function buildEnvelope(
  type: 'event' | 'transaction',
  payload: Record<string, unknown>,
): string {
  const config = parseDsn();
  if (!config) return '';

  const header = JSON.stringify({
    event_id: crypto.randomUUID().replace(/-/g, ''),
    sent_at: new Date().toISOString(),
    dsn: DSN,
  });
  const itemHeader = JSON.stringify({ type });
  const body = JSON.stringify(payload);
  return `${header}\n${itemHeader}\n${body}`;
}

async function sendToSentry(envelope: string): Promise<void> {
  const config = parseDsn();
  if (!config || !envelope) return;

  try {
    await fetch(config.storeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silently ignore — Sentry should never break the app
  }
}

function buildTags(context: SentryContext): Record<string, string> {
  const tags: Record<string, string> = {};
  if (context.org_id) tags.org_id = context.org_id;
  if (context.user_id) tags.user_id = context.user_id;
  if (context.request_id) tags.request_id = context.request_id;
  return tags;
}

/**
 * Report an error to Sentry with optional HireMatch context tags.
 */
export function captureException(error: unknown, context: SentryContext = {}): void {
  if (!DSN) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const event: Record<string, unknown> = {
    platform: 'node',
    level: 'error',
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '0.0.0',
    server_name: 'hirematch',
    timestamp: Date.now() / 1000,
    tags: buildTags(context),
    extra: context,
    exception: {
      values: [
        {
          type: error instanceof Error ? error.constructor.name : 'Error',
          value: message,
          ...(stack
            ? {
                stacktrace: {
                  frames: stack
                    .split('\n')
                    .slice(1)
                    .map((line) => ({ filename: line.trim() })),
                },
              }
            : {}),
        },
      ],
    },
    ...(Object.keys(_userContext).length > 0 ? { user: _userContext } : {}),
  };

  const envelope = buildEnvelope('event', event);
  sendToSentry(envelope);
}

/**
 * Report a message to Sentry at a given severity level.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context: SentryContext = {},
): void {
  if (!DSN) return;

  const event: Record<string, unknown> = {
    platform: 'node',
    level,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '0.0.0',
    server_name: 'hirematch',
    timestamp: Date.now() / 1000,
    tags: buildTags(context),
    extra: context,
    message: { formatted: message },
    ...(Object.keys(_userContext).length > 0 ? { user: _userContext } : {}),
  };

  const envelope = buildEnvelope('event', event);
  sendToSentry(envelope);
}

/**
 * Set user context for all subsequent Sentry events.
 */
export function setUser(userId: string, orgId?: string): void {
  _userContext = {
    id: userId,
    ...(orgId ? { org_id: orgId } : {}),
  };
}

/**
 * Start a performance transaction and return a finish callback.
 */
export function startTransaction(
  name: string,
  op: string,
): { finish: () => void } {
  if (!DSN) return { finish: () => {} };

  const startTs = Date.now() / 1000;
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  return {
    finish() {
      const endTs = Date.now() / 1000;
      const transaction: Record<string, unknown> = {
        type: 'transaction',
        platform: 'node',
        environment: process.env.NODE_ENV || 'development',
        release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || '0.0.0',
        server_name: 'hirematch',
        transaction: name,
        start_timestamp: startTs,
        timestamp: endTs,
        contexts: {
          trace: {
            trace_id: traceId,
            span_id: spanId,
            op,
          },
        },
        spans: [],
        ...(Object.keys(_userContext).length > 0 ? { user: _userContext } : {}),
      };

      const envelope = buildEnvelope('transaction', transaction);
      sendToSentry(envelope);
    },
  };
}
