import IORedis from "ioredis";
import type { ConnectionOptions } from "bullmq";

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: boolean;
  /** Upstash REST URL — if set, use Upstash-compatible connection */
  upstashUrl?: string;
  /** Upstash REST token */
  upstashToken?: string;
  /** Connection string (redis://...) — takes precedence if set */
  url?: string;
  /** Max retries per request */
  maxRetriesPerRequest?: number | null;
}

let defaultConnection: IORedis | null = null;

/**
 * Create a new IORedis connection for BullMQ.
 * Supports standard Redis and Upstash Redis.
 */
export function createRedisConnection(config: RedisConfig = {}): IORedis {
  if (config.url) {
    return new IORedis(config.url, {
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? null,
      enableReadyCheck: false,
      ...(config.tls ? { tls: {} } : {}),
    });
  }

  return new IORedis({
    host: config.host ?? "localhost",
    port: config.port ?? 6379,
    password: config.password,
    db: config.db ?? 0,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? null,
    enableReadyCheck: false,
    ...(config.tls ? { tls: {} } : {}),
  });
}

/**
 * Get or create the default shared connection.
 */
export function getDefaultConnection(config?: RedisConfig): IORedis {
  if (!defaultConnection) {
    defaultConnection = createRedisConnection(config ?? {
      url: process.env["REDIS_URL"],
    });
  }
  return defaultConnection;
}

/**
 * Convert IORedis instance to BullMQ ConnectionOptions.
 */
export function toBullMQConnection(redis: IORedis): ConnectionOptions {
  return redis as unknown as ConnectionOptions;
}

/**
 * Gracefully close the default connection.
 */
export async function closeDefaultConnection(): Promise<void> {
  if (defaultConnection) {
    await defaultConnection.quit();
    defaultConnection = null;
  }
}
