/**
 * Unified alert system for HireMatch.
 * Sends alerts via Resend email and Slack webhook with 15-min deduplication.
 */

export type AlertType =
  | 'dlq_spike'
  | 'embedding_backlog'
  | 'api_error_rate'
  | 'scrape_failures'
  | 'payment_failed'
  | 'security_event';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Deduplication (in-memory, 15-minute window)
// ---------------------------------------------------------------------------

const DEDUP_WINDOW_MS = 15 * 60 * 1000;
const _recentAlerts = new Map<string, number>();

function dedupKey(type: AlertType, severity: AlertSeverity, message: string): string {
  return `${type}:${severity}:${message}`;
}

function isDuplicate(key: string): boolean {
  const lastSent = _recentAlerts.get(key);
  if (lastSent && Date.now() - lastSent < DEDUP_WINDOW_MS) {
    return true;
  }
  return false;
}

function recordSent(key: string): void {
  _recentAlerts.set(key, Date.now());

  // Housekeeping: prune expired entries every 100 inserts
  if (_recentAlerts.size > 200) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [k, ts] of _recentAlerts) {
      if (ts < cutoff) _recentAlerts.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// Channel: Resend email
// ---------------------------------------------------------------------------

async function sendEmailAlert(alert: AlertPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO || 'ops@hirematch.app';
  if (!apiKey) return;

  const severityEmoji: Record<AlertSeverity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'HireMatch Alerts <agentix.biz@gmail.com>',
        to: [to],
        subject: `${severityEmoji[alert.severity]} [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`,
        html: `
          <h2>${alert.type}</h2>
          <p><strong>Severity:</strong> ${alert.severity}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <pre>${JSON.stringify(alert.metadata, null, 2)}</pre>
        `,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Silently ignore email failures — don't let alerting break the app
  }
}

// ---------------------------------------------------------------------------
// Channel: Slack webhook
// ---------------------------------------------------------------------------

async function sendSlackAlert(alert: AlertPayload): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const colorMap: Record<AlertSeverity, string> = {
    info: '#2196F3',
    warning: '#FF9800',
    critical: '#F44336',
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color: colorMap[alert.severity],
            title: `[${alert.severity.toUpperCase()}] ${alert.type}`,
            text: alert.message,
            fields: Object.entries(alert.metadata).map(([k, v]) => ({
              title: k,
              value: String(v),
              short: true,
            })),
            ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silently ignore Slack failures
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send an alert via all configured channels.
 * Deduplicates identical alerts within a 15-minute window.
 */
export async function sendAlert(
  type: AlertType,
  severity: AlertSeverity,
  message: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const key = dedupKey(type, severity, message);
  if (isDuplicate(key)) return;

  const alert: AlertPayload = {
    type,
    severity,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };

  recordSent(key);

  // Fire channels in parallel — don't await sequentially
  await Promise.allSettled([
    sendEmailAlert(alert),
    sendSlackAlert(alert),
  ]);
}
