import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/jobs/[id]');

const ALLOWED_FIELDS = new Set([
  'title', 'description', 'requirements', 'nice_to_haves', 'skills_required',
  'job_type', 'work_mode', 'country', 'city', 'salary_min', 'salary_max',
  'salary_currency', 'visa_sponsorship', 'experience_min', 'experience_max',
  'education_level', 'industry', 'match_tags', 'is_active', 'is_featured',
  'expires_at',
]);

/**
 * PATCH /api/jobs/[id] — Update a job listing.
 * Auth required: recruiter must own the job.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Look up recruiter profile for this user
    const { data: recruiter, error: recError } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (recError || !recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 403 });
    }

    // Verify job belongs to this recruiter
    const { data: job, error: jobError } = await service
      .from('jobs')
      .select('id, recruiter_id')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.recruiter_id !== recruiter.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Filter body to allowed fields only
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await service
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      log.error('Failed to update job', { jobId: id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    log.info('Job updated', { jobId: id, recruiterId: recruiter.id });
    return NextResponse.json({ ok: true, job: updated });
  } catch (error) {
    log.error('PATCH error', { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/jobs/[id] — Soft-delete a job (set is_active = false).
 * Auth required: recruiter must own the job.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    const { data: recruiter, error: recError } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (recError || !recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 403 });
    }

    const { data: job, error: jobError } = await service
      .from('jobs')
      .select('id, recruiter_id')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.recruiter_id !== recruiter.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updateError } = await service
      .from('jobs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      log.error('Failed to soft-delete job', { jobId: id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    log.info('Job soft-deleted', { jobId: id, recruiterId: recruiter.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error('DELETE error', { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
