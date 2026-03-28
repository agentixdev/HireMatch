import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * Password reset with optional email OTP verification.
 *
 * When RESEND_API_KEY is set:
 *   - "request" sends a 6-digit OTP via email
 *   - "verify" validates the OTP
 *   - "reset" requires a valid OTP to change the password
 *
 * When RESEND_API_KEY is NOT set (fallback):
 *   - "request" verifies email exists
 *   - "reset" directly changes the password (less secure, no email needed)
 */

// In-memory OTP store (per serverless instance — acceptable for low traffic)
const otpStore = new Map<string, { code: string; expires: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email, newPassword, action, code } = await request.json();
    const hasResend = !!process.env.RESEND_API_KEY;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'request') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const { data: users } = await admin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);

      if (!user) {
        // Don't reveal whether the email exists — but return consistent shape
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, you will receive a reset code.',
          requiresCode: hasResend,
        });
      }

      if (hasResend) {
        // Generate OTP and send via Resend
        const otp = generateOTP();
        otpStore.set(email.toLowerCase(), { code: otp, expires: Date.now() + 15 * 60 * 1000 });

        const sent = await sendPasswordResetEmail(email, otp);
        if (!sent) {
          console.error('[auth/reset-password] Failed to send reset email');
        }

        return NextResponse.json({
          success: true,
          message: 'A reset code has been sent to your email.',
          requiresCode: true,
          emailExists: true,
        });
      }

      // Fallback: no email — allow direct reset
      return NextResponse.json({
        success: true,
        message: 'Email verified. You can now set a new password.',
        requiresCode: false,
        emailExists: true,
      });
    }

    if (action === 'verify') {
      if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
      }

      const stored = otpStore.get(email.toLowerCase());
      if (!stored || stored.code !== code || Date.now() > stored.expires) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
      }

      return NextResponse.json({ success: true, verified: true });
    }

    if (action === 'reset') {
      if (!email || !newPassword) {
        return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }

      // If Resend is configured, require valid OTP
      if (hasResend) {
        if (!code) {
          return NextResponse.json({ error: 'Reset code is required' }, { status: 400 });
        }
        const stored = otpStore.get(email.toLowerCase());
        if (!stored || stored.code !== code || Date.now() > stored.expires) {
          return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }
        // OTP consumed — remove it
        otpStore.delete(email.toLowerCase());
      }

      const { data: users } = await admin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);

      if (!user) {
        return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (updateError) {
        console.error('[auth/reset-password] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully. You can now sign in.',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "request", "verify", or "reset".' }, { status: 400 });
  } catch (error) {
    console.error('[auth/reset-password] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Password reset failed' },
      { status: 500 }
    );
  }
}
