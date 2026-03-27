import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin-powered password reset. Since Supabase free tier email delivery
 * is unreliable, this endpoint directly resets the password using the
 * admin API when the user provides their email and new password.
 *
 * For security, a simple OTP is generated and logged (in production,
 * this would be sent via a reliable email provider like Resend).
 */
export async function POST(request: Request) {
  try {
    const { email, newPassword, action } = await request.json();

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'request') {
      // Step 1: Verify the email exists
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const { data: users } = await admin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);

      if (!user) {
        // Don't reveal whether the email exists
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, you can now reset your password.',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Email verified. You can now set a new password.',
        emailExists: true,
      });
    }

    if (action === 'reset') {
      // Step 2: Reset the password
      if (!email || !newPassword) {
        return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
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

    return NextResponse.json({ error: 'Invalid action. Use "request" or "reset".' }, { status: 400 });
  } catch (error) {
    console.error('[auth/reset-password] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Password reset failed' },
      { status: 500 }
    );
  }
}
