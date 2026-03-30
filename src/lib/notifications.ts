import { createServiceClient } from './supabase-server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import MatchNotificationEmail from '@/emails/MatchNotificationEmail';
import JobRecommendationEmail from '@/emails/JobRecommendationEmail';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'match_found' | 'application_update' | 'job_recommendation' | 'system';

export interface NotificationPreferences {
  email_matches: boolean;
  email_applications: boolean;
  email_recommendations: boolean;
  email_digest: 'realtime' | 'daily' | 'weekly' | 'never';
  in_app_enabled: boolean;
}

export interface MatchedJob {
  id: string;
  title: string;
  company: string;
  score: number;
  location?: string;
}

export interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
}

const DEFAULT_PREFS: NotificationPreferences = {
  email_matches: true,
  email_applications: true,
  email_recommendations: true,
  email_digest: 'daily',
  in_app_enabled: true,
};

// ---------------------------------------------------------------------------
// Resend singleton
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'HireMatch <agentix.biz@gmail.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hirematch-ten.vercel.app';

// ---------------------------------------------------------------------------
// Core: create in-app notification
// ---------------------------------------------------------------------------

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string,
  metadata?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const service = await createServiceClient();

    // Check if user has in-app notifications enabled
    const prefs = await getUserNotificationPrefs(userId);
    if (!prefs.in_app_enabled) return false;

    const { error } = await service.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      link: link || null,
      metadata: metadata || {},
    });

    if (error) {
      console.error('[notifications] Failed to create notification:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[notifications] createNotification error:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email: match notification
// ---------------------------------------------------------------------------

export async function sendMatchNotificationEmail(
  to: string,
  candidateName: string,
  matches: MatchedJob[],
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const viewUrl = `${APP_URL}/dashboard/candidate/applications`;

  const html = await render(
    MatchNotificationEmail({ candidateName, matches, viewUrl }),
  );

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'You have new job matches!',
      html,
    });
    return true;
  } catch (err) {
    console.error('[notifications] Match notification email failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email: job recommendation
// ---------------------------------------------------------------------------

export async function sendJobRecommendationEmail(
  to: string,
  candidateName: string,
  jobs: RecommendedJob[],
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const viewAllUrl = `${APP_URL}/jobs`;

  const html = await render(
    JobRecommendationEmail({ candidateName, jobs, viewAllUrl }),
  );

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Jobs you might like',
      html,
    });
    return true;
  } catch (err) {
    console.error('[notifications] Job recommendation email failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export async function getUserNotificationPrefs(userId: string): Promise<NotificationPreferences> {
  try {
    const service = await createServiceClient();

    const { data, error } = await service
      .from('notification_preferences')
      .select('email_matches, email_applications, email_recommendations, email_digest, in_app_enabled')
      .eq('user_id', userId)
      .single();

    if (error || !data) return { ...DEFAULT_PREFS };

    return {
      email_matches: data.email_matches ?? DEFAULT_PREFS.email_matches,
      email_applications: data.email_applications ?? DEFAULT_PREFS.email_applications,
      email_recommendations: data.email_recommendations ?? DEFAULT_PREFS.email_recommendations,
      email_digest: data.email_digest ?? DEFAULT_PREFS.email_digest,
      in_app_enabled: data.in_app_enabled ?? DEFAULT_PREFS.in_app_enabled,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}
