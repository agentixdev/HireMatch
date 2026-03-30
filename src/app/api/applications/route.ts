import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import { createLogger } from '@/lib/logger';
import { fireWebhooks } from '@/lib/webhooks';
import { sendApplicationNotification } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import type { ApplicationStatus, StatusChange } from '@/types';

const log = createLogger('api/applications');

/**
 * POST /api/applications — Candidate applies to a job.
 * Auth required: must be a candidate.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Verify user is a candidate
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'candidate') {
      return NextResponse.json({ error: 'Only candidates can apply to jobs' }, { status: 403 });
    }

    // Get candidate record
    const { data: candidate, error: candError } = await service
      .from('candidates')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (candError || !candidate) {
      return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { job_id, cover_letter } = body;

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    // Look up the job to get recruiter_id and title
    const { data: job, error: jobError } = await service
      .from('jobs')
      .select('id, recruiter_id, title, is_active')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.is_active) {
      return NextResponse.json({ error: 'This job is no longer accepting applications' }, { status: 400 });
    }

    // Check for existing application
    const { data: existing } = await service
      .from('applications')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('job_id', job_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You have already applied to this job' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const initialStatus: ApplicationStatus = 'applied';
    const statusHistory: StatusChange[] = [
      {
        status: initialStatus,
        changed_at: now,
        changed_by: user.id,
      },
    ];

    // Create the application
    const { data: application, error: insertError } = await service
      .from('applications')
      .insert({
        candidate_id: candidate.id,
        job_id,
        recruiter_id: job.recruiter_id,
        status: initialStatus,
        cover_letter: cover_letter || null,
        status_history: statusHistory,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to create application', { error: insertError.message });
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    // Increment applications_count on the job (non-blocking)
    service
      .rpc('increment_applications_count', { job_id })
      .then(({ error }) => {
        if (error) log.warn('Failed to increment applications_count', { jobId: job_id, error: error.message });
      });

    // Fire webhook to recruiter (non-blocking)
    fireWebhooks(job.recruiter_id, 'application.created', {
      application_id: application.id,
      candidate_id: candidate.id,
      job_id,
      job_title: job.title,
      candidate_name: candidate.full_name,
      status: initialStatus,
    }).catch((err) => log.error('Webhook fire failed', { error: String(err) }));

    // Send email notification to recruiter (non-blocking)
    (async () => {
      try {
        // Look up recruiter's user_id, then get their email from auth
        const { data: recruiter } = await service
          .from('recruiters')
          .select('user_id')
          .eq('id', job.recruiter_id)
          .single();

        if (recruiter) {
          const { data: { user: recruiterUser } } = await service.auth.admin.getUserById(recruiter.user_id);
          if (recruiterUser?.email) {
            await sendApplicationNotification(
              recruiterUser.email,
              candidate.full_name,
              job.title,
              job_id,
            );
          }
        }
      } catch (err) {
        log.error('Failed to send application notification email', { error: String(err) });
      }
    })();

    // Create in-app notification for recruiter (non-blocking)
    (async () => {
      try {
        const { data: recruiter } = await service
          .from('recruiters')
          .select('user_id')
          .eq('id', job.recruiter_id)
          .single();

        if (recruiter) {
          await createNotification(
            recruiter.user_id,
            'application_update',
            `New application for ${job.title}`,
            `${candidate.full_name} applied for ${job.title}`,
            '/dashboard/recruiter/applications',
            { application_id: application.id, candidate_id: candidate.id, job_id },
          );
        }
      } catch (err) {
        log.error('Failed to create recruiter notification', { error: String(err) });
      }
    })();

    log.info('Application created', { applicationId: application.id, candidateId: candidate.id, jobId: job_id });
    return NextResponse.json({ ok: true, application });
  } catch (error) {
    log.error('POST error', { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/applications — List applications for the current user.
 * - Candidate: returns their own applications with job details.
 * - Recruiter: returns applications for their jobs.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Determine role
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role === 'candidate') {
      // Get candidate record
      const { data: candidate } = await service
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate profile not found' }, { status: 404 });
      }

      const { data: applications, error: fetchError } = await service
        .from('applications')
        .select('*, jobs:job_id(*)')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        log.error('Failed to fetch candidate applications', { error: fetchError.message });
        return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, applications });
    }

    if (profile.role === 'recruiter') {
      const { data: recruiter } = await service
        .from('recruiters')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!recruiter) {
        return NextResponse.json({ error: 'Recruiter profile not found' }, { status: 404 });
      }

      const { data: applications, error: fetchError } = await service
        .from('applications')
        .select('*, jobs:job_id(*), candidates:candidate_id(*)')
        .eq('recruiter_id', recruiter.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        log.error('Failed to fetch recruiter applications', { error: fetchError.message });
        return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, applications });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
  } catch (error) {
    log.error('GET error', { error: String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
