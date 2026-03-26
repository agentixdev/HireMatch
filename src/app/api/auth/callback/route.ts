import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'candidate';
        const fullName = user.user_metadata?.full_name || '';

        // Use service role client to bypass RLS for record creation
        const admin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if profile exists
        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existingProfile) {
          const { error: profileErr } = await admin.from('profiles').insert({ user_id: user.id, role });
          if (profileErr) console.error('Profile insert error:', profileErr);

          if (role === 'candidate') {
            const { error: candErr } = await admin.from('candidates').insert({
              user_id: user.id,
              full_name: fullName,
              email: user.email || '',
              country: 'us',
            });
            if (candErr) console.error('Candidate insert error:', candErr);
            return NextResponse.redirect(`${origin}/dashboard/candidate/onboarding`);
          } else {
            const { error: recErr } = await admin.from('recruiters').insert({
              user_id: user.id,
              company_name: '',
              country: 'us',
            });
            if (recErr) console.error('Recruiter insert error:', recErr);
            return NextResponse.redirect(`${origin}/dashboard/recruiter/onboarding`);
          }
        }

        const redirectPath = role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/candidate';
        return NextResponse.redirect(`${origin}${next === '/' ? redirectPath : next}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
}
