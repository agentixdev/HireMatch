import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || 'HireMatch <noreply@hirematch.app>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://hirematch-ten.vercel.app';

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

function layout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:40px;height:40px;background:linear-gradient(135deg,#2563eb,#4f46e5);border-radius:10px;line-height:40px;color:#fff;font-weight:bold;font-size:18px;">H</div>
      <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:20px;font-weight:bold;color:#fff;">HireMatch</span>
    </div>
    <div style="background:#0F172A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:32px;">
      <h1 style="color:#fff;font-size:22px;margin:0 0 20px;text-align:center;">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:12px;margin-top:24px;">
      &copy; ${new Date().getFullYear()} HireMatch. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

function button(text: string, href: string): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;padding:12px 32px;background:linear-gradient(90deg,#2563eb,#4f46e5);color:#fff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">${text}</a>
  </div>`;
}

function text(content: string): string {
  return `<p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;">${content}</p>`;
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name: string, role: 'candidate' | 'recruiter'): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const dashboardUrl = `${APP_URL}/dashboard/${role}`;
  const roleLabel = role === 'candidate' ? 'candidate' : 'recruiter';

  const html = layout('Welcome to HireMatch!', `
    ${text(`Hi ${name || 'there'},`)}
    ${text(`Your ${roleLabel} account is ready. ${
      role === 'candidate'
        ? 'Upload your CV and let our AI match you with the perfect opportunities across 29 countries.'
        : 'Post jobs and discover top talent with AI-powered matching across 29 countries.'
    }`)}
    ${button('Go to Dashboard', dashboardUrl)}
    ${text('If you have any questions, just reply to this email.')}
  `);

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

  const html = layout('Reset Your Password', `
    ${text('We received a request to reset your password. Click the button below to set a new one.')}
    ${button('Reset Password', resetUrl)}
    ${text('Or use this code manually:')}
    <div style="text-align:center;margin:16px 0;">
      <span style="display:inline-block;padding:12px 24px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:28px;letter-spacing:6px;font-weight:bold;">${resetCode}</span>
    </div>
    ${text('This code expires in 15 minutes. If you didn\'t request this, you can safely ignore this email.')}
  `);

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

  const html = layout('New Application Received', `
    ${text(`<strong>${candidateName}</strong> just applied for <strong>${jobTitle}</strong>.`)}
    ${button('View Application', viewUrl)}
    ${text('Review their profile and respond to keep top candidates engaged.')}
  `);

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

  const statusMessages: Record<string, string> = {
    shortlisted: 'Great news! You\'ve been shortlisted.',
    interview: 'You\'ve been invited to interview.',
    offered: 'Congratulations! You\'ve received an offer.',
    rejected: 'Unfortunately, they\'ve decided to move forward with other candidates.',
  };

  const html = layout('Application Update', `
    ${text(`Hi ${candidateName},`)}
    ${text(`Your application for <strong>${jobTitle}</strong> has been updated.`)}
    <div style="text-align:center;margin:20px 0;padding:16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:8px;">
      <span style="color:#818cf8;font-size:16px;font-weight:600;">Status: ${status.charAt(0).toUpperCase() + status.slice(1)}</span>
    </div>
    ${text(statusMessages[status] || `Your status has been updated to: ${status}`)}
    ${button('View Applications', `${APP_URL}/dashboard/candidate/applications`)}
  `);

  try {
    await resend.emails.send({ from: FROM, to, subject: `Application update: ${jobTitle}`, html });
    return true;
  } catch (err) {
    console.error('[email] Status update email failed:', err);
    return false;
  }
}
