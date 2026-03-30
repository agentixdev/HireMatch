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
  timestamp: string;
  context?: Record<string, unknown>;
  requestId?: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack,
    };
  }
  return { errorMessage: String(error) };
}

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }
  const { level, message, context, timestamp: _ts, ...extra } = entry;
  const tag = context?.route ? `[${context.route}]` : '';
  const extraStr = Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : '';
  const ctxStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${level.toUpperCase()} ${tag} ${message}${ctxStr}${extraStr}`;
}

function createLogger(defaultContextOrRoute?: string | Record<string, unknown>) {
  const defaultContext: Record<string, unknown> | undefined =
    typeof defaultContextOrRoute === 'string'
      ? { route: defaultContextOrRoute }
      : defaultContextOrRoute;
  function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context || defaultContext
        ? { context: { ...defaultContext, ...context } }
        : {}),
    };
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
    debug: (msg: string, context?: Record<string, unknown>) => log('debug', msg, context),
    info: (msg: string, context?: Record<string, unknown>) => log('info', msg, context),
    warn: (msg: string, context?: Record<string, unknown>) => log('warn', msg, context),
    /**
     * Log an error.
     * - 2-arg: `logger.error('msg', { route: '...' })` — context only
     * - 3-arg: `logger.error('msg', err, { route: '...' })` — Error + context
     */
    error: (msg: string, errorOrContext?: unknown, context?: Record<string, unknown>) => {
      // If second arg is a plain object and no third arg, treat it as context (backward compat)
      if (
        errorOrContext !== null &&
        typeof errorOrContext === 'object' &&
        !(errorOrContext instanceof Error) &&
        !context
      ) {
        log('error', msg, errorOrContext as Record<string, unknown>);
        return;
      }
      const errorDetails = errorOrContext ? serializeError(errorOrContext) : {};
      log('error', msg, { ...errorDetails, ...context });
    },
  };
}

export const logger = createLogger();
export { createLogger };
