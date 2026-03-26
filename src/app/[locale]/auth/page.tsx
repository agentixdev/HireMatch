'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const m = searchParams.get('mode') as Mode;
    const r = searchParams.get('role') as Role;
    if (m) setMode(m);
    if (r) setRole(r);
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

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role, full_name: fullName },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          // Create profile record
          await supabase.from('profiles').insert({
            user_id: data.user.id,
            role,
          });

          // Create role-specific record
          if (role === 'candidate') {
            await supabase.from('candidates').insert({
              user_id: data.user.id,
              full_name: fullName,
              email,
              country: 'us', // default, will be updated in onboarding
            });
            router.push('/dashboard/candidate/onboarding');
          } else {
            await supabase.from('recruiters').insert({
              user_id: data.user.id,
              company_name: '',
              country: 'us',
            });
            router.push('/dashboard/recruiter/onboarding');
          }
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
      <main className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">
              {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('selectRole')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('candidate')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          role === 'candidate'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">🏢</div>
                        <div className="text-sm font-medium">{t('recruiterRole')}</div>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {mode === 'signin' ? (
                <>
                  {t('noAccount')}{' '}
                  <button
                    onClick={() => setMode('signup')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('signUpTitle')}
                  </button>
                </>
              ) : (
                <>
                  {t('hasAccount')}{' '}
                  <button
                    onClick={() => setMode('signin')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
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
