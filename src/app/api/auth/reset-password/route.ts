import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

/**
 * Password reset with optional email OTP verification.
 *
 * When RESEND_API_KEY is set:
 *   - "request" sends a 6-digit OTP via email (stored in Supabase user_metadata)
 *   - "verify" validates the OTP
 *   - "reset" requires a valid OTP to change the password
 *
 * When RESEND_API_KEY is NOT set (fallback):
 *   - "request" verifies email exists
 *   - "reset" directly changes the password (less secure, no email needed)
 *
 * OTPs are stored in Supabase user_metadata so they persist across
 * serverless function invocations (unlike in-memory Maps).
 */

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { email, newPassword, action, code } = await request.json();
    const hasResend = !!process.env.RESEND_API_KEY;
    const admin = getAdmin();

    if (action === 'request') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = users?.users?.find(u => u.email === normalizedEmail);

      if (!user) {
        // Don't reveal whether the email exists — return consistent shape
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, you will receive a reset code.',
          requiresCode: hasResend,
        });
      }

      if (hasResend) {
        // Generate OTP and store in user_metadata (persists across serverless invocations)
        const otp = generateOTP();
        const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

        const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            reset_otp: otp,
            reset_otp_expires: otpExpires,
          },
        });

        if (updateErr) {
          console.error('[auth/reset-password] Failed to store OTP:', updateErr);
          return NextResponse.json({ error: 'Failed to initiate password reset' }, { status: 500 });
        }

        const sent = await sendPasswordResetEmail(normalizedEmail, otp);
        if (!sent) {
          console.error('[auth/reset-password] Failed to send reset email');
          // Still return success to not reveal email existence,
          // but log for debugging
        }

        return NextResponse.json({
          success: true,
          message: 'A reset code has been sent to your email.',
          requiresCode: true,
        });
      }

      // Fallback: no email — allow direct reset
      return NextResponse.json({
        success: true,
        message: 'Email verified. You can now set a new password.',
        requiresCode: false,
      });
    }

    if (action === 'verify') {
      if (!email || !code) {
        return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = users?.users?.find(u => u.email === normalizedEmail);

      if (!user) {
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
      }

      const storedOtp = user.user_metadata?.reset_otp;
      const otpExpires = user.user_metadata?.reset_otp_expires;

      if (!storedOtp || storedOtp !== code || !otpExpires || Date.now() > otpExpires) {
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

      const normalizedEmail = email.toLowerCase().trim();
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const user = users?.users?.find(u => u.email === normalizedEmail);

      if (!user) {
        return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
      }

      // If Resend is configured, require valid OTP
      if (hasResend) {
        if (!code) {
          return NextResponse.json({ error: 'Reset code is required' }, { status: 400 });
        }

        const storedOtp = user.user_metadata?.reset_otp;
        const otpExpires = user.user_metadata?.reset_otp_expires;

        if (!storedOtp || storedOtp !== code || !otpExpires || Date.now() > otpExpires) {
          return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }
      }

      // Update password and clear OTP from metadata in one call
      const { reset_otp, reset_otp_expires, ...cleanMetadata } = user.user_metadata || {};
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        user_metadata: cleanMetadata,
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
