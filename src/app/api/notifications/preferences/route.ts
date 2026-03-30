import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';

/**
 * GET /api/notifications/preferences — Fetch user's notification preferences.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    const { data, error } = await service
      .from('notification_preferences')
      .select('email_matches, email_applications, email_recommendations, email_digest, in_app_enabled')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // Return defaults if no preferences exist yet
      return NextResponse.json({
        email_matches: true,
        email_applications: true,
        email_recommendations: true,
        email_digest: 'daily',
        in_app_enabled: true,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/preferences — Update notification preferences.
 * Body: { email_matches, email_applications, email_recommendations, email_digest, in_app_enabled }
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const service = await createServiceClient();

    const validDigests = ['realtime', 'daily', 'weekly', 'never'];
    const prefs: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.email_matches === 'boolean') prefs.email_matches = body.email_matches;
    if (typeof body.email_applications === 'boolean') prefs.email_applications = body.email_applications;
    if (typeof body.email_recommendations === 'boolean') prefs.email_recommendations = body.email_recommendations;
    if (typeof body.in_app_enabled === 'boolean') prefs.in_app_enabled = body.in_app_enabled;
    if (typeof body.email_digest === 'string' && validDigests.includes(body.email_digest)) {
      prefs.email_digest = body.email_digest;
    }

    // Upsert: insert if not exists, update if exists
    const { error } = await service
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...prefs,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
