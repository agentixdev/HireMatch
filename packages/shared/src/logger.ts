import pino from 'pino';

export interface LogContext {
  trace_id?: string;
  tenant_id?: string;
  request_id?: string;
  service?: string;
}

export function createLogger(service: string, level = 'info') {
  return pino({
    name: service,
    level,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service },
  });
}

export function childLogger(
  logger: pino.Logger,
  context: LogContext,
) {
  return logger.child(context);
}

export type Logger = pino.Logger;
