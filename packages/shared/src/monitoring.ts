export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    redis: boolean;
    minio: boolean;
  };
  timestamp: string;
}

export function buildHealthResponse(
  checks: { database: boolean; redis: boolean; minio: boolean },
  version: string,
  startTime: number,
): HealthCheck {
  const allHealthy = checks.database && checks.redis;
  const anyDown = !checks.database;

  return {
    status: anyDown ? 'down' : allHealthy ? 'ok' : 'degraded',
    version,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    timestamp: new Date().toISOString(),
  };
}

export const ALERT_THRESHOLDS = {
  DLQ_SPIKE_COUNT: 10,
  DLQ_SPIKE_WINDOW_MS: 5 * 60 * 1000,
  EMBEDDING_BACKLOG_MAX: 1000,
  API_ERROR_RATE_MAX: 0.01,
  API_ERROR_WINDOW_MS: 5 * 60 * 1000,
  SCRAPE_FAILURE_STREAK_MAX: 5,
  BILLING_WARNING_THRESHOLD: 0.8,
} as const;

export type AlertType =
  | 'dlq_spike'
  | 'embedding_backlog'
  | 'api_error_rate'
  | 'scrape_failure_streak'
  | 'billing_limit_warning'
  | 'billing_limit_reached'
  | 'webhook_endpoint_disabled'
  | 'subscription_payment_failed';

export interface Alert {
  type: AlertType;
  severity: 'warning' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export function createAlert(
  type: AlertType,
  message: string,
  metadata: Record<string, unknown> = {},
): Alert {
  const severity: Record<AlertType, 'warning' | 'critical'> = {
    dlq_spike: 'critical',
    embedding_backlog: 'warning',
    api_error_rate: 'critical',
    scrape_failure_streak: 'warning',
    billing_limit_warning: 'warning',
    billing_limit_reached: 'critical',
    webhook_endpoint_disabled: 'warning',
    subscription_payment_failed: 'critical',
  };

  return {
    type,
    severity: severity[type],
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };
}
