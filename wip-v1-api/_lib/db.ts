import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for API v1 routes.
 * Uses service role key to bypass RLS — all access control is handled by
 * the middleware layer (org_id filtering, scope checks).
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getServiceClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    _client = createClient(url, key);
  }
  return _client;
}

/**
 * Execute a raw SQL query via Supabase's rpc or rest endpoint.
 * Useful for pgvector / tsvector queries that the query-builder can't express.
 */
export async function rawQuery<T = unknown>(
  sql: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const client = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc('raw_sql', { query: sql, params });
  if (error) throw error;
  return (data ?? []) as T[];
}
