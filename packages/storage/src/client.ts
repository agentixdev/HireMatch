import { Client } from 'minio';

export interface StorageConfig {
  endPoint?: string;
  port?: number;
  accessKey?: string;
  secretKey?: string;
  useSSL?: boolean;
}

let singleton: Client | null = null;

/**
 * Create a MinIO/S3-compatible storage client.
 * Uses environment variables as defaults.
 */
export function createStorageClient(config?: StorageConfig): Client {
  const accessKey = config?.accessKey || process.env['MINIO_ACCESS_KEY'] || '';
  const secretKey = config?.secretKey || process.env['MINIO_SECRET_KEY'] || '';

  if (!accessKey || !secretKey) {
    throw new Error('MinIO access key and secret key are required');
  }

  return new Client({
    endPoint: config?.endPoint || process.env['MINIO_ENDPOINT'] || 'localhost',
    port: config?.port || parseInt(process.env['MINIO_PORT'] || '9000', 10),
    accessKey,
    secretKey,
    useSSL: config?.useSSL ?? (process.env['MINIO_USE_SSL'] === 'true'),
  });
}

/**
 * Get or create a singleton storage client.
 */
export function getMinioClient(config?: StorageConfig): Client {
  if (!singleton) {
    singleton = createStorageClient(config);
  }
  return singleton;
}

// Alias for backward compatibility
export const getStorageClient = getMinioClient;

/**
 * Reset the singleton (for testing).
 */
export function resetMinioClient(): void {
  singleton = null;
}

// Alias for backward compatibility
export const resetStorageClient = resetMinioClient;
