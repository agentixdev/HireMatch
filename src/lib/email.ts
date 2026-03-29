import { Resend } from 'resend';
import { render } from '@react-email/components';
import WelcomeEmail from '@/emails/WelcomeEmail';
import PasswordResetEmail from '@/emails/PasswordResetEmail';
import ApplicationNotificationEmail from '@/emails/ApplicationNotificationEmail';
import StatusUpdateEmail from '@/emails/StatusUpdateEmail';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'HireMatch <agentix.biz@gmail.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hirematch-ten.vercel.app';

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name: string, role: 'candidate' | 'recruiter'): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const dashboardUrl = `${APP_URL}/dashboard/${role}`;

  const html = await render(WelcomeEmail({ name: name || 'there', role, dashboardUrl }));

  try {
    await resend.emails.send({ from: FROM, to, subject: `Welcome to HireMatch, ${name || 'there'}!`, html });
    return true;
  } catch (err) {
    console.error('[email] Welcome email failed:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, resetCode: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const resetUrl = `${APP_URL}/auth/forgot-password?code=${resetCode}&email=${encodeURIComponent(to)}`;

  const html = await render(PasswordResetEmail({ name: '', otpCode: resetCode, resetUrl }));

  try {
    await resend.emails.send({ from: FROM, to, subject: 'Reset your HireMatch password', html });
    return true;
  } catch (err) {
    console.error('[email] Reset email failed:', err);
    return false;
  }
}

export async function sendApplicationNotification(
  to: string,
  candidateName: string,
  jobTitle: string,
  jobId: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const viewUrl = `${APP_URL}/dashboard/recruiter/applications`;

  const html = await render(
    ApplicationNotificationEmail({ candidateName, jobTitle, companyName: '', viewUrl }),
  );

  try {
    await resend.emails.send({ from: FROM, to, subject: `New application: ${candidateName} applied for ${jobTitle}`, html });
    return true;
  } catch (err) {
    console.error('[email] Application notification failed:', err);
    return false;
  }
}

export async function sendStatusUpdateEmail(
  to: string,
  candidateName: string,
  jobTitle: string,
  status: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const applicationsUrl = `${APP_URL}/dashboard/candidate/applications`;

  const html = await render(
    StatusUpdateEmail({ candidateName, jobTitle, status, applicationsUrl }),
  );

  try {
    await resend.emails.send({ from: FROM, to, subject: `Application update: ${jobTitle}`, html });
    return true;
  } catch (err) {
    console.error('[email] Status update email failed:', err);
    return false;
  }
}
