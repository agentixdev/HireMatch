import { createServerClient } from '@supabase/ssr';
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
      // Get user to check role and ensure profile exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = user.user_metadata?.role || 'candidate';
        const fullName = user.user_metadata?.full_name || '';

        // Ensure profile record exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existingProfile) {
          await supabase.from('profiles').insert({ user_id: user.id, role });

          // Create role-specific record
          if (role === 'candidate') {
            await supabase.from('candidates').insert({
              user_id: user.id,
              full_name: fullName,
              email: user.email,
              country: 'us',
            });
            return NextResponse.redirect(`${origin}/dashboard/candidate/onboarding`);
          } else {
            await supabase.from('recruiters').insert({
              user_id: user.id,
              company_name: '',
              country: 'us',
            });
            return NextResponse.redirect(`${origin}/dashboard/recruiter/onboarding`);
          }
        }

        // Profile exists — redirect to appropriate dashboard
        const redirectPath = role === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/candidate';
        return NextResponse.redirect(`${origin}${next === '/' ? redirectPath : next}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_failed`);
}
