import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';

/**
 * GET /api/notifications — Fetch user's notifications (paginated, most recent first).
 * Query params: ?unread_only=true&limit=20&offset=0
 * Returns: { notifications: [...], unread_count: number }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
    if (!user) {
      // Return empty notifications for unauthenticated users (bell component calls on every page)
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const service = await createServiceClient();

    // Fetch notifications
    let query = service
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unread count
    const { count, error: countError } = await service
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: countError ? 0 : (count || 0),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications — Mark notifications as read.
 * Body: { ids: string[] } or { all: true }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const service = await createServiceClient();

    if (body.all === true) {
      // Mark all as read
      const { error } = await service
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await service
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', body.ids);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Provide { ids: string[] } or { all: true }' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
