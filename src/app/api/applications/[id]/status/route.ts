import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';
import { fireWebhooks } from '@/lib/webhooks';
import { sendStatusUpdateEmail } from '@/lib/email';
import type { ApplicationStatus, StatusChange } from '@/types';

const log = createLogger('api/applications/[id]/status');

const VALID_STATUSES: ApplicationStatus[] = [
  'applied', 'reviewed', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'offer_extended', 'offer_accepted',
  'hired', 'rejected', 'withdrawn',
];

/**
 * PATCH /api/applications/[id]/status — Update application status.
 * Auth required: recruiter who owns the application's job.
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

    // Verify user is a recruiter
    const { data: recruiter, error: recError } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (recError || !recruiter) {
      return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 403 });
    }

    // Fetch the application
    const { data: application, error: appError } = await service
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify recruiter owns this application
    if (application.recruiter_id !== recruiter.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, note } = body as { status: ApplicationStatus; note?: string };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 },
      );
    }

    const oldStatus = application.status;
    const now = new Date().toISOString();

    // Append to status_history
    const currentHistory: StatusChange[] = application.status_history || [];
    const newEntry: StatusChange = {
      status,
      changed_at: now,
      changed_by: user.id,
      ...(note ? { note } : {}),
    };
    const updatedHistory = [...currentHistory, newEntry];

    // Update the application
    const { data: updated, error: updateError } = await service
      .from('applications')
      .update({
        status,
        status_history: updatedHistory,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      log.error('Failed to update application status', { applicationId: id, error: updateError.message });
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Fire webhook (non-blocking)
    fireWebhooks(recruiter.id, 'application.status_changed', {
      application_id: id,
      candidate_id: application.candidate_id,
      job_id: application.job_id,
      old_status: oldStatus,
      new_status: status,
      note: note || null,
    }).catch((err) => log.error('Webhook fire failed', { error: String(err) }));

    // Send status update email to candidate (non-blocking)
    (async () => {
      try {
        // Get candidate details
        const { data: candidate } = await service
          .from('candidates')
          .select('user_id, full_name')
          .eq('id', application.candidate_id)
          .single();

        if (!candidate) return;

        // Get candidate's email from auth
        const { data: { user: candidateUser } } = await service.auth.admin.getUserById(candidate.user_id);
        if (!candidateUser?.email) return;

        // Get job title
        const { data: job } = await service
          .from('jobs')
          .select('title')
          .eq('id', application.job_id)
          .single();

        await sendStatusUpdateEmail(
          candidateUser.email,
          candidate.full_name,
          job?.title || 'Unknown Position',
          status,
        );
      } catch (err) {
        log.error('Failed to send status update email', { error: String(err) });
      }
    })();

    log.info('Application status updated', {
      applicationId: id,
      oldStatus,
      newStatus: status,
      recruiterId: recruiter.id,
    });

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    log.error('PATCH error', { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
