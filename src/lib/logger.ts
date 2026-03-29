/**
 * Structured logger for HireMatch.
 *
 * Outputs JSON in production for log aggregation (Vercel, Datadog, etc.)
 * and human-readable format in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }
  const { level, message, context, ...extra } = entry;
  const prefix = context ? `[${context}]` : '';
  const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
  return `${prefix} ${message}${extraStr}`;
}

function createLogger(context?: string) {
  function log(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    const entry: LogEntry = { level, message, context, ...extra };
    const formatted = formatEntry(entry);

    switch (level) {
      case 'debug':
        if (!IS_PRODUCTION) console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => log('debug', msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
  };
}

export const logger = createLogger();
export { createLogger };
