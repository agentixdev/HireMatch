import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { generateApiKey, API_TIERS, type ApiTier } from '@/lib/api-keys';

/**
 * GET /api/v1/keys — List API keys for the authenticated recruiter.
 * POST /api/v1/keys — Create a new API key.
 * DELETE /api/v1/keys?id=<key_id> — Revoke an API key.
 */

async function getRecruiter() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await createServiceClient();
  const { data: recruiter } = await admin
    .from('recruiters')
    .select('id, tier')
    .eq('user_id', user.id)
    .single();

  return recruiter ? { ...recruiter, userId: user.id } : null;
}

export async function GET() {
  const recruiter = await getRecruiter();
  if (!recruiter) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await createServiceClient();
  const { data: keys } = await admin
    .from('api_keys')
    .select('id, name, key_prefix, tier, rate_limit_per_min, monthly_quota, requests_this_month, quota_reset_at, is_active, last_used_at, created_at, revoked_at')
    .eq('recruiter_id', recruiter.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ok: true, keys: keys || [], tier: recruiter.tier || 'free' });
}

export async function POST(request: Request) {
  const recruiter = await getRecruiter();
  if (!recruiter) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only paid recruiters can create API keys
  if (!recruiter.tier || recruiter.tier === 'free') {
    return NextResponse.json(
      { error: 'API access requires a paid plan. Upgrade to Pro or higher.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = (body.name || 'Default').slice(0, 64);
  const tier: ApiTier = body.tier && body.tier in API_TIERS ? body.tier : 'starter';
  const tierConfig = API_TIERS[tier];

  const admin = await createServiceClient();

  // Limit: max 5 active keys per recruiter
  const { count } = await admin
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('recruiter_id', recruiter.id)
    .eq('is_active', true);

  if ((count || 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 active API keys allowed' }, { status: 400 });
  }

  const { plaintext, hash, prefix } = generateApiKey();

  const { data: keyRecord, error } = await admin
    .from('api_keys')
    .insert({
      recruiter_id: recruiter.id,
      name,
      key_hash: hash,
      key_prefix: prefix,
      tier,
      rate_limit_per_min: tierConfig.ratePerMin,
      monthly_quota: tierConfig.monthlyQuota,
    })
    .select('id, name, key_prefix, tier, rate_limit_per_min, monthly_quota, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    key: plaintext,  // Only shown once!
    details: keyRecord,
    warning: 'Save this key now. It will not be shown again.',
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const recruiter = await getRecruiter();
  if (!recruiter) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'Missing key id' }, { status: 400 });
  }

  const admin = await createServiceClient();
  const { error } = await admin
    .from('api_keys')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('recruiter_id', recruiter.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: 'API key revoked' });
}
