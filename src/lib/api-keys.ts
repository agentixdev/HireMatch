/**
 * API key generation, validation, and rate limiting for the Visa Data API.
 *
 * Keys use the format: hm_live_<32 random hex chars>
 * Only the SHA-256 hash is stored in the database.
 */

import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';
import { rateLimit } from '@/lib/rate-limit';

const KEY_PREFIX = 'hm_live_';

export interface ApiKeyRecord {
  id: string;
  recruiter_id: string;
  name: string;
  key_prefix: string;
  tier: 'starter' | 'growth' | 'enterprise';
  rate_limit_per_min: number;
  monthly_quota: number;
  requests_this_month: number;
  quota_reset_at: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/** API tier rate limits and quotas */
export const API_TIERS = {
  starter: { name: 'Starter', ratePerMin: 30, monthlyQuota: 1_000, price: 0 },
  growth: { name: 'Growth', ratePerMin: 120, monthlyQuota: 25_000, price: 49 },
  enterprise: { name: 'Enterprise', ratePerMin: 600, monthlyQuota: 500_000, price: 199 },
} as const;

export type ApiTier = keyof typeof API_TIERS;

/** Generate a new API key. Returns both the plaintext key (show once) and the hash. */
export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('hex');
  const plaintext = `${KEY_PREFIX}${random}`;
  const hash = crypto.createHash('sha256').update(plaintext).digest('hex');
  const prefix = plaintext.slice(0, 12) + '...';
  return { plaintext, hash, prefix };
}

/** Hash an API key for lookup. */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export interface ValidatedKey {
  keyRecord: ApiKeyRecord;
  remaining: number;
}

/**
 * Validate an API key from a request.
 * Checks: exists, active, not revoked, within quota, within rate limit.
 */
export async function validateApiKey(
  apiKey: string,
): Promise<{ valid: true; data: ValidatedKey } | { valid: false; error: string; status: number }> {
  if (!apiKey.startsWith(KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format', status: 401 };
  }

  const hash = hashApiKey(apiKey);
  const supabase = await createServiceClient();

  const { data: keyRecord, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', hash)
    .single();

  if (error || !keyRecord) {
    return { valid: false, error: 'Invalid API key', status: 401 };
  }

  if (!keyRecord.is_active || keyRecord.revoked_at) {
    return { valid: false, error: 'API key has been revoked', status: 403 };
  }

  // Check and reset monthly quota if needed
  const now = new Date();
  const resetAt = new Date(keyRecord.quota_reset_at);
  if (now >= resetAt) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabase
      .from('api_keys')
      .update({ requests_this_month: 0, quota_reset_at: nextReset.toISOString() })
      .eq('id', keyRecord.id);
    keyRecord.requests_this_month = 0;
  }

  if (keyRecord.requests_this_month >= keyRecord.monthly_quota) {
    return { valid: false, error: 'Monthly API quota exceeded', status: 429 };
  }

  // Rate limit check (per-minute)
  const rl = rateLimit(`api:${keyRecord.id}`, keyRecord.rate_limit_per_min, 60_000);
  if (!rl.success) {
    return { valid: false, error: 'Rate limit exceeded. Slow down.', status: 429 };
  }

  // Increment usage counter + update last_used_at
  await supabase
    .from('api_keys')
    .update({
      requests_this_month: keyRecord.requests_this_month + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', keyRecord.id);

  return { valid: true, data: { keyRecord, remaining: rl.remaining } };
}

/** Extract API key from request headers. Supports Bearer token and X-API-Key header. */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey) return xApiKey;

  const url = new URL(request.url);
  return url.searchParams.get('api_key');
}

/** Log an API request for analytics. */
export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  request: Request,
) {
  try {
    const supabase = await createServiceClient();
    const url = new URL(request.url);

    await supabase.from('api_usage_logs').insert({
      api_key_id: apiKeyId,
      endpoint,
      method: request.method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
      user_agent: request.headers.get('user-agent')?.slice(0, 256),
      query_params: Object.fromEntries(url.searchParams.entries()),
    });
  } catch {
    // Non-critical — don't fail the API response
  }
}
