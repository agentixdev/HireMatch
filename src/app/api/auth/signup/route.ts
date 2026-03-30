import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Custom signup endpoint that creates a user and auto-confirms them.
 *
 * Supabase free tier built-in mailer is unreliable (4 emails/hour limit,
 * often spam-filtered). This endpoint uses the admin API to create
 * already-confirmed users, bypassing the email confirmation requirement.
 *
 * When a custom SMTP provider (e.g. Resend) is configured in Supabase,
 * this endpoint can be removed and the standard client-side signUp() used.
 */
export async function POST(request: Request) {
  try {
    const { email, password, fullName, role } = await request.json();

    // Rate limit: 5 signups per minute per email
    const rlKey = `signup:${(email || '').toLowerCase().trim()}`;
    const rl = rateLimit(rlKey, 5, 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } },
      );
    }

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (!['candidate', 'recruiter'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create user with admin API — auto-confirmed
    // The admin API returns an error if the email is already taken,
    // so no need for a separate listUsers() pre-check (which had a race condition).
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { role, full_name: fullName || '' },
    });

    if (createError) {
      console.error('[auth/signup] Create user error:', createError);
      // Map Supabase duplicate-email error to a user-friendly message
      const msg = createError.message?.toLowerCase() || '';
      if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const userId = newUser.user.id;

    // Create profile record
    const { error: profileErr } = await admin.from('profiles').insert({
      user_id: userId,
      role,
    });
    if (profileErr) console.error('[auth/signup] Profile insert error:', profileErr);

    // Create role-specific record
    if (role === 'candidate') {
      const { error: candErr } = await admin.from('candidates').insert({
        user_id: userId,
        full_name: fullName || '',
        email: email.toLowerCase().trim(),
        country: 'us',
      });
      if (candErr) console.error('[auth/signup] Candidate insert error:', candErr);
    } else {
      const { error: recErr } = await admin.from('recruiters').insert({
        user_id: userId,
        company_name: fullName || '',
        country: 'us',
      });
      if (recErr) console.error('[auth/signup] Recruiter insert error:', recErr);
    }

    // Send welcome email (non-blocking — don't fail signup if email fails)
    sendWelcomeEmail(email, fullName || '', role).catch((err) => console.error('[auth/signup] Email send failed:', err));

    return NextResponse.json({
      success: true,
      userId,
      role,
      message: 'Account created successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('[auth/signup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 500 }
    );
  }
}
