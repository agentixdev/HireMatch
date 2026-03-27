export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: {
    userId: string;
    role: string;
    orgId?: string;
    ip?: string;
    userAgent?: string;
  };
  action: string;
  resource: {
    type: string;
    id: string;
  };
  details?: Record<string, unknown>;
  result: "success" | "failure" | "denied";
  metadata?: {
    requestId?: string;
    sessionId?: string;
    correlationId?: string;
  };
}

export type AuditSink = (entry: AuditEntry) => Promise<void>;

/** In-memory buffer for batching audit log writes */
const auditBuffer: AuditEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let registeredSink: AuditSink | null = null;

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_SIZE = 100;

/**
 * Register an audit log sink (database writer, external service, etc.).
 * The sink receives batches of audit entries.
 */
export function registerAuditSink(sink: AuditSink): void {
  registeredSink = sink;
}

/**
 * Flush the audit buffer, sending all entries to the registered sink.
 */
export async function flushAuditBuffer(): Promise<void> {
  if (auditBuffer.length === 0 || !registeredSink) return;

  const entries = auditBuffer.splice(0, auditBuffer.length);
  const sink = registeredSink;

  await Promise.allSettled(entries.map((entry) => sink(entry)));
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushAuditBuffer();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Log an audit event. Entries are buffered and flushed periodically
 * or when the buffer reaches MAX_BUFFER_SIZE.
 */
export async function audit(
  params: Omit<AuditEntry, "id" | "timestamp">
): Promise<AuditEntry> {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };

  auditBuffer.push(entry);

  if (auditBuffer.length >= MAX_BUFFER_SIZE) {
    await flushAuditBuffer();
  } else {
    scheduleFlush();
  }

  return entry;
}

/**
 * Create a scoped audit logger pre-filled with actor info.
 */
export function createAuditLogger(actor: AuditEntry["actor"]) {
  return {
    success(
      action: string,
      resource: AuditEntry["resource"],
      details?: Record<string, unknown>,
      metadata?: AuditEntry["metadata"]
    ) {
      return audit({ actor, action, resource, details, result: "success", metadata });
    },
    failure(
      action: string,
      resource: AuditEntry["resource"],
      details?: Record<string, unknown>,
      metadata?: AuditEntry["metadata"]
    ) {
      return audit({ actor, action, resource, details, result: "failure", metadata });
    },
    denied(
      action: string,
      resource: AuditEntry["resource"],
      details?: Record<string, unknown>,
      metadata?: AuditEntry["metadata"]
    ) {
      return audit({ actor, action, resource, details, result: "denied", metadata });
    },
  };
}
