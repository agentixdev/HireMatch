import { NextResponse } from 'next/server';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = await createServiceClient();

    // Get recruiter record
    const { data: recruiter, error: recError } = await service
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (recError || !recruiter) {
      return NextResponse.json({ error: 'Recruiter not found' }, { status: 404 });
    }

    const recruiterId = recruiter.id;

    // Fetch all applications for this recruiter
    const { data: applications, error: appError } = await service
      .from('applications')
      .select('id, status, match_score, status_history, created_at, job_id')
      .eq('recruiter_id', recruiterId);

    if (appError) {
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    const apps = applications || [];

    // Fetch jobs for this recruiter
    const { data: jobs, error: jobsError } = await service
      .from('jobs')
      .select('id, title, views_count, applications_count, is_active, created_at')
      .eq('recruiter_id', recruiterId)
      .order('created_at', { ascending: false });

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    const allJobs = jobs || [];

    // ── Funnel ──
    const funnel = {
      applied: apps.filter(a => a.status === 'applied').length,
      reviewed: apps.filter(a => a.status === 'reviewed').length,
      shortlisted: apps.filter(a => a.status === 'shortlisted').length,
      interview: apps.filter(a =>
        a.status === 'interview_scheduled' || a.status === 'interview_completed'
      ).length,
      offered: apps.filter(a =>
        a.status === 'offer_extended' || a.status === 'offer_accepted'
      ).length,
      hired: apps.filter(a => a.status === 'hired').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
    };

    // ── Time Metrics ──
    // Calculate durations from status_history JSONB
    function getTimesBetweenStatuses(
      fromStatus: string,
      toStatus: string
    ): number[] {
      const durations: number[] = [];

      for (const app of apps) {
        const history = app.status_history as Array<{
          status: string;
          changed_at: string;
        }> | null;

        if (!history || !Array.isArray(history)) continue;

        let fromTime: number | null = null;
        let toTime: number | null = null;

        for (const entry of history) {
          if (entry.status === fromStatus && fromTime === null) {
            fromTime = new Date(entry.changed_at).getTime();
          }
          if (entry.status === toStatus && toTime === null) {
            toTime = new Date(entry.changed_at).getTime();
          }
        }

        if (fromTime !== null && toTime !== null && toTime > fromTime) {
          durations.push((toTime - fromTime) / (1000 * 60 * 60 * 24)); // days
        }
      }

      return durations;
    }

    function avg(nums: number[]): number {
      if (nums.length === 0) return 0;
      return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10;
    }

    const timeToHire = getTimesBetweenStatuses('applied', 'hired');
    const timeToReview = getTimesBetweenStatuses('applied', 'reviewed');
    const timeToShortlist = getTimesBetweenStatuses('applied', 'shortlisted');

    const time_metrics = {
      avg_time_to_hire_days: avg(timeToHire),
      avg_time_to_first_review_days: avg(timeToReview),
      avg_time_to_shortlist_days: avg(timeToShortlist),
    };

    // ── Job Performance ──
    const jobPerformance = allJobs.map(job => {
      const jobApps = apps.filter(a => a.job_id === job.id);
      const hiredCount = jobApps.filter(a => a.status === 'hired').length;
      const views = job.views_count || 0;
      const appCount = job.applications_count || jobApps.length;
      const conversionRate = views > 0
        ? Math.round((appCount / views) * 1000) / 10
        : 0;

      return {
        id: job.id,
        title: job.title,
        views,
        applications: appCount,
        conversion_rate: conversionRate,
        hired: hiredCount,
        is_active: job.is_active,
      };
    });

    // ── Weekly Trends (last 12 weeks) ──
    const now = new Date();
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7

    function getWeekLabel(date: Date): string {
      const d = new Date(date);
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const month = d.toLocaleString('en', { month: 'short' });
      return `${month} ${d.getDate()}`;
    }

    // Generate all 12 week labels
    const weeklyApplications: Array<{ week: string; count: number }> = [];
    const weeklyHires: Array<{ week: string; count: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const label = getWeekLabel(weekStart);

      const weekApps = apps.filter(a => {
        const created = new Date(a.created_at);
        return created >= weekStart && created < weekEnd;
      });

      const weekHired = apps.filter(a => {
        if (a.status !== 'hired') return false;
        const history = a.status_history as Array<{
          status: string;
          changed_at: string;
        }> | null;
        if (!history) return false;
        const hiredEntry = history.find(h => h.status === 'hired');
        if (!hiredEntry) return false;
        const hiredDate = new Date(hiredEntry.changed_at);
        return hiredDate >= weekStart && hiredDate < weekEnd;
      });

      weeklyApplications.push({ week: label, count: weekApps.length });
      weeklyHires.push({ week: label, count: weekHired.length });
    }

    // ── Overview ──
    const totalApplications = apps.length;
    const totalHires = apps.filter(a => a.status === 'hired').length;
    const hireRate = totalApplications > 0
      ? Math.round((totalHires / totalApplications) * 1000) / 10
      : 0;
    const activeJobs = allJobs.filter(j => j.is_active).length;
    const matchScores = apps
      .filter(a => a.match_score != null && a.match_score > 0)
      .map(a => a.match_score as number);
    const avgMatchScore = matchScores.length > 0
      ? Math.round(matchScores.reduce((s, n) => s + n, 0) / matchScores.length)
      : 0;

    return NextResponse.json({
      funnel,
      time_metrics,
      job_performance: jobPerformance,
      trends: {
        weekly_applications: weeklyApplications,
        weekly_hires: weeklyHires,
      },
      overview: {
        total_applications: totalApplications,
        total_hires: totalHires,
        hire_rate: hireRate,
        active_jobs: activeJobs,
        avg_match_score: avgMatchScore,
      },
    });
  } catch (err) {
    console.error('Analytics API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
