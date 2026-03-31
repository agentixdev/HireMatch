import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { createHash } from 'crypto';

function generateReferralCode(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 10).toUpperCase();
}

/**
 * GET /api/referrals
 * Returns the current user's referral code and stats.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Determine role
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = profile?.role || 'candidate';
    const table = role === 'recruiter' ? 'recruiters' : 'candidates';

    // Get referral code
    const { data: row } = await service
      .from(table)
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    const code = row?.referral_code || null;

    // Count how many users were referred by this code
    let referred = 0;
    if (code) {
      const { count: candCount } = await service
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', code);
      const { count: recCount } = await service
        .from('recruiters')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', code);
      referred = (candCount || 0) + (recCount || 0);
    }

    return NextResponse.json({
      code,
      stats: { referred, hired: 0 },
    });
  } catch (error) {
    console.error('[api/referrals] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch referral data' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/referrals
 * Generates a referral code for the current user if none exists.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Determine role
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = profile?.role || 'candidate';
    const table = role === 'recruiter' ? 'recruiters' : 'candidates';

    // Check if code already exists
    const { data: row } = await service
      .from(table)
      .select('referral_code')
      .eq('user_id', user.id)
      .single();

    if (row?.referral_code) {
      return NextResponse.json({ code: row.referral_code });
    }

    // Generate and store
    const code = generateReferralCode(user.id);
    const { error: updateError } = await service
      .from(table)
      .update({ referral_code: code })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[api/referrals] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to generate referral code' }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error('[api/referrals] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate referral code' },
      { status: 500 },
    );
  }
}
