'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';

type Mode = 'signin' | 'signup';
type Role = 'candidate' | 'recruiter';

export default function AuthPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>((searchParams.get('mode') as Mode) || 'signin');
  const [role, setRole] = useState<Role>((searchParams.get('role') as Role) || 'candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const m = searchParams.get('mode') as Mode;
    const r = searchParams.get('role') as Role;
    if (m) setMode(m);
    if (r) setRole(r);

    // Handle callback errors
    if (searchParams.get('error') === 'callback_failed') {
      setError('Email confirmation failed. Please try signing in or resend the confirmation email.');
    }

    // Handle password reset success
    if (searchParams.get('message') === 'password_updated') {
      setSuccess('Password updated successfully. You can now sign in with your new password.');
    }

    // Handle PKCE code exchange (if redirected here with ?code=)
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError('Email confirmation link expired or invalid. Please sign in or request a new one.');
        } else {
          // Successfully confirmed — redirect to dashboard
          supabase.auth.getUser().then(({ data: { user } }) => {
            const userRole = user?.user_metadata?.role;
            router.push(userRole === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/candidate');
          }).catch(() => {
            setError('Failed to fetch user profile. Please sign in.');
          });
        }
      }).catch(() => {
        setError('Email confirmation failed. Please try signing in.');
      });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        // Use custom signup endpoint (auto-confirms, bypasses unreliable Supabase mailer)
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, role }),
        });
        const result = await res.json();

        if (!res.ok) {
          setError(result.error || 'Signup failed');
          setLoading(false);
          return;
        }

        // Auto-sign in after successful signup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError('Account created but sign-in failed. Please sign in manually.');
          setMode('signin');
          setLoading(false);
          return;
        }

        // Redirect to onboarding
        if (role === 'candidate') {
          router.push('/dashboard/candidate/onboarding');
        } else {
          router.push('/dashboard/recruiter/onboarding');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // Redirect based on role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .single();

        if (profile?.role === 'recruiter') {
          router.push('/dashboard/recruiter');
        } else {
          router.push('/dashboard/candidate');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center bg-transparent py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-6">
              {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-center">
                <p className="text-green-400 font-medium text-sm">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t('selectRole')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('candidate')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          role === 'candidate'
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                            : 'border-white/10 text-white/50 hover:border-white/20'
                        }`}
                      >
                        <div className="text-2xl mb-1">👤</div>
                        <div className="text-sm font-medium">{t('candidateRole')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('recruiter')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          role === 'recruiter'
                            ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                            : 'border-white/10 text-white/50 hover:border-white/20'
                        }`}
                      >
                        <div className="text-2xl mb-1">🏢</div>
                        <div className="text-sm font-medium">{t('recruiterRole')}</div>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                />
              </div>

              {mode === 'signin' && (
                <div className="text-right -mt-1">
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    {t('confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-white/50">
              {mode === 'signin' ? (
                <>
                  {t('noAccount')}{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {t('signUpTitle')}
                  </button>
                </>
              ) : (
                <>
                  {t('hasAccount')}{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {t('signInTitle')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
